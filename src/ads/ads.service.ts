import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
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
    });
  }

  findAdmin() {
    return this.prisma.sponsoredAd.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const ad = await this.prisma.sponsoredAd.findUnique({
      where: { id },
    });

    if (!ad) {
      throw new NotFoundException('Sponsored ad not found');
    }

    return ad;
  }

  findPublic(placement?: SponsoredAdPlacement) {
    const now = new Date();
    return this.prisma.sponsoredAd.findMany({
      where: {
        status: SponsoredAdStatus.ACTIVE,
        ...(placement ? { placement } : {}),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateSponsoredAdDto) {
    await this.findOne(id);
    return this.prisma.sponsoredAd.update({
      where: { id },
      data: this.mapUpdateAdData(dto),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sponsoredAd.delete({ where: { id } });
  }

  async trackClick(id: string) {
    await this.findOne(id);
    return this.prisma.sponsoredAd.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
  }

  async trackImpression(id: string) {
    await this.findOne(id);
    return this.prisma.sponsoredAd.update({
      where: { id },
      data: { impressions: { increment: 1 } },
    });
  }

  private mapCreateAdData(
    dto: CreateSponsoredAdDto,
  ): Prisma.SponsoredAdUncheckedCreateInput {
    return {
      title: dto.title,
      productName: dto.productName,
      description: dto.description,
      imageUrl: dto.imageUrl,
      videoUrl: dto.videoUrl,
      videoPublicId: dto.videoPublicId,
      targetUrl: dto.targetUrl,
      whatsappUrl: dto.whatsappUrl,
      socialUrl: dto.socialUrl,
      placement: dto.placement,
      status: dto.status,
      sortOrder: dto.sortOrder,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    };
  }

  private mapUpdateAdData(
    dto: UpdateSponsoredAdDto,
  ): Prisma.SponsoredAdUncheckedUpdateInput {
    return {
      ...dto,
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
}
