import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PublicVotesService } from '../public-votes/public-votes.service';
import { AdminVideoUploadGuard, UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

describe('UploadsController', () => {
  const upload = jest.fn();
  const uploadRegistrationImage = jest.fn();
  const uploadPaymentProof = jest.fn();
  const attachProof = jest.fn();
  const uploadsService = {
    upload,
    uploadRegistrationImage,
    uploadPaymentProof,
  } as unknown as UploadsService;
  const publicVotesService = { attachProof } as unknown as PublicVotesService;
  let controller: UploadsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UploadsController(uploadsService, publicVotesService);
  });

  it('rejects the retired public registration video upload route', () => {
    expect(() => controller.uploadRegistrationVideo()).toThrow(
      new BadRequestException(
        'Registration video-file uploads are retired.',
      ),
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it('keeps authenticated image uploads available', () => {
    const file = {
      buffer: Buffer.from('image'),
      mimetype: 'image/png',
      originalname: 'photo.png',
      size: 5,
    };
    upload.mockReturnValue({ secureUrl: 'https://example.com/photo.png' });

    controller.uploadImage(file);

    expect(upload).toHaveBeenCalledWith(file, 'image');
  });

  it('keeps payment-proof uploads and server-side association available', async () => {
    const file = {
      buffer: Buffer.from('proof'),
      mimetype: 'image/jpeg',
      originalname: 'proof.jpg',
      size: 5,
    };
    const proof = {
      secureUrl: 'https://example.com/proof.jpg',
      publicId: 'proof-id',
      resourceType: 'image',
      format: 'jpg',
      bytes: 5,
    };
    uploadPaymentProof.mockResolvedValue(proof);

    await expect(
      controller.uploadPaymentProof(file, 'payment-reference'),
    ).resolves.toEqual(proof);
    expect(attachProof).toHaveBeenCalledWith('payment-reference', proof);
  });
});

describe('AdminVideoUploadGuard', () => {
  const contextFor = (role: UserRole) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    }) as unknown as ExecutionContext;
  const guard = new AdminVideoUploadGuard();

  it('rejects contestant video-file uploads before upload handling', () => {
    expect(() => guard.canActivate(contextFor(UserRole.CONTESTANT))).toThrow(
      new BadRequestException(
        'Competition video-file uploads are retired.',
      ),
    );
  });

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN])(
    'preserves admin sponsored-ad video uploads for %s',
    (role) => {
      expect(guard.canActivate(contextFor(role))).toBe(true);
    },
  );
});
