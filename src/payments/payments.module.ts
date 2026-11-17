import { Module } from '@nestjs/common';
import { PublicVoteRateLimitGuard } from '../public-votes/public-vote-rate-limit.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PublicVoteRateLimitGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
