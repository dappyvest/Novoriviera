import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CoinPackagesModule } from './coin-packages/coin-packages.module';
import { CmsModule } from './cms/cms.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { ContestantsModule } from './contestants/contestants.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { StagesModule } from './stages/stages.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { UsersModule } from './users/users.module';
import { UploadsModule } from './uploads/uploads.module';
import { validateEnv } from './config/env.validation';
import { VotesModule } from './votes/votes.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    CmsModule,
    CoinPackagesModule,
    UsersModule,
    CompetitionsModule,
    ContestantsModule,
    StagesModule,
    SubmissionsModule,
    UploadsModule,
    VotesModule,
    WalletModule,
    PaymentsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
