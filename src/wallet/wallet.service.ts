import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CoinTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string) {
    const wallet = await this.ensureWallet(userId);
    const transactions = await this.prisma.coinTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });

    return this.toWalletSummary(wallet, transactions);
  }

  async findMyTransactions(userId: string) {
    const wallet = await this.ensureWallet(userId);
    return this.prisma.coinTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllWallets() {
    return this.prisma.coinWallet.findMany({
      include: { user: true, transactions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    const wallet = await this.ensureWallet(userId);
    const transactions = await this.prisma.coinTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });

    return this.toWalletSummary(wallet, transactions);
  }

  async adjustWallet(
    userId: string,
    amount: number,
    reason: string,
    actorId: string,
  ) {
    if (amount === 0) {
      throw new BadRequestException('Adjustment amount cannot be zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const wallet = await this.ensureWallet(userId, tx);
      const nextBalance = wallet.balance + amount;
      if (nextBalance < 0) {
        throw new BadRequestException('Wallet balance cannot be negative');
      }

      const updatedWallet = await tx.coinWallet.update({
        where: { id: wallet.id },
        data: { balance: nextBalance },
      });

      const transaction = await tx.coinTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          amount,
          type: CoinTransactionType.ADJUSTMENT,
          description: reason,
          metadata: { actorId },
        },
      });

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'WALLET_ADJUSTMENT',
          entity: 'CoinWallet',
          entityId: wallet.id,
          metadata: { userId, amount, reason },
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  async ensureWallet(userId: string, tx: Prisma.TransactionClient = this.prisma) {
    const existingWallet = await tx.coinWallet.findUnique({
      where: { userId },
    });

    if (existingWallet) {
      return existingWallet;
    }

    return tx.coinWallet.create({
      data: {
        userId,
        balance: 0,
      },
    });
  }

  private toWalletSummary(
    wallet: { id: string; balance: number; userId: string; createdAt: Date; updatedAt: Date },
    transactions: { amount: number }[],
  ) {
    return {
      ...wallet,
      totalPurchased: transactions
        .filter((transaction) => transaction.amount > 0)
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      totalSpent: Math.abs(
        transactions
          .filter((transaction) => transaction.amount < 0)
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      ),
      transactions,
    };
  }
}
