import { Test, TestingModule } from '@nestjs/testing';
import {
  SponsoredAdDestinationType,
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
    sponsoredAdCreate.mockResolvedValue({
      id: 'ad-1',
      placement: SponsoredAdPlacement.HOME_TOP,
      placements: [SponsoredAdPlacement.HOME_TOP],
      clicks: 0,
      impressions: 0,
      sortOrder: 0,
    });

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
        placements: [SponsoredAdPlacement.HOME_TOP],
        startsAt: new Date('2026-06-01T00:00:00.000Z'),
        endsAt: new Date('2026-07-01T00:00:00.000Z'),
      }),
    });
  });

  it('creates ads with multiple placements and normalizes WhatsApp phone destinations', async () => {
    sponsoredAdCreate.mockResolvedValue({
      id: 'ad-1',
      placement: SponsoredAdPlacement.HOME_TOP,
      placements: [
        SponsoredAdPlacement.HOME_TOP,
        SponsoredAdPlacement.LEADERBOARD,
        SponsoredAdPlacement.VOTE_PAGE,
      ],
      destinationType: SponsoredAdDestinationType.WHATSAPP,
      destinationValue: '08012345678',
      targetUrl: 'https://wa.me/2348012345678',
      whatsappUrl: 'https://wa.me/2348012345678',
      clicks: 0,
      impressions: 0,
      sortOrder: 1,
    });

    const result = await service.create({
      title: 'Multi banner',
      productName: 'Novo Pay',
      description: 'Sponsored product',
      placements: [
        SponsoredAdPlacement.HOME_TOP,
        SponsoredAdPlacement.LEADERBOARD,
        SponsoredAdPlacement.VOTE_PAGE,
      ],
      destinationType: SponsoredAdDestinationType.WHATSAPP,
      destinationValue: '08012345678',
      sortOrder: 1,
    });

    expect(sponsoredAdCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        placement: SponsoredAdPlacement.HOME_TOP,
        placements: [
          SponsoredAdPlacement.HOME_TOP,
          SponsoredAdPlacement.LEADERBOARD,
          SponsoredAdPlacement.VOTE_PAGE,
        ],
        destinationType: SponsoredAdDestinationType.WHATSAPP,
        destinationValue: '08012345678',
        targetUrl: 'https://wa.me/2348012345678',
        whatsappUrl: 'https://wa.me/2348012345678',
      }),
    });
    expect(result).toMatchObject({
      ctr: 0,
      displayPriority: 1,
    });
  });

  it('returns only active ads inside the public date window', async () => {
    sponsoredAdFindMany.mockResolvedValue([]);

    await service.findPublic(SponsoredAdPlacement.VOTE_PAGE);

    expect(sponsoredAdFindMany).toHaveBeenCalledWith({
      where: {
        status: SponsoredAdStatus.ACTIVE,
        OR: [
          { placement: SponsoredAdPlacement.VOTE_PAGE },
          { placements: { has: SponsoredAdPlacement.VOTE_PAGE } },
        ],
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: expect.any(Date) } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  });

  it('increments clicks and impressions', async () => {
    sponsoredAdFindUnique.mockResolvedValue({
      id: 'ad-1',
      placement: SponsoredAdPlacement.HOME_TOP,
      placements: [SponsoredAdPlacement.HOME_TOP],
      clicks: 1,
      impressions: 2,
      sortOrder: 0,
    });
    sponsoredAdUpdate
      .mockResolvedValueOnce({
        id: 'ad-1',
        placement: SponsoredAdPlacement.HOME_TOP,
        placements: [SponsoredAdPlacement.HOME_TOP],
        clicks: 2,
        impressions: 2,
        sortOrder: 0,
      })
      .mockResolvedValueOnce({
        id: 'ad-1',
        placement: SponsoredAdPlacement.HOME_TOP,
        placements: [SponsoredAdPlacement.HOME_TOP],
        clicks: 2,
        impressions: 3,
        sortOrder: 0,
      });

    await expect(service.trackClick('ad-1')).resolves.toMatchObject({
      clicks: 2,
      ctr: 100,
    });
    await expect(service.trackImpression('ad-1')).resolves.toMatchObject({
      impressions: 3,
      ctr: 66.67,
    });

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
