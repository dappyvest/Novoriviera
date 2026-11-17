import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StagesService } from './stages.service';

describe('StagesService', () => {
  let service: StagesService;
  const stageFindMany = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StagesService,
        {
          provide: PrismaService,
          useValue: { stage: { findMany: stageFindMany } },
        },
      ],
    }).compile();

    service = module.get<StagesService>(StagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns competition stages with active and window state', async () => {
    stageFindMany.mockResolvedValue([
      {
        id: 'stage-1',
        title: 'Auditions',
        stageNumber: 1,
        status: 'ACTIVE',
        submissionStartDate: new Date('2020-01-01T00:00:00.000Z'),
        submissionEndDate: new Date('2099-01-01T00:00:00.000Z'),
        votingStartDate: new Date('2020-01-01T00:00:00.000Z'),
        votingEndDate: new Date('2099-01-01T00:00:00.000Z'),
      },
      {
        id: 'stage-2',
        title: 'Finals',
        stageNumber: 2,
        status: 'UPCOMING',
        submissionStartDate: null,
        submissionEndDate: null,
        votingStartDate: null,
        votingEndDate: null,
      },
    ]);

    const result = await service.findByCompetition('competition-1');

    expect(stageFindMany).toHaveBeenCalledWith({
      where: { competitionId: 'competition-1' },
      orderBy: { stageNumber: 'asc' },
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'stage-1',
        title: 'Auditions',
        stageNumber: 1,
        status: 'ACTIVE',
        isActive: true,
        isSubmissionOpen: true,
        isSubmissionClosed: false,
        isVotingOpen: true,
        isVotingClosed: false,
      }),
      expect.objectContaining({
        id: 'stage-2',
        status: 'UPCOMING',
        isActive: false,
        isSubmissionOpen: false,
        isSubmissionClosed: true,
        isVotingOpen: false,
        isVotingClosed: true,
      }),
    ]);
  });
});
