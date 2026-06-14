import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.walletService.findMine(user.id);
  }

  @Get('me/transactions')
  transactions(@CurrentUser() user: CurrentUserPayload) {
    return this.walletService.findMyTransactions(user.id);
  }
}
