import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CompetitionsService } from './competitions.service';

describe('CompetitionsService', () => {
  let service: CompetitionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompetitionsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<CompetitionsService>(CompetitionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
