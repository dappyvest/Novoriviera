import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CoinTransactionType,
  Payment,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InitCoinPurchaseDto } from './dto/init-coin-purchase.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async initCoinPurchase(userId: string, email: string, dto: InitCoinPurchaseDto) {
    const coinPackage = await this.prisma.coinPackage.findUnique({
      where: { id: dto.coinPackageId },
    });

    if (!coinPackage || !coinPackage.isActive) {
      throw new NotFoundException('Coin package not found');
    }

    const totalCoins = coinPackage.coins + coinPackage.bonusCoins;
    const reference = `NR-${Date.now()}-${randomUUID()}`;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        coinPackageId: coinPackage.id,
        provider: PaymentProvider.PAYSTACK,
        reference,
        amountNaira: coinPackage.priceNaira,
        coins: coinPackage.coins,
        bonusCoins: coinPackage.bonusCoins,
        totalCoins,
        status: PaymentStatus.PENDING,
      },
    });

    const paystackResponse = await this.initializePaystackTransaction({
      email,
      amountKobo: coinPackage.priceNaira * 100,
      reference,
      callbackUrl: this.configService.get<string>('APP_FRONTEND_URL'),
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerResponse: paystackResponse as Prisma.InputJsonValue },
    });

    return {
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
      reference,
      amountNaira: coinPackage.priceNaira,
      totalCoins,
    };
  }

  async verifyForUser(userId: string, reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('Cannot verify another user payment');
    }

    const paystackResponse = await this.verifyPaystackTransaction(reference);
    const status = paystackResponse.data.status;

    const processedPayment =
      status === 'success'
        ? await this.processSuccessfulPayment(reference, paystackResponse)
        : await this.markPaymentFailed(reference, paystackResponse);

    const wallet = await this.prisma.coinWallet.findUnique({
      where: { userId },
    });

    return {
      payment: processedPayment,
      walletBalance: wallet?.balance ?? 0,
    };
  }

  findMine(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.payment.findMany({
      include: { user: true, coinPackage: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  verifyPaystackSignature(
    rawBody: Buffer | undefined,
    signature?: string,
    parsedBody?: unknown,
  ) {
    if ((!rawBody && !parsedBody) || !signature) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }

    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!secret) {
      throw new UnauthorizedException('Paystack secret key is not configured');
    }

    const signatureBuffer = Buffer.from(signature);
    const payloads = [
      rawBody,
      parsedBody ? Buffer.from(JSON.stringify(parsedBody)) : undefined,
    ].filter((payload): payload is Buffer => Boolean(payload));

    const isValid = payloads.some((payload) => {
      const expected = createHmac('sha512', secret).update(payload).digest('hex');
      const expectedBuffer = Buffer.from(expected);
      return (
        expectedBuffer.length === signatureBuffer.length &&
        timingSafeEqual(expectedBuffer, signatureBuffer)
      );
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }
  }

  async handlePaystackWebhook(event: {
    event?: string;
    data?: { reference?: string; status?: string };
  }) {
    if (event.event !== 'charge.success' || !event.data?.reference) {
      return { received: true, ignored: true };
    }

    const payment = await this.processSuccessfulPayment(
      event.data.reference,
      event as Prisma.InputJsonValue,
    );

    return { received: true, payment };
  }

  private async processSuccessfulPayment(
    reference: string,
    providerResponse: Prisma.InputJsonValue,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { reference } });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status === PaymentStatus.SUCCESS) {
        return payment;
      }

      const claimed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: { not: PaymentStatus.SUCCESS },
        },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: payment.paidAt ?? new Date(),
          providerResponse,
        },
      });

      if (claimed.count === 0) {
        return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      }

      const wallet =
        (await tx.coinWallet.findUnique({ where: { userId: payment.userId } })) ??
        (await tx.coinWallet.create({
          data: { userId: payment.userId, balance: 0 },
        }));

      await tx.coinWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: payment.totalCoins } },
      });

      await tx.coinTransaction.create({
        data: {
          walletId: wallet.id,
          userId: payment.userId,
          amount: payment.totalCoins,
          type: CoinTransactionType.CREDIT,
          reference: payment.reference,
          description: 'Paystack coin purchase',
          metadata: {
            paymentId: payment.id,
            coinPackageId: payment.coinPackageId,
          },
        },
      });

      return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    });
  }

  private async markPaymentFailed(
    reference: string,
    providerResponse: Prisma.InputJsonValue,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { reference } });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment;
    }

    return this.prisma.payment.update({
      where: { reference },
      data: {
        status: PaymentStatus.FAILED,
        providerResponse,
      },
    });
  }

  private async initializePaystackTransaction(input: {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl?: string;
  }) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: this.paystackHeaders(),
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        reference: input.reference,
        callback_url: input.callbackUrl,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.status) {
      throw new BadRequestException('Unable to initialize Paystack transaction');
    }

    return body as {
      status: boolean;
      data: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };
  }

  private async verifyPaystackTransaction(reference: string) {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: this.paystackHeaders(),
      },
    );

    const body = await response.json();
    if (!response.ok || !body.status) {
      throw new BadRequestException('Unable to verify Paystack transaction');
    }

    return body as {
      status: boolean;
      data: {
        reference: string;
        status: 'success' | 'failed' | string;
      };
    };
  }

  private paystackHeaders() {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new BadRequestException('Paystack secret key is not configured');
    }

    return {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };
  }
}
