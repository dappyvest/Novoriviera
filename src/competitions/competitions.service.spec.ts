import { Test, TestingModule } from '@nestjs/testing';
import {
  CompetitionStatus,
  ContestantStatus,
  SubmissionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompetitionsService } from './competitions.service';

describe('CompetitionsService', () => {
  let service: CompetitionsService;
  const competitionFindFirst = jest.fn();
  const contestantFindMany = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitionsService,
        {
          provide: PrismaService,
          useValue: {
            competition: { findFirst: competitionFindFirst },
            contestant: { findMany: contestantFindMany },
          },
        },
      ],
    }).compile();

    service = module.get<CompetitionsService>(CompetitionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists registered pending and approved entrants with rank, counts, photo, and engagement fields', async () => {
    competitionFindFirst.mockResolvedValue({
      id: 'competition-1',
      status: CompetitionStatus.PUBLISHED,
    });
    contestantFindMany.mockResolvedValue([
      {
        id: 'contestant-approved',
        displayName: 'Approved Star',
        photoUrl: 'https://example.com/approved.jpg',
        status: ContestantStatus.APPROVED,
        isPremium: false,
        totalVotes: 10,
        totalOnlineEngagement: 20,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        submissions: [],
      },
      {
        id: 'contestant-pending',
        displayName: 'Pending Star',
        photoUrl: 'https://example.com/pending.jpg',
        status: ContestantStatus.PENDING,
        isPremium: false,
        totalVotes: 5,
        totalOnlineEngagement: 30,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        submissions: [],
      },
    ]);

    await expect(service.leaderboard('competition-1')).resolves.toEqual([
      expect.objectContaining({
        rank: 1,
        entrantCount: 2,
        contestantId: 'contestant-approved',
        photoUrl: 'https://example.com/approved.jpg',
        status: ContestantStatus.APPROVED,
        totalVotes: 10,
        totalOnlineEngagement: 20,
      }),
      expect.objectContaining({
        rank: 2,
        entrantCount: 2,
        contestantId: 'contestant-pending',
        photoUrl: 'https://example.com/pending.jpg',
        status: ContestantStatus.PENDING,
        totalVotes: 5,
        totalOnlineEngagement: 30,
      }),
    ]);

    expect(contestantFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          competitionId: 'competition-1',
          status: {
            notIn: [ContestantStatus.REJECTED, ContestantStatus.ELIMINATED],
          },
        },
      }),
    );
  });

  it('returns direct latest approved submission video fields on leaderboard entries', async () => {
    competitionFindFirst.mockResolvedValue({
      id: 'competition-1',
      status: CompetitionStatus.PUBLISHED,
    });
    const olderSubmission = {
      id: 'submission-old',
      title: 'Old entry',
      description: null,
      videoUrl: 'https://example.com/old.mp4',
      uploadUrl: 'https://example.com/old-upload.mp4',
      cloudinarySecureUrl: 'https://res.cloudinary.com/demo/old.mp4',
      externalVideoUrl: 'https://example.com/old',
      tiktokUrl: 'https://www.tiktok.com/@novo/video/old',
      facebookUrl: 'https://facebook.com/reel/old',
      youtubeUrl: 'https://youtube.com/watch?v=old',
      thumbnailUrl: 'https://example.com/old.jpg',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    };
    const latestSubmission = {
      id: 'submission-latest',
      title: 'Latest entry',
      description: 'Latest approved video',
      videoUrl: 'https://example.com/latest.mp4',
      uploadUrl: 'https://example.com/latest-upload.mp4',
      cloudinarySecureUrl: 'https://res.cloudinary.com/demo/latest.mp4',
      externalVideoUrl: 'https://example.com/latest',
      tiktokUrl: 'https://www.tiktok.com/@novo/video/latest',
      facebookUrl: 'https://facebook.com/reel/latest',
      youtubeUrl: 'https://youtube.com/watch?v=latest',
      thumbnailUrl: 'https://example.com/latest.jpg',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    contestantFindMany.mockResolvedValue([
      {
        id: 'contestant-approved',
        displayName: 'Approved Star',
        photoUrl: null,
        status: ContestantStatus.APPROVED,
        isPremium: false,
        totalVotes: 0,
        totalOnlineEngagement: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        submissions: [latestSubmission, olderSubmission],
      },
    ]);

    await expect(service.leaderboard('competition-1')).resolves.toEqual([
      expect.objectContaining({
        contestantId: 'contestant-approved',
        videoUrl: latestSubmission.videoUrl,
        uploadUrl: latestSubmission.uploadUrl,
        cloudinarySecureUrl: latestSubmission.cloudinarySecureUrl,
        externalVideoUrl: latestSubmission.externalVideoUrl,
        tiktokUrl: latestSubmission.tiktokUrl,
        facebookUrl: latestSubmission.facebookUrl,
        youtubeUrl: latestSubmission.youtubeUrl,
        thumbnailUrl: latestSubmission.thumbnailUrl,
        latestVideoUrl: latestSubmission.videoUrl,
        latestSubmission: expect.objectContaining({
          id: latestSubmission.id,
          videoUrl: latestSubmission.videoUrl,
          uploadUrl: latestSubmission.uploadUrl,
          cloudinarySecureUrl: latestSubmission.cloudinarySecureUrl,
          externalVideoUrl: latestSubmission.externalVideoUrl,
          tiktokUrl: latestSubmission.tiktokUrl,
          facebookUrl: latestSubmission.facebookUrl,
          youtubeUrl: latestSubmission.youtubeUrl,
          thumbnailUrl: latestSubmission.thumbnailUrl,
        }),
      }),
    ]);

    expect(contestantFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          submissions: {
            where: { status: { in: [SubmissionStatus.APPROVED] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    );
  });
});
