import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PublicVoteRateLimitGuard } from '../public-votes/public-vote-rate-limit.guard';
import { InitializePaidVoteDto } from './dto/initialize-paid-vote.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('paystack/votes/initialize')
  @UseGuards(PublicVoteRateLimitGuard)
  initializePaidVote(@Body() dto: InitializePaidVoteDto) {
    return this.paymentsService.initializePaidVote(dto);
  }

  @Get('paystack/votes/verify/:reference')
  @UseGuards(PublicVoteRateLimitGuard)
  verifyPaidVote(@Param('reference') reference: string) {
    return this.paymentsService.verifyPaidVote(reference);
  }

  @Post('webhook/paystack')
  webhook(@Req() request: { rawBody?: Buffer; body: unknown }, @Headers('x-paystack-signature') signature?: string) {
    this.paymentsService.verifyPaystackSignature(request.rawBody, signature, request.body);
    return this.paymentsService.handlePaystackWebhook(request.body as { event?: string; data?: { reference?: string } });
  }
}
