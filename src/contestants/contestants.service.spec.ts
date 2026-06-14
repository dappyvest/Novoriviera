import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ContestantsService } from './contestants.service';

describe('ContestantsService', () => {
  let service: ContestantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContestantsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ContestantsService>(ContestantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
