import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContestantStatus,
  ManualVotePaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicVoteDto } from './dto/create-public-vote.dto';
import { UpdatePublicVoteStatusDto } from './dto/update-public-vote-status.dto';

const blockedContestantStatuses: ContestantStatus[] = [
  ContestantStatus.REJECTED,
  ContestantStatus.ELIMINATED,
];

@Injectable()
export class PublicVotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePublicVoteDto) {
    const contestant = await this.prisma.contestant.findUnique({
      where: { contestantCode: dto.contestantCode },
      include: { competition: true },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant code not found');
    }

    if (contestant.competitionId !== dto.competitionId) {
      throw new BadRequestException(
        'Contestant does not belong to this competition',
      );
    }

    if (blockedContestantStatuses.includes(contestant.status)) {
      throw new BadRequestException('Contestant is not eligible for votes');
    }

    if (!contestant.competition.manualVotingEnabled) {
      throw new BadRequestException('Manual voting is not enabled');
    }

    if (dto.amountPaid < contestant.competition.votePriceNaira) {
      throw new BadRequestException(
        `Amount paid must be at least ${contestant.competition.votePriceNaira}`,
      );
    }

    const votesCalculated = Math.floor(
      dto.amountPaid / contestant.competition.votePriceNaira,
    );

    return this.prisma.manualVotePayment.create({
      data: {
        contestantId: contestant.id,
        competitionId: contestant.competitionId,
        contestantCode: contestant.contestantCode,
        voterName: dto.voterName,
        voterPhone: dto.voterPhone,
        voterEmail: dto.voterEmail,
        amountPaid: dto.amountPaid,
        votePriceNaira: contestant.competition.votePriceNaira,
        votesCalculated,
        transferReference: dto.transferReference,
        paymentNarration: dto.paymentNarration,
        proofImageUrl: dto.proofImageUrl,
        note: dto.note,
        status: ManualVotePaymentStatus.PENDING,
      },
      include: { contestant: true, competition: true },
    });
  }

  findAdmin(filters: {
    status?: ManualVotePaymentStatus;
    competitionId?: string;
    contestantCode?: string;
  }) {
    return this.prisma.manualVotePayment.findMany({
      where: {
        status: filters.status,
        competitionId: filters.competitionId,
        contestantCode: filters.contestantCode,
      },
      include: {
        contestant: true,
        competition: true,
        verifiedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.manualVotePayment.findUnique({
      where: { id },
      include: {
        contestant: true,
        competition: true,
        verifiedBy: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Public vote payment not found');
    }

    return payment;
  }

  async updateStatus(
    id: string,
    dto: UpdatePublicVoteStatusDto,
    actorId: string,
  ) {
    if (dto.status === ManualVotePaymentStatus.PENDING) {
      throw new BadRequestException('Status must be APPROVED or REJECTED');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.manualVotePayment.findUnique({
        where: { id },
        include: { contestant: true },
      });

      if (!payment) {
        throw new NotFoundException('Public vote payment not found');
      }

      const wasApproved =
        payment.status === ManualVotePaymentStatus.APPROVED;
      const willBeApproved = dto.status === ManualVotePaymentStatus.APPROVED;

      if (!wasApproved && willBeApproved) {
        await tx.contestant.update({
          where: { id: payment.contestantId },
          data: { totalVotes: { increment: payment.votesCalculated } },
        });
      }

      if (wasApproved && !willBeApproved) {
        await tx.contestant.update({
          where: { id: payment.contestantId },
          data: {
            totalVotes: Math.max(
              0,
              payment.contestant.totalVotes - payment.votesCalculated,
            ),
          },
        });
      }

      const updated = await tx.manualVotePayment.update({
        where: { id },
        data: {
          status: dto.status,
          adminNote: dto.adminNote,
          verifiedById: actorId,
          verifiedAt: new Date(),
        },
        include: {
          contestant: true,
          competition: true,
          verifiedBy: true,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'PUBLIC_VOTE_STATUS_UPDATE',
          entity: 'ManualVotePayment',
          entityId: id,
          metadata: {
            status: dto.status,
            previousStatus: payment.status,
            adminNote: dto.adminNote,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }
}
