import { Test, TestingModule } from '@nestjs/testing';
import { CompetitionStatus, ContestantStatus } from '@prisma/client';
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
});
