import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { InitCoinPurchaseDto } from './dto/init-coin-purchase.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('coin-purchase/init')
  @UseGuards(JwtAuthGuard)
  initCoinPurchase(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InitCoinPurchaseDto,
  ) {
    return this.paymentsService.initCoinPurchase(user.id, user.email, dto);
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  verify(
    @CurrentUser() user: CurrentUserPayload,
    @Param('reference') reference: string,
  ) {
    return this.paymentsService.verifyForUser(user.id, reference);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.findMine(user.id);
  }

  @Post('webhook/paystack')
  webhook(
    @Req() request: { rawBody?: Buffer; body: unknown },
    @Headers('x-paystack-signature') signature?: string,
  ) {
    this.paymentsService.verifyPaystackSignature(
      request.rawBody,
      signature,
      request.body,
    );
    return this.paymentsService.handlePaystackWebhook(
      request.body as {
        event?: string;
        data?: { reference?: string; status?: string };
      },
    );
  }
}
