import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContestantStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionStatusDto } from './dto/update-submission-status.dto';
import { UpdateSubmissionYoutubeDto } from './dto/update-submission-youtube.dto';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, stageId: string, dto: CreateSubmissionDto) {
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    this.ensureSubmissionWindow(stage);

    const contestant = await this.prisma.contestant.findUnique({
      where: {
        competitionId_userId: {
          competitionId: stage.competitionId,
          userId,
        },
      },
    });

    if (!contestant || contestant.status !== ContestantStatus.APPROVED) {
      throw new BadRequestException('Only approved contestants can submit');
    }

    try {
      return await this.prisma.submission.create({
        data: {
          ...dto,
          uploadedFileMeta: dto.uploadedFileMeta as
            | Prisma.InputJsonValue
            | undefined,
          contestantId: contestant.id,
          stageId,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Contestant already has a submission for this stage',
        );
      }
      throw error;
    }
  }

  findMine(userId: string) {
    return this.prisma.submission.findMany({
      where: { contestant: { userId } },
      include: { stage: true, contestant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByStage(stageId: string) {
    return this.prisma.submission.findMany({
      where: { stageId, status: 'APPROVED' },
      include: { contestant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.submission.findMany({
      include: { contestant: { include: { user: true, competition: true } }, stage: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, dto: UpdateSubmissionStatusDto) {
    await this.ensureSubmission(id);
    return this.prisma.submission.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote,
      },
    });
  }

  async updateYoutube(id: string, dto: UpdateSubmissionYoutubeDto) {
    await this.ensureSubmission(id);
    return this.prisma.submission.update({
      where: { id },
      data: dto,
    });
  }

  private ensureSubmissionWindow(stage: {
    submissionStartDate: Date | null;
    submissionEndDate: Date | null;
  }) {
    const now = new Date();
    if (
      (stage.submissionStartDate && now < stage.submissionStartDate) ||
      (stage.submissionEndDate && now > stage.submissionEndDate)
    ) {
      throw new BadRequestException('Stage is outside the submission window');
    }
  }

  private async ensureSubmission(id: string) {
    const submission = await this.prisma.submission.findUnique({ where: { id } });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
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
