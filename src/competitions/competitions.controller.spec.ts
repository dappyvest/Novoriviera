import { Test, TestingModule } from '@nestjs/testing';
import { ContestantsService } from '../contestants/contestants.service';
import { StagesService } from '../stages/stages.service';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';

describe('CompetitionsController', () => {
  let controller: CompetitionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionsController],
      providers: [
        { provide: CompetitionsService, useValue: {} },
        { provide: StagesService, useValue: {} },
        { provide: ContestantsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CompetitionsController>(CompetitionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
