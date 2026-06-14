import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoinPackageDto } from './dto/create-coin-package.dto';
import { UpdateCoinPackageDto } from './dto/update-coin-package.dto';

@Injectable()
export class CoinPackagesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCoinPackageDto) {
    return this.prisma.coinPackage.create({ data: dto });
  }

  findAdmin() {
    return this.prisma.coinPackage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findPublic() {
    return this.prisma.coinPackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateCoinPackageDto) {
    await this.ensureExists(id);
    return this.prisma.coinPackage.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.coinPackage.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const coinPackage = await this.prisma.coinPackage.findUnique({
      where: { id },
    });

    if (!coinPackage) {
      throw new NotFoundException('Coin package not found');
    }
  }
}
