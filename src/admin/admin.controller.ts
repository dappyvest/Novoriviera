import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdsService } from '../ads/ads.service';
import { CreateSponsoredAdDto } from '../ads/dto/create-sponsored-ad.dto';
import { UpdateSponsoredAdDto } from '../ads/dto/update-sponsored-ad.dto';
import { CoinPackagesService } from '../coin-packages/coin-packages.service';
import { CreateCoinPackageDto } from '../coin-packages/dto/create-coin-package.dto';
import { UpdateCoinPackageDto } from '../coin-packages/dto/update-coin-package.dto';
import { CompetitionsService } from '../competitions/competitions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { ContestantsService } from '../contestants/contestants.service';
import { UpdateEngagementDto } from '../contestants/dto/update-engagement.dto';
import { UpdateContestantPremiumDto } from '../contestants/dto/update-contestant-premium.dto';
import { UpdateContestantStatusDto } from '../contestants/dto/update-contestant-status.dto';
import { SubmissionsService } from '../submissions/submissions.service';
import { PaymentsService } from '../payments/payments.service';
import { UpdateSubmissionStatusDto } from '../submissions/dto/update-submission-status.dto';
import { UpdateSubmissionYoutubeDto } from '../submissions/dto/update-submission-youtube.dto';
import { VotesService } from '../votes/votes.service';
import { AdjustWalletDto } from '../wallet/dto/adjust-wallet.dto';
import { WalletService } from '../wallet/wallet.service';
import { AdminService } from './admin.service';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adsService: AdsService,
    private readonly coinPackagesService: CoinPackagesService,
    private readonly competitionsService: CompetitionsService,
    private readonly contestantsService: ContestantsService,
    private readonly paymentsService: PaymentsService,
    private readonly submissionsService: SubmissionsService,
    private readonly votesService: VotesService,
    private readonly walletService: WalletService,
  ) {}

  @Post('ads')
  async createAd(
    @Body() dto: CreateSponsoredAdDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const ad = await this.adsService.create(dto);
    await this.adminService.createAuditLog({
      actorId: user.id,
      action: 'SPONSORED_AD_CREATE',
      entity: 'SponsoredAd',
      entityId: ad.id,
      metadata: { ...dto },
    });
    return ad;
  }

  @Get('ads')
  findAds() {
    return this.adsService.findAdmin();
  }

  @Get('ads/:id')
  findAd(@Param('id') id: string) {
    return this.adsService.findOne(id);
  }

  @Patch('ads/:id')
  async updateAd(
    @Param('id') id: string,
    @Body() dto: UpdateSponsoredAdDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const ad = await this.adsService.update(id, dto);
    await this.adminService.createAuditLog({
      actorId: user.id,
      action: 'SPONSORED_AD_UPDATE',
      entity: 'SponsoredAd',
      entityId: id,
      metadata: { ...dto },
    });
    return ad;
  }

  @Delete('ads/:id')
  async deleteAd(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const ad = await this.adsService.remove(id);
    await this.adminService.createAuditLog({
      actorId: user.id,
      action: 'SPONSORED_AD_DELETE',
      entity: 'SponsoredAd',
      entityId: id,
    });
    return ad;
  }

  @Post('coin-packages')
  async createCoinPackage(
    @Body() dto: CreateCoinPackageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const coinPackage = await this.coinPackagesService.create(dto);
    await this.adminService.createAuditLog({
      actorId: user.id,
      action: 'COIN_PACKAGE_CREATE',
      entity: 'CoinPackage',
      entityId: coinPackage.id,
      metadata: { ...dto },
    });
    return coinPackage;
  }

  @Get('coin-packages')
  findCoinPackages() {
    return this.coinPackagesService.findAdmin();
  }

  @Patch('coin-packages/:id')
  async updateCoinPackage(
    @Param('id') id: string,
    @Body() dto: UpdateCoinPackageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const coinPackage = await this.coinPackagesService.update(id, dto);
    await this.adminService.createAuditLog({
      actorId: user.id,
      action: 'COIN_PACKAGE_UPDATE',
      entity: 'CoinPackage',
      entityId: id,
      metadata: { ...dto },
    });
    return coinPackage;
  }

  @Delete('coin-packages/:id')
  async deleteCoinPackage(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const coinPackage = await this.coinPackagesService.remove(id);
    await this.adminService.createAuditLog({
      actorId: user.id,
      action: 'COIN_PACKAGE_DELETE',
      entity: 'CoinPackage',
      entityId: id,
    });
    return coinPackage;
  }

  @Get('users')
  async findUsers() {
    return {
      users: await this.adminService.findUsers(),
    };
  }

  @Get('audit-logs')
  findAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    return this.adminService.findAuditLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      action,
    });
  }

  @Get('exports/contestants.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="contestants.csv"')
  exportContestants() {
    return this.adminService.exportContestantsCsv();
  }

  @Get('exports/payments.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="payments.csv"')
  exportPayments() {
    return this.adminService.exportPaymentsCsv();
  }

  @Get('exports/votes.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="votes.csv"')
  exportVotes() {
    return this.adminService.exportVotesCsv();
  }

  @Get('users/:id')
  async findUser(@Param('id') id: string) {
    return {
      user: await this.adminService.findUser(id),
    };
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return {
      user: await this.adminService.updateUserStatus(
        id,
        updateUserStatusDto.isActive,
      ),
    };
  }

  @Patch('users/:id/password')
  resetUserPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.adminService.resetUserPassword(id, dto.newPassword, actor.id);
  }

  @Get('contestants')
  findContestants() {
    return this.contestantsService.findAll();
  }

  @Get('contestants/:id')
  findContestant(@Param('id') id: string) {
    return this.contestantsService.findOne(id);
  }

  @Patch('contestants/:id/status')
  updateContestantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContestantStatusDto,
  ) {
    return this.contestantsService.updateStatus(id, dto.status);
  }

  @Delete('contestants/:id')
  removeContestant(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.contestantsService.removeFromPublic(id, user.id);
  }

  @Patch('contestants/:id/premium')
  updateContestantPremium(
    @Param('id') id: string,
    @Body() dto: UpdateContestantPremiumDto,
  ) {
    return this.contestantsService.updatePremium(id, dto);
  }

  @Post('contestants/:contestantId/engagement')
  updateEngagement(
    @Param('contestantId') contestantId: string,
    @Body() dto: UpdateEngagementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.contestantsService.updateEngagement(contestantId, dto, user.id);
  }

  @Get('votes')
  findVotes() {
    return this.votesService.findAll();
  }

  @Get('payments')
  findPayments() {
    return this.paymentsService.findAll();
  }

  @Get('wallets')
  findWallets() {
    return this.walletService.findAllWallets();
  }

  @Get('wallets/:userId')
  findWallet(@Param('userId') userId: string) {
    return this.walletService.findByUser(userId);
  }

  @Post('wallets/:userId/adjust')
  adjustWallet(
    @Param('userId') userId: string,
    @Body() dto: AdjustWalletDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.walletService.adjustWallet(
      userId,
      dto.amount,
      dto.reason,
      user.id,
    );
  }

  @Post('competitions/:id/reset')
  resetCompetition(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.competitionsService.reset(id, user.id);
  }

  @Post('competitions/:id/reset-votes')
  resetCompetitionVotes(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.competitionsService.resetVotes(id, user.id);
  }

  @Get('submissions')
  findSubmissions() {
    return this.submissionsService.findAll();
  }

  @Patch('submissions/:id/status')
  updateSubmissionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionStatusDto,
  ) {
    return this.submissionsService.updateStatus(id, dto);
  }

  @Patch('submissions/:id/youtube')
  updateSubmissionYoutube(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionYoutubeDto,
  ) {
    return this.submissionsService.updateYoutube(id, dto);
  }

  @Delete('submissions/:id')
  deleteSubmission(@Param('id') id: string) {
    return this.submissionsService.remove(id);
  }
}
