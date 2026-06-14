import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactMessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContactMessageDto,
  UpdateContactMessageStatusDto,
} from './dto/contact-message.dto';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import { UpdateHomepageDto } from './dto/homepage.dto';
import { UpdateRulesDto } from './dto/rules.dto';
import { UpdateSiteSettingsDto } from './dto/site-settings.dto';
import { CreateSponsorDto, UpdateSponsorDto } from './dto/sponsor.dto';

const SINGLETON_KEY = 'default';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSiteSettings() {
    return (
      (await this.prisma.siteSettings.findUnique({
        where: { singletonKey: SINGLETON_KEY },
      })) ??
      this.prisma.siteSettings.create({
        data: {
          singletonKey: SINGLETON_KEY,
          siteName: 'NovoRivera',
          siteTagline: 'Online competition platform',
          aboutTitle: 'About NovoRivera',
          aboutContent: 'NovoRivera helps competitions run online.',
          contactEmail: 'hello@novorivera.com',
          contactPhone: '',
          whatsappNumber: '',
          facebookUrl: '',
          instagramUrl: '',
          tiktokUrl: '',
          youtubeUrl: '',
        },
      })
    );
  }

  async updateSiteSettings(dto: UpdateSiteSettingsDto, actorId: string) {
    await this.getSiteSettings();
    const settings = await this.prisma.siteSettings.update({
      where: { singletonKey: SINGLETON_KEY },
      data: dto,
    });
    await this.audit(actorId, 'SITE_SETTINGS_UPDATE', 'SiteSettings', settings.id, { ...dto });
    return settings;
  }

  async getHomepage() {
    return (
      (await this.prisma.homepageContent.findUnique({
        where: { singletonKey: SINGLETON_KEY },
      })) ??
      this.prisma.homepageContent.create({
        data: {
          singletonKey: SINGLETON_KEY,
          heroTitle: 'Discover NovoRivera',
          heroSubtitle: 'Join, compete, and vote online.',
          primaryCtaText: 'View Competitions',
          primaryCtaUrl: '/competitions',
          announcementIsActive: false,
        },
      })
    );
  }

  async updateHomepage(dto: UpdateHomepageDto, actorId: string) {
    await this.getHomepage();
    const homepage = await this.prisma.homepageContent.update({
      where: { singletonKey: SINGLETON_KEY },
      data: dto,
    });
    await this.audit(actorId, 'HOMEPAGE_UPDATE', 'HomepageContent', homepage.id, { ...dto });
    return homepage;
  }

  async getRules() {
    return (
      (await this.prisma.competitionRules.findUnique({
        where: { singletonKey: SINGLETON_KEY },
      })) ??
      this.prisma.competitionRules.create({
        data: {
          singletonKey: SINGLETON_KEY,
          title: 'Competition Rules',
          content: 'Rules will be published soon.',
          isActive: true,
        },
      })
    );
  }

  async updateRules(dto: UpdateRulesDto, actorId: string) {
    await this.getRules();
    const rules = await this.prisma.competitionRules.update({
      where: { singletonKey: SINGLETON_KEY },
      data: dto,
    });
    await this.audit(actorId, 'RULES_UPDATE', 'CompetitionRules', rules.id, { ...dto });
    return rules;
  }

  findPublicFaqs() {
    return this.prisma.faq.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findAdminFaqs() {
    return this.prisma.faq.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createFaq(dto: CreateFaqDto, actorId: string) {
    const faq = await this.prisma.faq.create({ data: dto });
    await this.audit(actorId, 'FAQ_CREATE', 'Faq', faq.id, { ...dto });
    return faq;
  }

  async updateFaq(id: string, dto: UpdateFaqDto, actorId: string) {
    await this.ensureFaq(id);
    const faq = await this.prisma.faq.update({ where: { id }, data: dto });
    await this.audit(actorId, 'FAQ_UPDATE', 'Faq', id, { ...dto });
    return faq;
  }

  async deleteFaq(id: string, actorId: string) {
    await this.ensureFaq(id);
    const faq = await this.prisma.faq.delete({ where: { id } });
    await this.audit(actorId, 'FAQ_DELETE', 'Faq', id);
    return faq;
  }

  findPublicSponsors() {
    return this.prisma.sponsor.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findAdminSponsors() {
    return this.prisma.sponsor.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createSponsor(dto: CreateSponsorDto, actorId: string) {
    const sponsor = await this.prisma.sponsor.create({ data: dto });
    await this.audit(actorId, 'SPONSOR_CREATE', 'Sponsor', sponsor.id, { ...dto });
    return sponsor;
  }

  async updateSponsor(id: string, dto: UpdateSponsorDto, actorId: string) {
    await this.ensureSponsor(id);
    const sponsor = await this.prisma.sponsor.update({ where: { id }, data: dto });
    await this.audit(actorId, 'SPONSOR_UPDATE', 'Sponsor', id, { ...dto });
    return sponsor;
  }

  async deleteSponsor(id: string, actorId: string) {
    await this.ensureSponsor(id);
    const sponsor = await this.prisma.sponsor.delete({ where: { id } });
    await this.audit(actorId, 'SPONSOR_DELETE', 'Sponsor', id);
    return sponsor;
  }

  createContactMessage(dto: CreateContactMessageDto) {
    return this.prisma.contactMessage.create({ data: dto });
  }

  findContactMessages() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findContactMessage(id: string) {
    const message = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException('Contact message not found');
    }
    return message;
  }

  async updateContactMessageStatus(
    id: string,
    dto: UpdateContactMessageStatusDto,
    actorId: string,
  ) {
    await this.findContactMessage(id);
    const message = await this.prisma.contactMessage.update({
      where: { id },
      data: { status: dto.status },
    });
    await this.audit(actorId, 'CONTACT_MESSAGE_STATUS_UPDATE', 'ContactMessage', id, { ...dto });
    return message;
  }

  private async ensureFaq(id: string) {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }
    return faq;
  }

  private async ensureSponsor(id: string) {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }
    return sponsor;
  }

  private audit(
    actorId: string,
    action: string,
    entity?: string,
    entityId?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.adminAuditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        metadata,
      },
    });
  }
}
