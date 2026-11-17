import { getVotingWindowStatus } from '../competitions/voting-window.util';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ContestantStatus,
  PaymentStatus,
  Prisma,
  StageStatus,
  VoteSource,
} from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InitializePaidVoteDto } from './dto/initialize-paid-vote.dto';

const VOTE_PRICE_NAIRA = 100;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async initializePaidVote(dto: InitializePaidVoteDto) {
    this.assertPaymentsEnabled();
    if (!Number.isSafeInteger(dto.quantity) || dto.quantity < 1 || dto.quantity > 10000) {
      throw new BadRequestException('Vote quantity must be between 1 and 10,000');
    }

    const contestant = await this.prisma.contestant.findUnique({
      where: { id: dto.contestantId },
      include: { competition: true },
    });
    if (!contestant) throw new NotFoundException('Contestant not found');
    if (contestant.status === ContestantStatus.REJECTED || contestant.status === ContestantStatus.ELIMINATED) {
      throw new BadRequestException('Voting is not available for this contestant');
    }

    const competition = contestant.competition;
    const now = new Date();

    if (
      !competition.votingEnabled ||
      (competition.votingStartsAt && now < competition.votingStartsAt) ||
      (competition.votingEndsAt && now > competition.votingEndsAt)
    ) {
      throw new BadRequestException('Voting is currently closed');
    }



    const amountNaira = dto.quantity * VOTE_PRICE_NAIRA;
    const amountKobo = amountNaira * 100;
    const reference = `NRV-${Date.now()}-${randomUUID()}`;

    const payment = await this.prisma.paidVotePayment.create({
      data: {
        reference,
        amountNaira,
        amountKobo,
        voteQuantity: dto.quantity,
        voterEmail: dto.email?.toLowerCase(),
        competitionId: competition.id,
        contestantId: contestant.id,
      },
    });

    try {
      const response = await this.initializePaystackTransaction({
        email: dto.email?.toLowerCase() || `voter-${reference}@payments.novorivera.com`,
        amountKobo,
        reference,
        callbackUrl: this.configService.get<string>('PAYSTACK_CALLBACK_URL'),
      });
      await this.prisma.paidVotePayment.update({
        where: { id: payment.id },
        data: { providerResponse: response as Prisma.InputJsonValue },
      });
      return {
        authorizationUrl: response.data.authorization_url,
        accessCode: response.data.access_code,
        reference,
        amountNaira,
        quantity: dto.quantity,
        pricePerVote: VOTE_PRICE_NAIRA,
      };
    } catch (error) {
      await this.prisma.paidVotePayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw error;
    }
  }

  async verifyPaidVote(reference: string) {
    this.assertPaymentsEnabled();
    const payment = await this.prisma.paidVotePayment.findUnique({ where: { reference } });
    if (!payment) throw new NotFoundException('Payment reference not found');
    if (payment.status === PaymentStatus.SUCCESS) return { success: true, credited: true, payment };

    const result = await this.verifyPaystackTransaction(reference);
    const data = result.data;
    if (data.reference !== reference) throw new BadRequestException('Paystack reference mismatch');
    if (data.status !== 'success') {
      if (data.status === 'failed' || data.status === 'abandoned') {
        await this.prisma.paidVotePayment.updateMany({
          where: { reference, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED, providerResponse: result as Prisma.InputJsonValue },
        });
      }
      return { success: false, credited: false, status: data.status };
    }

    this.validateSuccessfulTransaction(data, payment.amountKobo, reference);
    const creditedPayment = await this.creditPaidVote(reference, result as Prisma.InputJsonValue);
    return { success: true, credited: true, payment: creditedPayment };
  }

  verifyPaystackSignature(rawBody: Buffer | undefined, signature?: string, parsedBody?: unknown) {
    if (!signature || (!rawBody && !parsedBody)) throw new UnauthorizedException('Invalid Paystack signature');
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secret) throw new UnauthorizedException('Paystack secret key is not configured');
    const supplied = Buffer.from(signature, 'utf8');
    const payloads = [rawBody, parsedBody ? Buffer.from(JSON.stringify(parsedBody)) : undefined]
      .filter((value): value is Buffer => Boolean(value));
    const valid = payloads.some((payload) => {
      const expected = Buffer.from(createHmac('sha512', secret).update(payload).digest('hex'));
      return expected.length === supplied.length && timingSafeEqual(expected, supplied);
    });
    if (!valid) throw new UnauthorizedException('Invalid Paystack signature');
  }

  async handlePaystackWebhook(event: { event?: string; data?: { reference?: string } }) {
    if (event.event !== 'charge.success' || !event.data?.reference) return { received: true, ignored: true };
    // Never trust webhook fields as proof of payment: verify with Paystack's API.
    return { received: true, result: await this.verifyPaidVote(event.data.reference) };
  }

  private async creditPaidVote(reference: string, providerResponse: Prisma.InputJsonValue) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paidVotePayment.findUnique({ where: { reference } });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status === PaymentStatus.SUCCESS && payment.creditedAt) return payment;

      const claim = await tx.paidVotePayment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING, creditedAt: null },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          creditedAt: new Date(),
          providerResponse,
        },
      });
      if (claim.count !== 1) {
        return tx.paidVotePayment.findUniqueOrThrow({ where: { id: payment.id } });
      }

      await tx.vote.create({
        data: {
          source: VoteSource.PAYSTACK,
          quantity: payment.voteQuantity,
          competitionId: payment.competitionId,
          contestantId: payment.contestantId,
          paidVotePaymentId: payment.id,
        },
      });
      await tx.contestant.update({
        where: { id: payment.contestantId },
        data: { totalVotes: { increment: payment.voteQuantity } },
      });
      return tx.paidVotePayment.findUniqueOrThrow({ where: { id: payment.id } });
    });
  }

  private validateSuccessfulTransaction(
    data: {
      reference: string;
      amount: number;
      requested_amount: number;
      fees: number;
      currency: string;
      status: string;
    },
    expectedAmountKobo: number,
    reference: string,
  ) {
    const validAmounts =
      Number.isSafeInteger(data.amount) &&
      Number.isSafeInteger(data.requested_amount) &&
      Number.isSafeInteger(data.fees) &&
      data.fees >= 0 &&
      data.requested_amount === expectedAmountKobo &&
      data.amount === data.requested_amount + data.fees;
  
    if (
      data.reference !== reference ||
      data.currency !== 'NGN' ||
      data.status !== 'success' ||
      !validAmounts
    ) {
      throw new BadRequestException(
        'Paystack transaction details do not match this vote payment',
      );
    }
  }

  private async initializePaystackTransaction(input: { email: string; amountKobo: number; reference: string; callbackUrl?: string }) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: this.paystackHeaders(),
      body: JSON.stringify({ email: input.email, amount: input.amountKobo, reference: input.reference, callback_url: input.callbackUrl }),
    });
    const body = await response.json();
    if (!response.ok || !body.status) throw new BadRequestException('Unable to initialize Paystack transaction');
    return body as { status: boolean; data: { authorization_url: string; access_code: string; reference: string } };
  }

  private async verifyPaystackTransaction(reference: string) {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET', headers: this.paystackHeaders(),
    });
    const body = await response.json();
    if (!response.ok || !body.status) throw new BadRequestException('Unable to verify Paystack transaction');
    return body as {
      status: boolean;
      data: {
        reference: string;
        status: string;
        amount: number;
        requested_amount: number;
        fees: number;
        currency: string;
      };
    };
  }

  private paystackHeaders() {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) throw new BadRequestException('Paystack secret key is not configured');
    return { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' };
  }

  private assertPaymentsEnabled() {
    if (this.configService.get<string>('PAYSTACK_VOTING_ENABLED', 'false').toLowerCase() !== 'true') {
      throw new BadRequestException('Paid voting is temporarily unavailable');
    }
  }
}
