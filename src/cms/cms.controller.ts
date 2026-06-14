import { Body, Controller, Get, Post } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CreateContactMessageDto } from './dto/contact-message.dto';

@Controller()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('site-settings')
  getSiteSettings() {
    return this.cmsService.getSiteSettings();
  }

  @Get('homepage')
  getHomepage() {
    return this.cmsService.getHomepage();
  }

  @Get('faqs')
  getFaqs() {
    return this.cmsService.findPublicFaqs();
  }

  @Get('sponsors')
  getSponsors() {
    return this.cmsService.findPublicSponsors();
  }

  @Get('rules')
  getRules() {
    return this.cmsService.getRules();
  }

  @Post('contact')
  createContactMessage(@Body() dto: CreateContactMessageDto) {
    return this.cmsService.createContactMessage(dto);
  }
}
