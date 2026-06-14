import { Module } from '@nestjs/common';
import { CoinPackagesModule } from '../coin-packages/coin-packages.module';
import { ContestantsModule } from '../contestants/contestants.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { VotesModule } from '../votes/votes.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    CoinPackagesModule,
    ContestantsModule,
    PaymentsModule,
    SubmissionsModule,
    VotesModule,
    WalletModule,
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
