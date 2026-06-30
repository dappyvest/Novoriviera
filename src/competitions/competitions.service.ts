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
  ManualVotePaymentStatus,
  Prisma,
  SubmissionStatus,
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

const publicSubmissionVisibleStatuses = [SubmissionStatus.APPROVED];

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

    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    return isAdmin ? competition : this.toPublicCompetition(competition);
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

  async reset(id: string, actorId: string) {
    await this.ensureExists(id);

    return this.prisma.$transaction(async (tx) => {
      const contestants = await tx.contestant.findMany({
        where: { competitionId: id },
        select: { id: true },
      });
      const contestantIds = contestants.map((contestant) => contestant.id);

      const submissions = await tx.submission.updateMany({
        where: {
          contestant: { competitionId: id },
        },
        data: { status: SubmissionStatus.REJECTED },
      });

      const updatedContestants =
        contestantIds.length > 0
          ? await tx.contestant.updateMany({
              where: { id: { in: contestantIds } },
              data: {
                status: ContestantStatus.REJECTED,
                totalVotes: 0,
                totalOnlineEngagement: 0,
                isPremium: false,
                premiumExpiresAt: null,
              },
            })
          : { count: 0 };

      const winners = await tx.competitionWinner.deleteMany({
        where: { competitionId: id },
      });

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'COMPETITION_RESET',
          entity: 'Competition',
          entityId: id,
          metadata: {
            contestantsArchived: updatedContestants.count,
            submissionsArchived: submissions.count,
            winnersCleared: winners.count,
            manualVotePaymentsPreserved: true,
            paymentRecordsPreserved: true,
          },
        },
      });

      return {
        competitionId: id,
        contestantsArchived: updatedContestants.count,
        submissionsArchived: submissions.count,
        winnersCleared: winners.count,
        manualVotePaymentsPreserved: true,
        paymentRecordsPreserved: true,
      };
    });
  }

  async resetVotes(id: string, actorId: string) {
    await this.ensureExists(id);

    return this.prisma.$transaction(async (tx) => {
      const contestants = await tx.contestant.updateMany({
        where: { competitionId: id },
        data: { totalVotes: 0 },
      });

      const manualVotePayments = await tx.manualVotePayment.updateMany({
        where: { competitionId: id },
        data: {
          status: ManualVotePaymentStatus.REJECTED,
          adminNote:
            'Vote counter reset: payment archived and excluded from totals.',
          verifiedAt: null,
          verifiedById: null,
        },
      });

      const legacyVotes = await tx.vote.deleteMany({
        where: { competitionId: id },
      });

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'COMPETITION_VOTES_RESET',
          entity: 'Competition',
          entityId: id,
          metadata: {
            contestantsReset: contestants.count,
            manualVotePaymentsRejected: manualVotePayments.count,
            legacyVoteRecordsReset: legacyVotes.count,
            usersDeleted: false,
            contestantsDeleted: false,
            submissionsDeleted: false,
          },
        },
      });

      return {
        competitionId: id,
        contestantsReset: contestants.count,
        manualVotePaymentsRejected: manualVotePayments.count,
        legacyVoteRecordsReset: legacyVotes.count,
        usersDeleted: false,
        contestantsDeleted: false,
        submissionsDeleted: false,
      };
    });
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
          where: { status: { in: publicSubmissionVisibleStatuses } },
          orderBy: { createdAt: 'desc' },
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
      ({ contestant, engagementScore, tokenScore, combinedScore }, index) => {
        const latestSubmission = contestant.submissions?.[0] ?? null;

        return {
          rank: index + 1,
          entrantCount,
          contestantId: contestant.id,
          contestantCode: contestant.contestantCode,
          displayName: contestant.displayName,
          photoUrl: contestant.photoUrl,
          status: contestant.status,
          isPremium: contestant.isPremium,
          totalVotes: contestant.totalVotes,
          totalOnlineEngagement: contestant.totalOnlineEngagement,
          engagementScore: Number(engagementScore.toFixed(2)),
          tokenScore: Number(tokenScore.toFixed(2)),
          combinedScore: Number(combinedScore.toFixed(2)),
          videoUrl: latestSubmission?.videoUrl ?? null,
          uploadUrl: latestSubmission?.uploadUrl ?? null,
          cloudinarySecureUrl: latestSubmission?.cloudinarySecureUrl ?? null,
          externalVideoUrl: latestSubmission?.externalVideoUrl ?? null,
          youtubeUrl: latestSubmission?.youtubeUrl ?? null,
          tiktokUrl: latestSubmission?.tiktokUrl ?? null,
          facebookUrl: latestSubmission?.facebookUrl ?? null,
          thumbnailUrl: latestSubmission?.thumbnailUrl ?? null,
          latestVideoUrl: latestSubmission?.videoUrl ?? null,
          latestUploadUrl: latestSubmission?.uploadUrl ?? null,
          latestCloudinarySecureUrl:
            latestSubmission?.cloudinarySecureUrl ?? null,
          latestExternalVideoUrl: latestSubmission?.externalVideoUrl ?? null,
          latestTiktokUrl: latestSubmission?.tiktokUrl ?? null,
          latestFacebookUrl: latestSubmission?.facebookUrl ?? null,
          latestYoutubeUrl: latestSubmission?.youtubeUrl ?? null,
          latestThumbnailUrl: latestSubmission?.thumbnailUrl ?? null,
          latestSubmission: latestSubmission
            ? {
                id: latestSubmission.id,
                title: latestSubmission.title,
                description: latestSubmission.description,
                videoUrl: latestSubmission.videoUrl,
                uploadUrl: latestSubmission.uploadUrl,
                cloudinarySecureUrl: latestSubmission.cloudinarySecureUrl,
                externalVideoUrl: latestSubmission.externalVideoUrl,
                tiktokUrl: latestSubmission.tiktokUrl,
                facebookUrl: latestSubmission.facebookUrl,
                youtubeUrl: latestSubmission.youtubeUrl,
                thumbnailUrl: latestSubmission.thumbnailUrl,
                createdAt: latestSubmission.createdAt,
                updatedAt: latestSubmission.updatedAt,
              }
            : null,
        };
      },
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
      manualVotingEnabled: dto.manualVotingEnabled,
      votePriceNaira: dto.votePriceNaira,
      paymentBankName: dto.paymentBankName,
      paymentAccountName: dto.paymentAccountName,
      paymentAccountNumber: dto.paymentAccountNumber,
      paymentInstructions: dto.paymentInstructions,
    };
  }

  private toPublicCompetition<T extends { manualVotingEnabled: boolean }>(
    competition: T,
  ) {
    if (competition.manualVotingEnabled) {
      return competition;
    }

    return {
      ...competition,
      votePriceNaira: undefined,
      paymentBankName: undefined,
      paymentAccountName: undefined,
      paymentAccountNumber: undefined,
      paymentInstructions: undefined,
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
