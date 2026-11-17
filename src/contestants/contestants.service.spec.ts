import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ContestantsService } from './contestants.service';

describe('ContestantsService', () => {
  let service: ContestantsService;
  const contestantFindUnique = jest.fn();
  const contestantUpdate = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContestantsService,
        {
          provide: PrismaService,
          useValue: {
            contestant: {
              findUnique: contestantFindUnique,
              update: contestantUpdate,
            },
          },
        },
      ],
    }).compile();

    service = module.get<ContestantsService>(ContestantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('updates the photo for the contestant owned by the current user', async () => {
    contestantFindUnique.mockResolvedValue({ id: 'contestant-1' });
    contestantUpdate.mockResolvedValue({
      id: 'contestant-1',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/photo.jpg',
    });
    const dto = {
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/photo.jpg',
      photoPublicId: 'novorivera/photo',
      photoMeta: { width: 800, height: 800 },
    };

    await expect(
      service.updateMyPhoto('user-1', 'competition-1', dto),
    ).resolves.toMatchObject({ id: 'contestant-1', photoUrl: dto.photoUrl });
    expect(contestantFindUnique).toHaveBeenCalledWith({
      where: {
        competitionId_userId: {
          competitionId: 'competition-1',
          userId: 'user-1',
        },
      },
      select: { id: true },
    });
    expect(contestantUpdate).toHaveBeenCalledWith({
      where: { id: 'contestant-1' },
      data: dto,
    });
  });

  it('does not update a contestant owned by another user', async () => {
    contestantFindUnique.mockResolvedValue(null);

    await expect(
      service.updateMyPhoto('other-user', 'competition-1', {
        photoUrl: 'https://res.cloudinary.com/demo/image/upload/photo.jpg',
        photoPublicId: 'novorivera/photo',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(contestantUpdate).not.toHaveBeenCalled();
  });
});
