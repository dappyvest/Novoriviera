import { Controller, Get } from '@nestjs/common';
import { CoinPackagesService } from './coin-packages.service';

@Controller('coin-packages')
export class CoinPackagesController {
  constructor(private readonly coinPackagesService: CoinPackagesService) {}

  @Get()
  findPublic() {
    return this.coinPackagesService.findPublic();
  }
}
