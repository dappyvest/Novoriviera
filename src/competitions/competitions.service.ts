import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompetitionStatus,
  ContestantStatus,
  Prisma,
  UserRole,
  WinnerPlacement,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';

const publicContestantBlockedStatuses = [
  ContestantStatus.REJECTED,
  ContestantStatus.ELIMINATED,
];

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompetitionDto, ownerId?: string) {
    try {
      return await this.prisma.competition.create({
        data: this.mapCreateCompetitionData(dto, ownerId),
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Competition slug already exists');
      }
      throw error;
    }
  }

  findAll(role?: UserRole) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

    return this.prisma.competition.findMany({
      where: isAdmin
        ? undefined
        : {
            status: {
              in: [CompetitionStatus.PUBLISHED, CompetitionStatus.ACTIVE],
            },
          },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, role?: UserRole) {
    const competition = await this.prisma.competition.findFirst({
      where: {
        id,
        ...(role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN
          ? {}
          : {
              status: {
                in: [CompetitionStatus.PUBLISHED, CompetitionStatus.ACTIVE],
              },
            }),
      },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    return competition;
  }

  async update(id: string, dto: UpdateCompetitionDto) {
    await this.ensureExists(id);
    try {
      return await this.prisma.competition.update({
        where: { id },
        data: this.mapCompetitionData(dto),
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Competition slug already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.competition.delete({ where: { id } });
  }

  async leaderboard(
    competitionId: string,
    featuredFirst = false,
    mode: 'votes' | 'engagement' | 'combined' = 'votes',
    engagementWeight = 50,
    tokenWeight = 50,
  ) {
    await this.findOne(competitionId);
    const contestants = await this.prisma.contestant.findMany({
      where: {
        competitionId,
        status: { notIn: publicContestantBlockedStatuses },
      },
      include: {
        submissions: {
          where: { status: 'APPROVED' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    const maxVotes = Math.max(
      ...contestants.map((contestant) => contestant.totalVotes),
      0,
    );
    const maxEngagement = Math.max(
      ...contestants.map((contestant) => contestant.totalOnlineEngagement),
      0,
    );

    const scored = contestants.map((contestant) => {
      const engagementScore =
        maxEngagement > 0
          ? (contestant.totalOnlineEngagement / maxEngagement) *
            engagementWeight
          : 0;
      const tokenScore =
        maxVotes > 0 ? (contestant.totalVotes / maxVotes) * tokenWeight : 0;

      return {
        contestant,
        engagementScore,
        tokenScore,
        combinedScore: engagementScore + tokenScore,
      };
    });

    const ranked = scored.sort((a, b) => {
      if (featuredFirst && a.contestant.isPremium !== b.contestant.isPremium) {
        return Number(b.contestant.isPremium) - Number(a.contestant.isPremium);
      }

      const aScore =
        mode === 'engagement'
          ? a.contestant.totalOnlineEngagement
          : mode === 'combined'
            ? a.combinedScore
            : a.contestant.totalVotes;
      const bScore =
        mode === 'engagement'
          ? b.contestant.totalOnlineEngagement
          : mode === 'combined'
            ? b.combinedScore
            : b.contestant.totalVotes;

      return (
        bScore - aScore ||
        a.contestant.createdAt.getTime() - b.contestant.createdAt.getTime()
      );
    });

    const entrantCount = ranked.length;

    return ranked.map(
      ({ contestant, engagementScore, tokenScore, combinedScore }, index) => ({
        rank: index + 1,
        entrantCount,
        contestantId: contestant.id,
        displayName: contestant.displayName,
        photoUrl: contestant.photoUrl,
        status: contestant.status,
        isPremium: contestant.isPremium,
        totalVotes: contestant.totalVotes,
        totalOnlineEngagement: contestant.totalOnlineEngagement,
        engagementScore: Number(engagementScore.toFixed(2)),
        tokenScore: Number(tokenScore.toFixed(2)),
        combinedScore: Number(combinedScore.toFixed(2)),
        latestYoutubeUrl: contestant.submissions?.[0]?.youtubeUrl ?? null,
        latestThumbnailUrl: contestant.submissions?.[0]?.thumbnailUrl ?? null,
      }),
    );
  }

  async declareWinners(
    competitionId: string,
    actorRole: UserRole,
    force = false,
  ) {
    const competition = await this.ensureExists(competitionId);
    const existingWinners = await this.prisma.competitionWinner.findMany({
      where: { competitionId },
    });

    if (
      existingWinners.length > 0 &&
      actorRole !== UserRole.SUPER_ADMIN &&
      !force
    ) {
      throw new ForbiddenException(
        'Winners already declared. Use force or SUPER_ADMIN to rerun.',
      );
    }

    const leaderboard = await this.leaderboard(
      competitionId,
      false,
      'combined',
      50,
      50,
    );
    const topThree = leaderboard.slice(0, 3);
    const placements = [
      WinnerPlacement.FIRST,
      WinnerPlacement.SECOND,
      WinnerPlacement.THIRD,
    ];
    const prizeAmounts = [
      competition.prizeFirst,
      competition.prizeSecond,
      competition.prizeThird,
    ];

    if (topThree.length === 0) {
      throw new BadRequestException(
        'No eligible contestants to declare winners',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.competitionWinner.deleteMany({ where: { competitionId } });

      const winners: Awaited<ReturnType<typeof tx.competitionWinner.create>>[] =
        [];
      for (const [index, entry] of topThree.entries()) {
        winners.push(
          await tx.competitionWinner.create({
            data: {
              competitionId,
              contestantId: entry.contestantId,
              placement: placements[index],
              prizeAmount: prizeAmounts[index],
              totalVotes: entry.totalVotes,
              totalOnlineEngagement: entry.totalOnlineEngagement,
              engagementScore: entry.engagementScore,
              tokenScore: entry.tokenScore,
              combinedScore: entry.combinedScore,
            },
            include: { contestant: true, competition: true },
          }),
        );
      }

      return winners;
    });
  }

  async findWinners(competitionId: string) {
    await this.ensureExists(competitionId);
    return this.prisma.competitionWinner.findMany({
      where: { competitionId },
      include: {
        contestant: true,
        competition: true,
      },
      orderBy: { placement: 'asc' },
    });
  }

  private async ensureExists(id: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    return competition;
  }

  private mapCompetitionData(dto: CreateCompetitionDto | UpdateCompetitionDto) {
    return {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    };
  }

  private mapCreateCompetitionData(
    dto: CreateCompetitionDto,
    ownerId?: string,
  ): Prisma.CompetitionUncheckedCreateInput {
    return {
      title: dto.title,
      slug: dto.slug,
      description: dto.description,
      bannerUrl: dto.bannerUrl,
      status: dto.status,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      prizeFirst: dto.prizeFirst,
      prizeSecond: dto.prizeSecond,
      prizeThird: dto.prizeThird,
      rules: dto.rules,
      ownerId,
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
