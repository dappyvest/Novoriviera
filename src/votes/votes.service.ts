import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CoinTransactionType, ContestantStatus, StageStatus, VoteSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CastVoteDto } from './dto/cast-vote.dto';

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  async cast(userId: string, dto: CastVoteDto) {
    return this.prisma.$transaction(async (tx) => {
      const contestant = await tx.contestant.findUnique({
        where: { id: dto.contestantId },
      });

      if (!contestant) {
        throw new NotFoundException('Contestant not found');
      }

      if (
        contestant.status === ContestantStatus.REJECTED ||
        contestant.status === ContestantStatus.ELIMINATED
      ) {
        throw new BadRequestException('Cannot vote for this contestant');
      }

      const stage = await tx.stage.findUnique({ where: { id: dto.stageId } });
      if (!stage) {
        throw new NotFoundException('Stage not found');
      }

      if (stage.status !== StageStatus.ACTIVE) {
        throw new BadRequestException('Stage is not active');
      }

      if (stage.competitionId !== contestant.competitionId) {
        throw new BadRequestException('Contestant is not in this stage competition');
      }

      const now = new Date();
      if (
        (stage.votingStartDate && now < stage.votingStartDate) ||
        (stage.votingEndDate && now > stage.votingEndDate)
      ) {
        throw new BadRequestException('Stage is outside the voting window');
      }

      const wallet = await tx.coinWallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < dto.coinsToSpend) {
        throw new BadRequestException('Insufficient coin balance');
      }

      const updatedWallet = await tx.coinWallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance - dto.coinsToSpend },
      });

      const coinTransaction = await tx.coinTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          amount: -dto.coinsToSpend,
          type: CoinTransactionType.DEBIT,
          description: `Vote for contestant ${contestant.displayName}`,
          metadata: {
            contestantId: contestant.id,
            stageId: stage.id,
          },
        },
      });

      const vote = await tx.vote.create({
        data: {
          userId,
          contestantId: contestant.id,
          stageId: stage.id,
          competitionId: contestant.competitionId,
          source: VoteSource.COIN,
          quantity: dto.coinsToSpend,
        },
      });

      const updatedContestant = await tx.contestant.update({
        where: { id: contestant.id },
        data: { totalVotes: { increment: dto.coinsToSpend } },
      });

      return { vote, wallet: updatedWallet, coinTransaction, contestant: updatedContestant };
    });
  }

  findAll() {
    return this.prisma.vote.findMany({
      include: { user: true, contestant: true, stage: true, competition: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async contestantStats(contestantId: string) {
    const contestant = await this.prisma.contestant.findUnique({
      where: { id: contestantId },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }

    const votes = await this.prisma.vote.findMany({
      where: { contestantId },
    });

    return this.toStats(votes, contestant.totalVotes);
  }

  async stageSummary(stageId: string) {
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    const votes = await this.prisma.vote.findMany({ where: { stageId } });
    return this.toStats(votes);
  }

  private toStats(
    votes: { quantity: number; source: VoteSource; userId: string | null }[],
    totalVotesOverride?: number,
  ) {
    const totalCoinVotes = votes
      .filter((vote) => vote.source === VoteSource.COIN)
      .reduce((sum, vote) => sum + vote.quantity, 0);

    return {
      totalVotes:
        totalVotesOverride ??
        votes.reduce((sum, vote) => sum + vote.quantity, 0),
      totalCoinVotes,
      votersCount: new Set(votes.map((vote) => vote.userId).filter(Boolean)).size,
    };
  }
}
