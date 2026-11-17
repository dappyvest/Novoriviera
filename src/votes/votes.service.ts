import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, VoteSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.vote.findMany({
      include: { user: true, contestant: true, stage: true, competition: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async contestantStats(contestantId: string) {
    const contestant = await this.prisma.contestant.findUnique({ where: { id: contestantId } });
    if (!contestant) throw new NotFoundException('Contestant not found');
    const votes = await this.prisma.vote.findMany({ where: { contestantId } });
    return this.toStats(votes, contestant.totalVotes);
  }

  async stageSummary(stageId: string) {
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
    const votes = await this.prisma.vote.findMany({ where: { stageId } });
    return this.toStats(votes);
  }

  private toStats(votes: { quantity: number; source: VoteSource; userId: string | null }[], totalVotesOverride?: number) {
    const paidVotes = votes.filter((vote) => vote.source === VoteSource.PAYSTACK)
      .reduce((sum, vote) => sum + vote.quantity, 0);
    const otherVotes = votes.filter((vote) => vote.source !== VoteSource.PAYSTACK)
      .reduce((sum, vote) => sum + vote.quantity, 0);
    return {
      totalVotes: totalVotesOverride ?? votes.reduce((sum, vote) => sum + vote.quantity, 0),
      paidVotes,
      otherVotes,
      votersCount: new Set(votes.map((vote) => vote.userId).filter(Boolean)).size,
    };
  }


async adminManualTopUp(
  contestantId: string,
  quantity: number,
  reason: string,
  actorId: string,
) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
    throw new BadRequestException('Quantity must be between 1 and 10,000.');
  }

  const cleanReason = reason?.trim();

  if (!cleanReason || cleanReason.length < 5 || cleanReason.length > 500) {
    throw new BadRequestException(
      'A reason between 5 and 500 characters is required.',
    );
  }

  return this.prisma.$transaction(async (tx) => {
    const contestant = await tx.contestant.findUnique({
      where: { id: contestantId },
      select: {
        id: true,
        displayName: true,
        competitionId: true,
      },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant not found.');
    }

    const vote = await tx.vote.create({
      data: {
        source: VoteSource.ADMIN_MANUAL,
        quantity,
        contestantId: contestant.id,
        competitionId: contestant.competitionId,
        userId: null,
        stageId: null,
      },
    });

    const updatedContestant = await tx.contestant.update({
      where: { id: contestant.id },
      data: {
        totalVotes: { increment: quantity },
      },
      select: {
        id: true,
        displayName: true,
        totalVotes: true,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: 'CONTESTANT_MANUAL_VOTE_TOP_UP',
        entity: 'Contestant',
        entityId: contestant.id,
        metadata: {
          quantity,
          reason: cleanReason,
          voteId: vote.id,
          contestantName: contestant.displayName,
          competitionId: contestant.competitionId,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return {
      message: 'Manual votes added successfully.',
      contestant: updatedContestant,
      vote,
    };
  });
}

}
