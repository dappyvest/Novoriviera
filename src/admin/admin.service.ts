import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  createAuditLog(input: {
    actorId: string;
    action: string;
    entity?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.adminAuditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  }

  async findUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toSafeUser(user));
  }

  async findUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user);
  }

  async updateUserStatus(id: string, isActive: boolean) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { isActive },
      });

      return this.toSafeUser(user);
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  async resetUserPassword(
    userId: string,
    newPassword: string,
    actorId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'USER_PASSWORD_RESET',
          entity: 'User',
          entityId: userId,
        },
      });
    });

    return { message: 'Password reset successfully.' };
  }

  async findAuditLogs(input: { page?: number; limit?: number; action?: string }) {
    const page = Math.max(input.page ?? 1, 1);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const where = input.action ? { action: input.action } : undefined;
    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { actor: true },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportContestantsCsv() {
    const contestants = await this.prisma.contestant.findMany({
      include: {
        user: { select: { email: true, phone: true } },
        competition: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.toCsv(
      [
        'id',
        'displayName',
        'guardianPhone',
        'userPhone',
        'userEmail',
        'competitionTitle',
        'status',
        'isPremium',
        'totalVotes',
        'totalOnlineEngagement',
        'createdAt',
      ],
      contestants.map((contestant) => [
        contestant.id,
        contestant.displayName,
        contestant.guardianPhone ?? '',
        contestant.user?.phone ?? '',
        contestant.user?.email ?? '',
        contestant.competition.title,
        contestant.status,
        contestant.isPremium,
        contestant.totalVotes,
        contestant.totalOnlineEngagement,
        contestant.createdAt,
      ]),
    );
  }

  async exportPaymentsCsv() {
    const payments = await this.prisma.payment.findMany({
      include: { user: true, coinPackage: true },
      orderBy: { createdAt: 'desc' },
    });

    return this.toCsv(
      [
        'id',
        'reference',
        'userEmail',
        'coinPackage',
        'amountNaira',
        'totalCoins',
        'status',
        'paidAt',
        'createdAt',
      ],
      payments.map((payment) => [
        payment.id,
        payment.reference,
        payment.user.email,
        payment.coinPackage.name,
        payment.amountNaira,
        payment.totalCoins,
        payment.status,
        payment.paidAt ?? '',
        payment.createdAt,
      ]),
    );
  }

  async exportVotesCsv() {
    const votes = await this.prisma.vote.findMany({
      include: { user: true, contestant: true, stage: true, competition: true },
      orderBy: { createdAt: 'desc' },
    });

    return this.toCsv(
      [
        'id',
        'userEmail',
        'contestantName',
        'competitionTitle',
        'stageTitle',
        'source',
        'quantity',
        'createdAt',
      ],
      votes.map((vote) => [
        vote.id,
        vote.user?.email ?? '',
        vote.contestant.displayName,
        vote.competition.title,
        vote.stage?.title ?? '',
        vote.source,
        vote.quantity,
        vote.createdAt,
      ]),
    );
  }

  private toCsv(headers: string[], rows: unknown[][]) {
    return [
      headers.join(','),
      ...rows.map((row) => row.map((value) => this.csvCell(value)).join(',')),
    ].join('\n');
  }

  private csvCell(value: unknown) {
    const text = value instanceof Date ? value.toISOString() : String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  private toSafeUser(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
