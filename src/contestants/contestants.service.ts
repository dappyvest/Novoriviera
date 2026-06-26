import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContestantStatus,
  Prisma,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContestantDto } from './dto/create-contestant.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { UpdateContestantPremiumDto } from './dto/update-contestant-premium.dto';
import { UpdateContestantPhotoDto } from './dto/update-contestant-photo.dto';

const publicContestantBlockedStatuses = [
  ContestantStatus.REJECTED,
  ContestantStatus.ELIMINATED,
];

const publicSubmissionBlockedStatuses = [SubmissionStatus.REJECTED];

@Injectable()
export class ContestantsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    userId: string,
    competitionId: string,
    dto: CreateContestantDto,
  ) {
    const existing = await this.prisma.contestant.findUnique({
      where: { competitionId_userId: { competitionId, userId } },
    });

    if (existing) {
      throw new ConflictException(
        'User already has a contestant profile for this competition',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const contestantCode = await this.generateContestantCode(tx);
      const contestant = await tx.contestant.create({
        data: {
          ...dto,
          contestantCode,
          userId,
          competitionId,
          status: ContestantStatus.PENDING,
        },
      });

      await tx.user.updateMany({
        where: { id: userId, role: UserRole.USER },
        data: { role: UserRole.CONTESTANT },
      });

      return contestant;
    });
  }

  findMine(userId: string) {
    return this.prisma.contestant.findMany({
      where: { userId },
      include: { competition: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMineForCompetition(userId: string, competitionId: string) {
    const contestant = await this.prisma.contestant.findUnique({
      where: { competitionId_userId: { competitionId, userId } },
      include: { competition: true },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant profile not found');
    }

    return contestant;
  }

  async updateMyPhoto(
    userId: string,
    competitionId: string,
    dto: UpdateContestantPhotoDto,
  ) {
    const contestant = await this.prisma.contestant.findUnique({
      where: { competitionId_userId: { competitionId, userId } },
      select: { id: true },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant profile not found');
    }

    return this.prisma.contestant.update({
      where: { id: contestant.id },
      data: {
        photoUrl: dto.photoUrl,
        photoPublicId: dto.photoPublicId,
        photoMeta: dto.photoMeta as Prisma.InputJsonValue | undefined,
      },
    });
  }

  findAll() {
    return this.prisma.contestant.findMany({
      include: { user: true, competition: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const contestant = await this.prisma.contestant.findUnique({
      where: { id },
      include: { user: true, competition: true },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }

    return contestant;
  }

  async findPublicProfile(id: string) {
    return this.findPublicProfileByWhere({ id });
  }

  async findPublicProfileByCode(contestantCode: string) {
    return this.findPublicProfileByWhere({ contestantCode });
  }

  async getVoteInfo(contestantCode: string) {
    const contestant = await this.prisma.contestant.findFirst({
      where: {
        contestantCode,
        status: { notIn: publicContestantBlockedStatuses },
      },
      include: {
        competition: true,
      },
    });

    if (!contestant || !contestant.competition.manualVotingEnabled) {
      throw new NotFoundException('Vote information not found');
    }

    return {
      contestant: {
        id: contestant.id,
        contestantCode: contestant.contestantCode,
        displayName: contestant.displayName,
        photoUrl: contestant.photoUrl,
        status: contestant.status,
      },
      competition: {
        id: contestant.competition.id,
        title: contestant.competition.title,
        slug: contestant.competition.slug,
        bannerUrl: contestant.competition.bannerUrl,
      },
      votePriceNaira: contestant.competition.votePriceNaira,
      bankName: contestant.competition.paymentBankName,
      accountName: contestant.competition.paymentAccountName,
      accountNumber: contestant.competition.paymentAccountNumber,
      paymentInstructions: contestant.competition.paymentInstructions,
      requiredNarration: contestant.contestantCode,
      contestantCode: contestant.contestantCode,
    };
  }

  private async findPublicProfileByWhere(
    where:
      | { id: string; contestantCode?: never }
      | { contestantCode: string; id?: never },
  ) {
    const contestant = await this.prisma.contestant.findFirst({
      where: {
        ...where,
        status: { notIn: publicContestantBlockedStatuses },
      },
      include: {
        competition: true,
        submissions: {
          where: { status: { notIn: publicSubmissionBlockedStatuses } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }

    const latestSubmission = contestant.submissions[0] ?? null;
    const entrants = await this.prisma.contestant.findMany({
      where: {
        competitionId: contestant.competitionId,
        status: { notIn: publicContestantBlockedStatuses },
      },
      orderBy: [
        { totalVotes: 'desc' },
        { totalOnlineEngagement: 'desc' },
        { createdAt: 'asc' },
      ],
      select: { id: true },
    });
    const rankIndex = entrants.findIndex((entry) => entry.id === contestant.id);

    return {
      id: contestant.id,
      contestantCode: contestant.contestantCode,
      displayName: contestant.displayName,
      bio: contestant.bio,
      age: contestant.age,
      location: contestant.location,
      photoUrl: contestant.photoUrl,
      status: contestant.status,
      isPremium: contestant.isPremium,
      premiumExpiresAt: contestant.premiumExpiresAt,
      totalVotes: contestant.totalVotes,
      totalOnlineEngagement: contestant.totalOnlineEngagement,
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      entrantCount: entrants.length,
      competition: contestant.competition,
      latestSubmission: latestSubmission
        ? {
            id: latestSubmission.id,
            title: latestSubmission.title,
            description: latestSubmission.description,
            videoUrl: latestSubmission.videoUrl,
            uploadUrl: latestSubmission.uploadUrl,
            youtubeUrl: latestSubmission.youtubeUrl,
            tiktokUrl: latestSubmission.tiktokUrl,
            facebookUrl: latestSubmission.facebookUrl,
            instagramUrl: latestSubmission.instagramUrl,
            externalVideoUrl: latestSubmission.externalVideoUrl,
            thumbnailUrl: latestSubmission.thumbnailUrl,
            cloudinarySecureUrl: latestSubmission.cloudinarySecureUrl,
            createdAt: latestSubmission.createdAt,
            updatedAt: latestSubmission.updatedAt,
          }
        : null,
      latestApprovedSubmission: latestSubmission
        ? {
            id: latestSubmission.id,
            title: latestSubmission.title,
            description: latestSubmission.description,
            videoUrl: latestSubmission.videoUrl,
            uploadUrl: latestSubmission.uploadUrl,
            youtubeUrl: latestSubmission.youtubeUrl,
            tiktokUrl: latestSubmission.tiktokUrl,
            facebookUrl: latestSubmission.facebookUrl,
            instagramUrl: latestSubmission.instagramUrl,
            externalVideoUrl: latestSubmission.externalVideoUrl,
            thumbnailUrl: latestSubmission.thumbnailUrl,
            cloudinarySecureUrl: latestSubmission.cloudinarySecureUrl,
            createdAt: latestSubmission.createdAt,
            updatedAt: latestSubmission.updatedAt,
          }
        : null,
      shareTitle: `${contestant.displayName} - ${contestant.competition.title}`,
      shareDescription:
        contestant.bio ??
        `Vote for ${contestant.displayName} in ${contestant.competition.title}`,
      shareImageUrl:
        latestSubmission?.thumbnailUrl ??
        contestant.photoUrl ??
        contestant.competition.bannerUrl,
      createdAt: contestant.createdAt,
      updatedAt: contestant.updatedAt,
    };
  }

  async updateStatus(id: string, status: ContestantStatus) {
    await this.findOne(id);
    return this.prisma.contestant.update({
      where: { id },
      data: { status },
    });
  }

  async updatePremium(id: string, dto: UpdateContestantPremiumDto) {
    await this.findOne(id);
    return this.prisma.contestant.update({
      where: { id },
      data: {
        isPremium: dto.isPremium,
        premiumExpiresAt: dto.premiumExpiresAt
          ? new Date(dto.premiumExpiresAt)
          : null,
      },
    });
  }

  async updateEngagement(
    id: string,
    dto: UpdateEngagementDto,
    actorId: string,
  ) {
    await this.findOne(id);
    const totalEngagement = this.computeEngagementTotal(dto);

    return this.prisma.$transaction(async (tx) => {
      if (dto.stageId) {
        const stage = await tx.stage.findUnique({ where: { id: dto.stageId } });
        if (!stage) {
          throw new NotFoundException('Stage not found');
        }
      }

      const contestant = await tx.contestant.update({
        where: { id },
        data: {
          totalOnlineEngagement: { increment: totalEngagement },
        },
      });

      await tx.engagementBreakdown.create({
        data: {
          contestantId: id,
          stageId: dto.stageId,
          views: dto.views ?? 0,
          likes: dto.likes ?? 0,
          comments: dto.comments ?? 0,
          shares: dto.shares ?? 0,
          watchScore: dto.watchScore ?? 0,
          total: totalEngagement,
          platform: dto.platform,
          note: dto.note,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'ENGAGEMENT_UPDATE',
          entity: 'Contestant',
          entityId: id,
          metadata: { ...dto },
        },
      });

      return contestant;
    });
  }

  private computeEngagementTotal(dto: UpdateEngagementDto) {
    if (dto.onlineEngagementCount !== undefined) {
      return dto.onlineEngagementCount;
    }

    const total =
      (dto.views ?? 0) +
      (dto.likes ?? 0) +
      (dto.comments ?? 0) +
      (dto.shares ?? 0) +
      (dto.watchScore ?? 0);

    if (total < 0) {
      throw new BadRequestException('Engagement total cannot be negative');
    }

    return total;
  }

  private async generateContestantCode(tx: Prisma.TransactionClient) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = `NRV-${Math.floor(100000 + Math.random() * 900000)}`;
      const existing = await tx.contestant.findUnique({
        where: { contestantCode: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('Could not generate unique contestant code');
  }
}
