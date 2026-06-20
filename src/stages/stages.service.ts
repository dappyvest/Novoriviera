import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(competitionId: string, dto: CreateStageDto) {
    await this.ensureCompetition(competitionId);
    await this.ensureActiveStageRule(competitionId, dto.status);

    try {
      return await this.prisma.stage.create({
        data: this.mapCreateStageData(competitionId, dto),
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Stage number must be unique per competition',
        );
      }
      throw error;
    }
  }

  async findByCompetition(competitionId: string) {
    const stages = await this.prisma.stage.findMany({
      where: { competitionId },
      orderBy: { stageNumber: 'asc' },
    });

    const now = new Date();
    return stages.map((stage) => {
      const isActive = stage.status === StageStatus.ACTIVE;
      const isSubmissionOpen =
        isActive &&
        (!stage.submissionStartDate || now >= stage.submissionStartDate) &&
        (!stage.submissionEndDate || now <= stage.submissionEndDate);
      const isVotingOpen =
        isActive &&
        (!stage.votingStartDate || now >= stage.votingStartDate) &&
        (!stage.votingEndDate || now <= stage.votingEndDate);

      return {
        id: stage.id,
        title: stage.title,
        stageNumber: stage.stageNumber,
        status: stage.status,
        submissionStartDate: stage.submissionStartDate,
        submissionEndDate: stage.submissionEndDate,
        votingStartDate: stage.votingStartDate,
        votingEndDate: stage.votingEndDate,
        isActive,
        isSubmissionOpen,
        isSubmissionClosed: !isSubmissionOpen,
        isVotingOpen,
        isVotingClosed: !isVotingOpen,
      };
    });
  }

  async update(id: string, dto: UpdateStageDto) {
    const stage = await this.ensureStage(id);
    await this.ensureActiveStageRule(stage.competitionId, dto.status, id);

    try {
      return await this.prisma.stage.update({
        where: { id },
        data: this.mapStageData(dto),
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Stage number must be unique per competition',
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.ensureStage(id);
    return this.prisma.stage.delete({ where: { id } });
  }

  async eliminateBottom(stageId: string) {
    const stage = await this.ensureStage(stageId);
    const contestants = await this.prisma.contestant.findMany({
      where: {
        competitionId: stage.competitionId,
        status: 'APPROVED',
      },
      orderBy: [
        { totalVotes: 'asc' },
        { totalOnlineEngagement: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    if (!contestants.length) {
      return {
        eliminatedContestants: [],
        affectedContestants: [],
        survivorsCount: 0,
        eliminatedCount: 0,
        eliminationPercentage: stage.eliminationPercentage,
        rankingSnapshot: [],
      };
    }

    const count = Math.floor(
      (contestants.length * stage.eliminationPercentage) / 100,
    );

    if (count <= 0) {
      return {
        eliminatedContestants: [],
        affectedContestants: [],
        survivorsCount: contestants.length,
        eliminatedCount: 0,
        eliminationPercentage: stage.eliminationPercentage,
        rankingSnapshot: contestants.map((contestant, index) => ({
          rank: contestants.length - index,
          contestantId: contestant.id,
          displayName: contestant.displayName,
          totalVotes: contestant.totalVotes,
          totalOnlineEngagement: contestant.totalOnlineEngagement,
          status: contestant.status,
        })),
      };
    }

    const affected = contestants.slice(0, count);
    await this.prisma.contestant.updateMany({
      where: { id: { in: affected.map((contestant) => contestant.id) } },
      data: { status: 'ELIMINATED' },
    });

    const eliminatedContestants = affected.map((contestant) => ({
      ...contestant,
      status: 'ELIMINATED',
    }));

    return {
      eliminatedContestants,
      affectedContestants: eliminatedContestants,
      survivorsCount: contestants.length - affected.length,
      eliminatedCount: affected.length,
      eliminationPercentage: stage.eliminationPercentage,
      rankingSnapshot: contestants.map((contestant, index) => ({
        rank: contestants.length - index,
        contestantId: contestant.id,
        displayName: contestant.displayName,
        totalVotes: contestant.totalVotes,
        totalOnlineEngagement: contestant.totalOnlineEngagement,
        status: affected.some((item) => item.id === contestant.id)
          ? 'ELIMINATED'
          : contestant.status,
      })),
    };
  }

  async ensureSubmissionWindow(stageId: string) {
    const stage = await this.ensureStage(stageId);
    const now = new Date();

    if (
      (stage.submissionStartDate && now < stage.submissionStartDate) ||
      (stage.submissionEndDate && now > stage.submissionEndDate)
    ) {
      throw new BadRequestException('Stage is outside the submission window');
    }

    return stage;
  }

  private async ensureCompetition(competitionId: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }
  }

  private async ensureStage(id: string) {
    const stage = await this.prisma.stage.findUnique({ where: { id } });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    return stage;
  }

  private async ensureActiveStageRule(
    competitionId: string,
    status?: StageStatus,
    stageId?: string,
  ) {
    if (status !== StageStatus.ACTIVE) {
      return;
    }

    const existingActive = await this.prisma.stage.findFirst({
      where: {
        competitionId,
        status: StageStatus.ACTIVE,
        ...(stageId ? { id: { not: stageId } } : {}),
      },
    });

    if (existingActive) {
      throw new ConflictException('Only one active stage is allowed');
    }
  }

  private mapStageData(dto: CreateStageDto | UpdateStageDto) {
    return {
      ...dto,
      submissionStartDate: dto.submissionStartDate
        ? new Date(dto.submissionStartDate)
        : undefined,
      submissionEndDate: dto.submissionEndDate
        ? new Date(dto.submissionEndDate)
        : undefined,
      votingStartDate: dto.votingStartDate
        ? new Date(dto.votingStartDate)
        : undefined,
      votingEndDate: dto.votingEndDate ? new Date(dto.votingEndDate) : undefined,
    };
  }

  private mapCreateStageData(
    competitionId: string,
    dto: CreateStageDto,
  ): Prisma.StageUncheckedCreateInput {
    return {
      title: dto.title,
      stageNumber: dto.stageNumber,
      description: dto.description,
      status: dto.status,
      submissionStartDate: dto.submissionStartDate
        ? new Date(dto.submissionStartDate)
        : undefined,
      submissionEndDate: dto.submissionEndDate
        ? new Date(dto.submissionEndDate)
        : undefined,
      votingStartDate: dto.votingStartDate
        ? new Date(dto.votingStartDate)
        : undefined,
      votingEndDate: dto.votingEndDate ? new Date(dto.votingEndDate) : undefined,
      eliminationPercentage: dto.eliminationPercentage,
      competitionId,
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
