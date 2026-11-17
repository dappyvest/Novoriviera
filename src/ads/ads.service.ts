import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SponsoredAdDestinationType,
  SponsoredAdPlacement,
  SponsoredAdStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSponsoredAdDto } from './dto/create-sponsored-ad.dto';
import { UpdateSponsoredAdDto } from './dto/update-sponsored-ad.dto';

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSponsoredAdDto) {
    return this.prisma.sponsoredAd.create({
      data: this.mapCreateAdData(dto),
    }).then((ad) => this.withAnalytics(ad));
  }

  async findAdmin() {
    const ads = await this.prisma.sponsoredAd.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return ads.map((ad) => this.withAnalytics(ad));
  }

  async findOne(id: string) {
    const ad = await this.prisma.sponsoredAd.findUnique({
      where: { id },
    });

    if (!ad) {
      throw new NotFoundException('Sponsored ad not found');
    }

    return this.withAnalytics(ad);
  }

  async findPublic(placement?: SponsoredAdPlacement) {
    const now = new Date();
    const ads = await this.prisma.sponsoredAd.findMany({
      where: {
        status: SponsoredAdStatus.ACTIVE,
        ...(placement
          ? {
              OR: [
                { placement },
                { placements: { has: placement } },
              ],
            }
          : {}),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return ads.map((ad) => this.withAnalytics(ad));
  }

  async update(id: string, dto: UpdateSponsoredAdDto) {
    await this.findOne(id);
    const updated = await this.prisma.sponsoredAd.update({
      where: { id },
      data: this.mapUpdateAdData(dto),
    });
    return this.withAnalytics(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.prisma.sponsoredAd.delete({ where: { id } });
    return this.withAnalytics(deleted);
  }

  async trackClick(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.sponsoredAd.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
    return this.withAnalytics(updated);
  }

  async trackImpression(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.sponsoredAd.update({
      where: { id },
      data: { impressions: { increment: 1 } },
    });
    return this.withAnalytics(updated);
  }

  private mapCreateAdData(
    dto: CreateSponsoredAdDto,
  ): Prisma.SponsoredAdUncheckedCreateInput {
    const placements = this.resolvePlacements(dto.placement, dto.placements);
    const destination = this.resolveDestination({
      destinationType: dto.destinationType,
      destinationValue: dto.destinationValue,
      targetUrl: dto.targetUrl,
      whatsappUrl: dto.whatsappUrl,
      socialUrl: dto.socialUrl,
    });

    return {
      title: dto.title,
      productName: dto.productName,
      description: dto.description,
      imageUrl: dto.imageUrl,
      videoUrl: dto.videoUrl,
      videoPublicId: dto.videoPublicId,
      targetUrl: destination.targetUrl,
      whatsappUrl: destination.whatsappUrl,
      socialUrl: destination.socialUrl,
      placement: placements[0],
      placements,
      destinationType: destination.destinationType,
      destinationValue: destination.destinationValue,
      buttonText: dto.buttonText,
      status: dto.status,
      sortOrder: dto.sortOrder,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    };
  }

  private mapUpdateAdData(
    dto: UpdateSponsoredAdDto,
  ): Prisma.SponsoredAdUncheckedUpdateInput {
    const destination =
      dto.destinationType !== undefined ||
      dto.destinationValue !== undefined ||
      dto.targetUrl !== undefined ||
      dto.whatsappUrl !== undefined ||
      dto.socialUrl !== undefined
        ? this.resolveDestination({
            destinationType: dto.destinationType,
            destinationValue: dto.destinationValue ?? undefined,
            targetUrl: dto.targetUrl ?? undefined,
            whatsappUrl: dto.whatsappUrl ?? undefined,
            socialUrl: dto.socialUrl ?? undefined,
          })
        : undefined;
    const placements =
      dto.placement !== undefined || dto.placements !== undefined
        ? this.resolvePlacements(dto.placement, dto.placements)
        : undefined;

    return {
      ...dto,
      ...(placements
        ? { placement: placements[0], placements }
        : { placement: undefined, placements: undefined }),
      ...(destination ?? {}),
      startsAt:
        dto.startsAt === null
          ? null
          : dto.startsAt
            ? new Date(dto.startsAt)
            : undefined,
      endsAt:
        dto.endsAt === null
          ? null
          : dto.endsAt
            ? new Date(dto.endsAt)
            : undefined,
    };
  }

  private resolvePlacements(
    placement?: SponsoredAdPlacement,
    placements?: SponsoredAdPlacement[],
  ) {
    const resolved = [...new Set(placements?.length ? placements : placement ? [placement] : [])];

    if (!resolved.length) {
      throw new BadRequestException(
        'Select at least one ad placement: HOME_TOP, HOME_MIDDLE, LEADERBOARD, COMPETITION_PAGE, or CONTESTANT_PAGE',
      );
    }

    return resolved;
  }

  private resolveDestination(input: {
    destinationType?: SponsoredAdDestinationType;
    destinationValue?: string;
    targetUrl?: string | null;
    whatsappUrl?: string | null;
    socialUrl?: string | null;
  }) {
    const legacyValue =
      input.targetUrl ?? input.whatsappUrl ?? input.socialUrl ?? undefined;
    const destinationValue = input.destinationValue ?? legacyValue;
    const destinationType =
      input.destinationType ??
      (input.whatsappUrl
        ? SponsoredAdDestinationType.WHATSAPP
        : input.socialUrl
          ? this.inferSocialDestinationType(input.socialUrl)
          : SponsoredAdDestinationType.WEBSITE);
    const resolvedUrl = destinationValue
      ? this.resolveDestinationUrl(destinationType, destinationValue)
      : legacyValue;

    return {
      destinationType,
      destinationValue,
      targetUrl:
        resolvedUrl ??
        input.targetUrl ??
        undefined,
      whatsappUrl:
        destinationType === SponsoredAdDestinationType.WHATSAPP
          ? resolvedUrl
          : input.whatsappUrl ?? undefined,
      socialUrl:
        this.isSocialDestination(destinationType)
          ? resolvedUrl
          : input.socialUrl ?? undefined,
    };
  }

  private isSocialDestination(destinationType: SponsoredAdDestinationType) {
    return new Set<SponsoredAdDestinationType>([
      SponsoredAdDestinationType.FACEBOOK,
      SponsoredAdDestinationType.INSTAGRAM,
      SponsoredAdDestinationType.TIKTOK,
      SponsoredAdDestinationType.YOUTUBE,
      SponsoredAdDestinationType.OTHER,
    ]).has(destinationType);
  }

  private inferSocialDestinationType(value: string) {
    const lower = value.toLowerCase();
    if (lower.includes('facebook')) return SponsoredAdDestinationType.FACEBOOK;
    if (lower.includes('instagram')) return SponsoredAdDestinationType.INSTAGRAM;
    if (lower.includes('tiktok')) return SponsoredAdDestinationType.TIKTOK;
    if (lower.includes('youtube') || lower.includes('youtu.be')) {
      return SponsoredAdDestinationType.YOUTUBE;
    }
    return SponsoredAdDestinationType.OTHER;
  }

  private resolveDestinationUrl(
    destinationType: SponsoredAdDestinationType,
    value: string,
  ) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    if (destinationType === SponsoredAdDestinationType.WHATSAPP) {
      const digits = trimmed.replace(/\D/g, '');
      const normalized = digits.startsWith('0')
        ? `234${digits.slice(1)}`
        : digits.startsWith('234')
          ? digits
          : digits;
      return normalized ? `https://wa.me/${normalized}` : undefined;
    }

    return trimmed;
  }

  private withAnalytics<T extends {
    clicks: number;
    impressions: number;
    placement: SponsoredAdPlacement;
    placements?: SponsoredAdPlacement[] | null;
    sortOrder: number;
  }>(ad: T) {
    const ctr =
      ad.impressions > 0
        ? Number(((ad.clicks / ad.impressions) * 100).toFixed(2))
        : 0;

    return {
      ...ad,
      placements: ad.placements?.length ? ad.placements : [ad.placement],
      ctr,
      displayPriority: ad.sortOrder,
    };
  }
}
