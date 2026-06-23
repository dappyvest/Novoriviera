import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CoinTransactionType,
  ContestantStatus,
  StageStatus,
  VoteSource,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VotesService } from './votes.service';

describe('VotesService', () => {
  let service: VotesService;
  const contestantFindUnique = jest.fn();
  const stageFindUnique = jest.fn();
  const walletFindUnique = jest.fn();
  const walletUpdate = jest.fn();
  const coinTransactionCreate = jest.fn();
  const voteCreate = jest.fn();
  const contestantUpdate = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const prismaMock = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(prismaMock),
      ),
      contestant: {
        findUnique: contestantFindUnique,
        update: contestantUpdate,
      },
      stage: { findUnique: stageFindUnique },
      coinWallet: {
        findUnique: walletFindUnique,
        update: walletUpdate,
      },
      coinTransaction: { create: coinTransactionCreate },
      vote: { create: voteCreate },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [VotesService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<VotesService>(VotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([1, 5, 15])('rejects invalid coin spend %s', async (coinsToSpend) => {
    await expect(
      service.cast('user-1', {
        contestantId: 'contestant-1',
        stageId: 'stage-1',
        coinsToSpend,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'coinsToSpend must be at least 10 and divisible by 10',
      ),
    );
  });

  it('debits coins and credits one vote per 10 coins', async () => {
    contestantFindUnique.mockResolvedValue({
      id: 'contestant-1',
      displayName: 'Ada',
      competitionId: 'competition-1',
      status: ContestantStatus.PENDING,
    });
    stageFindUnique.mockResolvedValue({
      id: 'stage-1',
      competitionId: 'competition-1',
      status: StageStatus.ACTIVE,
      votingStartDate: null,
      votingEndDate: null,
    });
    walletFindUnique.mockResolvedValue({
      id: 'wallet-1',
      userId: 'user-1',
      balance: 100,
    });
    walletUpdate.mockResolvedValue({ id: 'wallet-1', balance: 70 });
    coinTransactionCreate.mockResolvedValue({ id: 'coin-transaction-1' });
    voteCreate.mockResolvedValue({ id: 'vote-1', quantity: 3 });
    contestantUpdate.mockResolvedValue({ id: 'contestant-1', totalVotes: 3 });

    await expect(
      service.cast('user-1', {
        contestantId: 'contestant-1',
        stageId: 'stage-1',
        coinsToSpend: 30,
      }),
    ).resolves.toMatchObject({
      vote: { quantity: 3 },
      wallet: { balance: 70 },
    });

    expect(walletUpdate).toHaveBeenCalledWith({
      where: { id: 'wallet-1' },
      data: { balance: 70 },
    });
    expect(coinTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: -30,
        type: CoinTransactionType.DEBIT,
        metadata: expect.objectContaining({
          coinsToSpend: 30,
          votesCredited: 3,
        }),
      }),
    });
    expect(voteCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: VoteSource.COIN,
        quantity: 3,
      }),
    });
    expect(contestantUpdate).toHaveBeenCalledWith({
      where: { id: 'contestant-1' },
      data: { totalVotes: { increment: 3 } },
    });
  });
});
