import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { CmsService } from './cms.service';
import { UpdateContactMessageStatusDto } from './dto/contact-message.dto';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import { UpdateHomepageDto } from './dto/homepage.dto';
import { UpdateRulesDto } from './dto/rules.dto';
import { UpdateSiteSettingsDto } from './dto/site-settings.dto';
import { CreateSponsorDto, UpdateSponsorDto } from './dto/sponsor.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminCmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('site-settings')
  getSiteSettings() {
    return this.cmsService.getSiteSettings();
  }

  @Patch('site-settings')
  updateSiteSettings(
    @Body() dto: UpdateSiteSettingsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cmsService.updateSiteSettings(dto, user.id);
  }

  @Get('homepage')
  getHomepage() {
    return this.cmsService.getHomepage();
  }

  @Patch('homepage')
  updateHomepage(
    @Body() dto: UpdateHomepageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cmsService.updateHomepage(dto, user.id);
  }

  @Post('faqs')
  createFaq(@Body() dto: CreateFaqDto, @CurrentUser() user: CurrentUserPayload) {
    return this.cmsService.createFaq(dto, user.id);
  }

  @Get('faqs')
  findFaqs() {
    return this.cmsService.findAdminFaqs();
  }

  @Patch('faqs/:id')
  updateFaq(
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cmsService.updateFaq(id, dto, user.id);
  }

  @Delete('faqs/:id')
  deleteFaq(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.cmsService.deleteFaq(id, user.id);
  }

  @Post('sponsors')
  createSponsor(
    @Body() dto: CreateSponsorDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cmsService.createSponsor(dto, user.id);
  }

  @Get('sponsors')
  findSponsors() {
    return this.cmsService.findAdminSponsors();
  }

  @Patch('sponsors/:id')
  updateSponsor(
    @Param('id') id: string,
    @Body() dto: UpdateSponsorDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cmsService.updateSponsor(id, dto, user.id);
  }

  @Delete('sponsors/:id')
  deleteSponsor(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.cmsService.deleteSponsor(id, user.id);
  }

  @Get('rules')
  getRules() {
    return this.cmsService.getRules();
  }

  @Patch('rules')
  updateRules(
    @Body() dto: UpdateRulesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cmsService.updateRules(dto, user.id);
  }

  @Get('contact-messages')
  findContactMessages() {
    return this.cmsService.findContactMessages();
  }

  @Get('contact-messages/:id')
  findContactMessage(@Param('id') id: string) {
    return this.cmsService.findContactMessage(id);
  }

  @Patch('contact-messages/:id/status')
  updateContactMessageStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContactMessageStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cmsService.updateContactMessageStatus(id, dto, user.id);
  }
}
