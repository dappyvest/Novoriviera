import { Test, TestingModule } from '@nestjs/testing';
import {
  SponsoredAdPlacement,
  SponsoredAdStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdsService } from './ads.service';

describe('AdsService', () => {
  let service: AdsService;
  const sponsoredAdCreate = jest.fn();
  const sponsoredAdFindMany = jest.fn();
  const sponsoredAdFindUnique = jest.fn();
  const sponsoredAdUpdate = jest.fn();
  const sponsoredAdDelete = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsService,
        {
          provide: PrismaService,
          useValue: {
            sponsoredAd: {
              create: sponsoredAdCreate,
              findMany: sponsoredAdFindMany,
              findUnique: sponsoredAdFindUnique,
              update: sponsoredAdUpdate,
              delete: sponsoredAdDelete,
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdsService>(AdsService);
  });

  it('creates ads with mapped date windows', async () => {
    sponsoredAdCreate.mockResolvedValue({ id: 'ad-1' });

    await service.create({
      title: 'Top banner',
      productName: 'Novo Pay',
      description: 'Sponsored product',
      placement: SponsoredAdPlacement.HOME_TOP,
      status: SponsoredAdStatus.ACTIVE,
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-07-01T00:00:00.000Z',
    });

    expect(sponsoredAdCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Top banner',
        placement: SponsoredAdPlacement.HOME_TOP,
        startsAt: new Date('2026-06-01T00:00:00.000Z'),
        endsAt: new Date('2026-07-01T00:00:00.000Z'),
      }),
    });
  });

  it('returns only active ads inside the public date window', async () => {
    sponsoredAdFindMany.mockResolvedValue([]);

    await service.findPublic(SponsoredAdPlacement.LEADERBOARD);

    expect(sponsoredAdFindMany).toHaveBeenCalledWith({
      where: {
        status: SponsoredAdStatus.ACTIVE,
        placement: SponsoredAdPlacement.LEADERBOARD,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: expect.any(Date) } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  });

  it('increments clicks and impressions', async () => {
    sponsoredAdFindUnique.mockResolvedValue({ id: 'ad-1' });
    sponsoredAdUpdate.mockResolvedValue({ id: 'ad-1' });

    await service.trackClick('ad-1');
    await service.trackImpression('ad-1');

    expect(sponsoredAdUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'ad-1' },
      data: { clicks: { increment: 1 } },
    });
    expect(sponsoredAdUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'ad-1' },
      data: { impressions: { increment: 1 } },
    });
  });
});
