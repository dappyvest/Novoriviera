import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContestantStatus, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  const stageFindUnique = jest.fn();
  const contestantFindUnique = jest.fn();
  const submissionCreate = jest.fn();
  const submissionFindUnique = jest.fn();
  const submissionUpdate = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    stageFindUnique.mockResolvedValue({
      id: 'stage-1',
      competitionId: 'competition-1',
      submissionStartDate: null,
      submissionEndDate: null,
    });
    submissionCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'submission-1', ...data }),
    );
    submissionFindUnique.mockResolvedValue({ id: 'submission-1' });
    submissionUpdate.mockImplementation(({ data }) => Promise.resolve(data));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: PrismaService,
          useValue: {
            stage: { findUnique: stageFindUnique },
            contestant: { findUnique: contestantFindUnique },
            submission: {
              create: submissionCreate,
              findUnique: submissionFindUnique,
              update: submissionUpdate,
            },
          },
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it.each([ContestantStatus.PENDING, ContestantStatus.APPROVED])(
    'allows a %s contestant to submit a publicly visible entry',
    async (status) => {
      contestantFindUnique.mockResolvedValue({
        id: 'contestant-1',
        status,
      });

      await expect(
        service.create('user-1', 'stage-1', { title: 'My entry' }),
      ).resolves.toMatchObject({
        contestantId: 'contestant-1',
        stageId: 'stage-1',
        status: SubmissionStatus.APPROVED,
      });
      expect(submissionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contestantId: 'contestant-1',
          stageId: 'stage-1',
          status: SubmissionStatus.APPROVED,
        }),
      });
    },
  );

  it('guides users to register first when no contestant profile exists', async () => {
    contestantFindUnique.mockResolvedValue(null);

    await expect(
      service.create('user-1', 'stage-1', { title: 'My entry' }),
    ).rejects.toThrow(
      new BadRequestException(
        'Please register as a contestant for this competition before submitting an entry.',
      ),
    );
    expect(submissionCreate).not.toHaveBeenCalled();
  });

  it.each([ContestantStatus.REJECTED, ContestantStatus.ELIMINATED])(
    'rejects a %s contestant with the support message',
    async (status) => {
      contestantFindUnique.mockResolvedValue({
        id: 'contestant-1',
        status,
      });

      await expect(
        service.create('user-1', 'stage-1', { title: 'My entry' }),
      ).rejects.toThrow(
        new BadRequestException(
          'Your account or contestant profile is not allowed to submit entries. Please contact support.',
        ),
      );
      expect(submissionCreate).not.toHaveBeenCalled();
    },
  );

  it('preserves TikTok URL submission metadata updates', async () => {
    const tiktokUrl = 'https://www.tiktok.com/@novo/video/123';

    await expect(
      service.updateYoutube('submission-1', { tiktokUrl }),
    ).resolves.toEqual({ tiktokUrl });
    expect(submissionUpdate).toHaveBeenCalledWith({
      where: { id: 'submission-1' },
      data: { tiktokUrl },
    });
  });
});
