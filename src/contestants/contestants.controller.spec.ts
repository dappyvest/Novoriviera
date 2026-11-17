import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from '../submissions/submissions.service';
import { VotesService } from '../votes/votes.service';
import { ContestantsController } from './contestants.controller';
import { ContestantsService } from './contestants.service';

describe('ContestantsController', () => {
  let controller: ContestantsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContestantsController],
      providers: [
        { provide: ContestantsService, useValue: {} },
        { provide: SubmissionsService, useValue: {} },
        { provide: VotesService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ContestantsController>(ContestantsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
