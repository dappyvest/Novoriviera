import { Test, TestingModule } from '@nestjs/testing';
import {
  SponsoredAdPlacement,
  SponsoredAdStatus,
  UserRole,
} from '@prisma/client';
import { AdsService } from '../ads/ads.service';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { CoinPackagesService } from '../coin-packages/coin-packages.service';
import { CompetitionsService } from '../competitions/competitions.service';
import { ContestantsService } from '../contestants/contestants.service';
import { PaymentsService } from '../payments/payments.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { VotesService } from '../votes/votes.service';
import { WalletService } from '../wallet/wallet.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  const adminUser: CurrentUserPayload = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    phone: null,
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const createAuditLog = jest.fn();
  const adsCreate = jest.fn();
  const adsUpdate = jest.fn();
  const adsRemove = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            findUsers: jest.fn(),
            findUser: jest.fn(),
            updateUserStatus: jest.fn(),
            resetUserPassword: jest.fn(),
            createAuditLog,
          },
        },
        {
          provide: AdsService,
          useValue: {
            create: adsCreate,
            findAdmin: jest.fn(),
            findOne: jest.fn(),
            update: adsUpdate,
            remove: adsRemove,
          },
        },
        { provide: CoinPackagesService, useValue: {} },
        { provide: CompetitionsService, useValue: { reset: jest.fn() } },
        { provide: ContestantsService, useValue: {} },
        { provide: PaymentsService, useValue: {} },
        { provide: SubmissionsService, useValue: {} },
        { provide: VotesService, useValue: {} },
        { provide: WalletService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('audits sponsored ad creation', async () => {
    adsCreate.mockResolvedValue({ id: 'ad-1', title: 'Homepage sponsor' });
    const dto = {
      title: 'Homepage sponsor',
      productName: 'Novo Boost',
      description: 'Sponsored product',
      placement: SponsoredAdPlacement.HOME_TOP,
      status: SponsoredAdStatus.ACTIVE,
    };

    await expect(
      controller.createAd(dto, adminUser),
    ).resolves.toMatchObject({ id: 'ad-1' });

    expect(createAuditLog).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'SPONSORED_AD_CREATE',
      entity: 'SponsoredAd',
      entityId: 'ad-1',
      metadata: dto,
    });
  });

  it('audits sponsored ad updates and deletes', async () => {
    adsUpdate.mockResolvedValue({
      id: 'ad-1',
      status: SponsoredAdStatus.PAUSED,
    });
    adsRemove.mockResolvedValue({ id: 'ad-1' });

    await controller.updateAd(
      'ad-1',
      { status: SponsoredAdStatus.PAUSED },
      adminUser,
    );
    await controller.deleteAd('ad-1', adminUser);

    expect(createAuditLog).toHaveBeenNthCalledWith(1, {
      actorId: 'admin-1',
      action: 'SPONSORED_AD_UPDATE',
      entity: 'SponsoredAd',
      entityId: 'ad-1',
      metadata: { status: SponsoredAdStatus.PAUSED },
    });
    expect(createAuditLog).toHaveBeenNthCalledWith(2, {
      actorId: 'admin-1',
      action: 'SPONSORED_AD_DELETE',
      entity: 'SponsoredAd',
      entityId: 'ad-1',
    });
  });
});
