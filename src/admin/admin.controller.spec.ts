import { Test, TestingModule } from '@nestjs/testing';
import { CoinPackagesService } from '../coin-packages/coin-packages.service';
import { ContestantsService } from '../contestants/contestants.service';
import { PaymentsService } from '../payments/payments.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { VotesService } from '../votes/votes.service';
import { WalletService } from '../wallet/wallet.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            findUsers: jest.fn(),
            findUser: jest.fn(),
            updateUserStatus: jest.fn(),
          },
        },
        { provide: CoinPackagesService, useValue: {} },
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
});
