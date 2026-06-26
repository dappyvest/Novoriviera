import { Module } from '@nestjs/common';
import { AdsModule } from '../ads/ads.module';
import { CoinPackagesModule } from '../coin-packages/coin-packages.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { ContestantsModule } from '../contestants/contestants.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { VotesModule } from '../votes/votes.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AdsModule,
    CoinPackagesModule,
    CompetitionsModule,
    ContestantsModule,
    PaymentsModule,
    SubmissionsModule,
    VotesModule,
    WalletModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
