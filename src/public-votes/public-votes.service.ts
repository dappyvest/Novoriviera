import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContestantStatus, ManualVotePaymentEventType, ManualVotePaymentStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { getVotingWindowStatus } from '../competitions/voting-window.util';
import { CreateManualVoteIntentDto, SubmitManualVotePaymentDto } from './dto/manual-vote-intent.dto';
import { UpdatePublicVoteStatusDto } from './dto/update-public-vote-status.dto';

const blockedStatuses: ContestantStatus[] = [ContestantStatus.REJECTED, ContestantStatus.ELIMINATED];

@Injectable()
export class PublicVotesService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async createIntent(dto: CreateManualVoteIntentDto) {
    if (this.config.get<string>('MANUAL_BANK_TRANSFER_VOTING_ENABLED', 'true').toLowerCase() !== 'true') throw new BadRequestException('Manual bank-transfer voting is currently unavailable');
    if (!dto.contestantCode && !dto.contestantId) throw new BadRequestException('Contestant code or ID is required');
    const contestant = await this.prisma.contestant.findFirst({ where: dto.contestantCode ? { contestantCode: dto.contestantCode } : { id: dto.contestantId }, include: { competition: true } });
    if (!contestant) throw new NotFoundException('Contestant not found');
    if (blockedStatuses.includes(contestant.status)) throw new BadRequestException('Contestant is not eligible for votes');
    const competition = contestant.competition;
    if (!competition.manualVotingEnabled) throw new BadRequestException('Manual voting is not enabled');
    const voting = getVotingWindowStatus(competition);
    if (!voting.votingOpen) throw new BadRequestException(voting.votingStatusMessage);
    const expectedAmountNaira = competition.votePriceNaira * dto.voteQuantity;
    const bankName = competition.paymentBankName || this.config.get<string>('VOTING_BANK_NAME', 'Access Bank');
    const accountName = competition.paymentAccountName || this.config.get<string>('VOTING_BANK_ACCOUNT_NAME', 'Novo Riviera Enterprise');
    const accountNumber = competition.paymentAccountNumber || this.config.get<string>('VOTING_BANK_ACCOUNT_NUMBER', '1824826876');
    const instructions = competition.paymentInstructions || this.config.get<string>('VOTING_PAYMENT_INSTRUCTIONS', 'Transfer the exact amount and use the payment reference as the narration.');
    for (let attempt = 0; attempt < 5; attempt++) {
      const paymentReference = `NRV-${randomBytes(5).toString('hex').toUpperCase()}`;
      try {
        const payment = await this.prisma.manualVotePayment.create({ data: { paymentReference, contestantId: contestant.id, competitionId: competition.id, contestantCode: contestant.contestantCode, voterName: '', voterPhone: '', amountPaid: expectedAmountNaira, votePriceNaira: competition.votePriceNaira, votesCalculated: dto.voteQuantity, voteQuantity: dto.voteQuantity, expectedAmountNaira, paymentNarration: paymentReference, bankNameSnapshot: bankName, bankAccountNameSnapshot: accountName, bankAccountNumberSnapshot: accountNumber, paymentInstructionsSnapshot: instructions, status: ManualVotePaymentStatus.INTENT_CREATED, events: { create: { type: ManualVotePaymentEventType.INTENT_CREATED, metadata: { voteQuantity: dto.voteQuantity, expectedAmountNaira } } } } });
        return { paymentReference: payment.paymentReference, contestant: { id: contestant.id, contestantCode: contestant.contestantCode, displayName: contestant.displayName }, voteQuantity: dto.voteQuantity, expectedAmountNaira, bankName, accountName, accountNumber, paymentInstructions: instructions, requiredNarration: paymentReference };
      } catch (error) { if (!(this.isUnique(error) && attempt < 4)) throw error; }
    }
    throw new ConflictException('Unable to generate payment reference');
  }

  async attachProof(paymentReference: string, proof: { secureUrl: string; publicId: string; bytes: number; format?: string }) {
    const payment = await this.prisma.manualVotePayment.findUnique({ where: { paymentReference } });
    if (!payment) throw new NotFoundException('Payment intent not found');
    if (payment.status !== ManualVotePaymentStatus.INTENT_CREATED) throw new BadRequestException('Proof can only be attached to an unsubmitted payment intent');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.manualVotePayment.update({ where: { id: payment.id }, data: { proofImageUrl: proof.secureUrl, proofPublicId: proof.publicId, proofMeta: { bytes: proof.bytes, format: proof.format } } });
      await tx.manualVotePaymentEvent.create({ data: { manualVotePaymentId: payment.id, type: ManualVotePaymentEventType.PROOF_ATTACHED, metadata: { proofPublicId: proof.publicId } } });
      return updated;
    });
  }

  async submit(dto: SubmitManualVotePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.manualVotePayment.findUnique({ where: { paymentReference: dto.paymentReference } });
      if (!payment) throw new NotFoundException('Payment intent not found');
      if (payment.status !== ManualVotePaymentStatus.INTENT_CREATED) throw new BadRequestException('Payment intent has already been submitted or closed');
      if (!payment.proofPublicId || !payment.proofImageUrl) throw new BadRequestException('Upload payment proof for this payment reference before submission');
      const claimed = await tx.manualVotePayment.updateMany({ where: { id: payment.id, status: ManualVotePaymentStatus.INTENT_CREATED }, data: { status: ManualVotePaymentStatus.SUBMITTED, voterName: dto.voterName, voterPhone: dto.voterPhone, voterEmail: dto.voterEmail, transferReference: dto.transferReference, note: dto.note, submittedAt: new Date() } });
      if (claimed.count !== 1) throw new ConflictException('Payment intent was updated concurrently; retry the request');
      await tx.manualVotePaymentEvent.create({ data: { manualVotePaymentId: payment.id, type: ManualVotePaymentEventType.TRANSFER_SUBMITTED, metadata: { transferReference: dto.transferReference } } });
      return tx.manualVotePayment.findUniqueOrThrow({ where: { id: payment.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async confirm(id: string, dto: UpdatePublicVoteStatusDto, actorId: string) {
    if (dto.status === 'REJECTED') return this.reject(id, dto.adminNote, actorId);
    if (dto.status !== 'CONFIRMED') throw new BadRequestException('Status must be CONFIRMED or REJECTED');
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.manualVotePayment.findUnique({ where: { id } });
      if (!payment) throw new NotFoundException('Public vote payment not found');
      if (payment.status === ManualVotePaymentStatus.CONFIRMED) return payment;
      if (payment.status !== ManualVotePaymentStatus.SUBMITTED) throw new BadRequestException('Only submitted payments can be confirmed');
      const claimed = await tx.manualVotePayment.updateMany({ where: { id, status: ManualVotePaymentStatus.SUBMITTED }, data: { status: ManualVotePaymentStatus.CONFIRMED, adminNote: dto.adminNote, verifiedById: actorId, verifiedAt: new Date(), confirmedAt: new Date() } });
      if (claimed.count !== 1) throw new ConflictException('Payment was updated concurrently; retry the request');
      const voteQuantity = payment.voteQuantity ?? payment.votesCalculated;
      await tx.manualVoteCredit.create({ data: { manualVotePaymentId: payment.id, contestantId: payment.contestantId, competitionId: payment.competitionId, confirmedById: actorId, voteQuantity } });
      await tx.contestant.update({ where: { id: payment.contestantId }, data: { totalVotes: { increment: voteQuantity } } });
      await tx.manualVotePaymentEvent.create({ data: { manualVotePaymentId: payment.id, actorId, type: ManualVotePaymentEventType.CONFIRMED, metadata: { voteQuantity } } });
      await tx.adminAuditLog.create({ data: { actorId, action: 'MANUAL_VOTE_PAYMENT_CONFIRMED', entity: 'ManualVotePayment', entityId: payment.id, metadata: { paymentReference: payment.paymentReference, voteQuantity } } });
      return tx.manualVotePayment.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async reject(id: string, adminNote: string | undefined, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.manualVotePayment.findUnique({ where: { id } });
      if (!payment) throw new NotFoundException('Public vote payment not found');
      if (payment.status === ManualVotePaymentStatus.REJECTED) return payment;
      if (payment.status !== ManualVotePaymentStatus.SUBMITTED) throw new BadRequestException('Only submitted payments can be rejected');
      const claimed = await tx.manualVotePayment.updateMany({ where: { id, status: ManualVotePaymentStatus.SUBMITTED }, data: { status: ManualVotePaymentStatus.REJECTED, adminNote, verifiedById: actorId, verifiedAt: new Date(), rejectedAt: new Date() } });
      if (claimed.count !== 1) throw new ConflictException('Payment was updated concurrently; retry the request');
      await tx.manualVotePaymentEvent.create({ data: { manualVotePaymentId: id, actorId, type: ManualVotePaymentEventType.REJECTED, metadata: { adminNote } } });
      await tx.adminAuditLog.create({ data: { actorId, action: 'MANUAL_VOTE_PAYMENT_REJECTED', entity: 'ManualVotePayment', entityId: id, metadata: { paymentReference: payment.paymentReference, adminNote } } });
      return tx.manualVotePayment.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  findAdmin(filters: { status?: ManualVotePaymentStatus; competitionId?: string; contestantCode?: string }) { return this.prisma.manualVotePayment.findMany({ where: { status: filters.status, competitionId: filters.competitionId, contestantCode: filters.contestantCode }, include: { contestant: true, competition: true, verifiedBy: true, credit: true, events: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } }); }
  async findOne(id: string) { const payment = await this.prisma.manualVotePayment.findUnique({ where: { id }, include: { contestant: true, competition: true, verifiedBy: true, credit: true, events: { orderBy: { createdAt: 'asc' } } } }); if (!payment) throw new NotFoundException('Public vote payment not found'); return payment; }
  private isUnique(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'; }
}
