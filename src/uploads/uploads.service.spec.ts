import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Writable } from 'stream';
import { UploadsService } from './uploads.service';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload_stream: jest.fn() },
  },
}));

describe('UploadsService', () => {
  const config: Record<string, string> = {
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
    CLOUDINARY_UPLOAD_FOLDER: 'test-folder',
  };
  const configService = {
    get: jest.fn((key: string) => config[key]),
  } as unknown as ConfigService;
  const uploadStreamMock = cloudinary.uploader.upload_stream as jest.Mock;
  let service: UploadsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UploadsService(configService);
  });

  it('streams videos with resource_type video', async () => {
    uploadStreamMock.mockImplementation(
      (
        _options: unknown,
        callback: (error: undefined, result: Record<string, unknown>) => void,
      ) =>
        new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
          final(done) {
            callback(undefined, {
              secure_url: 'https://res.cloudinary.com/test/video.mp4',
              public_id: 'test-folder/video',
              resource_type: 'video',
              format: 'mp4',
              bytes: 12,
            });
            done();
          },
        }),
    );

    const result = await service.upload(
      {
        buffer: Buffer.from('video-bytes'),
        mimetype: 'video/mp4',
        originalname: 'video.mp4',
        size: 11,
      },
      'video',
    );

    expect(uploadStreamMock).toHaveBeenCalledWith(
      { folder: 'test-folder', resource_type: 'video' },
      expect.any(Function),
    );
    expect(result).toMatchObject({
      publicId: 'test-folder/video',
      resourceType: 'video',
    });
  });

  it('returns a friendly bad request for an unsupported video format', async () => {
    await expect(
      service.upload(
        {
          buffer: Buffer.from('not-video'),
          mimetype: 'application/octet-stream',
          originalname: 'video.bin',
          size: 9,
        },
        'video',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadStreamMock).not.toHaveBeenCalled();
  });

  it('converts Cloudinary failures to a JSON-compatible 502 exception', async () => {
    uploadStreamMock.mockImplementation(
      (_options: unknown, callback: (error: Error) => void) =>
        new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
          final(done) {
            callback(new Error('upstream timeout'));
            done();
          },
        }),
    );

    await expect(
      service.upload(
        {
          buffer: Buffer.from('video-bytes'),
          mimetype: 'video/webm',
          originalname: 'video.webm',
          size: 11,
        },
        'video',
      ),
    ).rejects.toMatchObject<Partial<BadGatewayException>>({
      message: 'Video upload service failed. Please try again',
    });
  });

  it('uploads payment proofs to the fixed Cloudinary folder', async () => {
    uploadStreamMock.mockImplementation(
      (
        _options: unknown,
        callback: (error: undefined, result: Record<string, unknown>) => void,
      ) =>
        new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
          final(done) {
            callback(undefined, {
              secure_url: 'https://res.cloudinary.com/test/proof.jpg',
              public_id: 'novoriviera/payment-proofs/proof',
              resource_type: 'image',
              format: 'jpg',
              bytes: 42,
            });
            done();
          },
        }),
    );

    const result = await service.uploadPaymentProof({
      buffer: Buffer.from('proof-bytes'),
      mimetype: 'image/jpeg',
      originalname: 'proof.jpg',
      size: 11,
    });

    expect(uploadStreamMock).toHaveBeenCalledWith(
      {
        folder: 'novoriviera/payment-proofs',
        resource_type: 'image',
      },
      expect.any(Function),
    );
    expect(result).toEqual({
      secureUrl: 'https://res.cloudinary.com/test/proof.jpg',
      publicId: 'novoriviera/payment-proofs/proof',
      resourceType: 'image',
      format: 'jpg',
      bytes: 42,
    });
  });

  it('uploads registration images to the fixed public registration folder', async () => {
    uploadStreamMock.mockImplementation(
      (
        _options: unknown,
        callback: (error: undefined, result: Record<string, unknown>) => void,
      ) =>
        new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
          final(done) {
            callback(undefined, {
              secure_url:
                'https://res.cloudinary.com/test/registration/photo.webp',
              public_id: 'novoriviera/registration-images/photo',
              resource_type: 'image',
              format: 'webp',
              bytes: 24,
            });
            done();
          },
        }),
    );

    const result = await service.uploadRegistrationImage({
      buffer: Buffer.from('image-bytes'),
      mimetype: 'image/webp',
      originalname: 'photo.webp',
      size: 11,
    });

    expect(uploadStreamMock).toHaveBeenCalledWith(
      {
        folder: 'novoriviera/registration-images',
        resource_type: 'image',
      },
      expect.any(Function),
    );
    expect(result).toMatchObject({
      secureUrl: 'https://res.cloudinary.com/test/registration/photo.webp',
      publicId: 'novoriviera/registration-images/photo',
      resourceType: 'image',
      format: 'webp',
      bytes: 24,
    });
  });

  it('uploads registration videos to the fixed public registration folder', async () => {
    uploadStreamMock.mockImplementation(
      (
        _options: unknown,
        callback: (error: undefined, result: Record<string, unknown>) => void,
      ) =>
        new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
          final(done) {
            callback(undefined, {
              secure_url:
                'https://res.cloudinary.com/test/registration/entry.mp4',
              public_id: 'novoriviera/registration-videos/entry',
              resource_type: 'video',
              format: 'mp4',
              bytes: 48,
            });
            done();
          },
        }),
    );

    const result = await service.uploadRegistrationVideo({
      buffer: Buffer.from('video-bytes'),
      mimetype: 'video/mp4',
      originalname: 'entry.mp4',
      size: 11,
    });

    expect(uploadStreamMock).toHaveBeenCalledWith(
      {
        folder: 'novoriviera/registration-videos',
        resource_type: 'video',
      },
      expect.any(Function),
    );
    expect(result).toMatchObject({
      secureUrl: 'https://res.cloudinary.com/test/registration/entry.mp4',
      publicId: 'novoriviera/registration-videos/entry',
      resourceType: 'video',
      format: 'mp4',
      bytes: 48,
    });
  });

  it('rejects unsupported registration image formats', async () => {
    await expect(
      service.uploadRegistrationImage({
        buffer: Buffer.from('gif-bytes'),
        mimetype: 'image/gif',
        originalname: 'photo.gif',
        size: 9,
      }),
    ).rejects.toMatchObject<Partial<BadRequestException>>({
      message:
        'Invalid registration image file type. Upload a JPG, JPEG, PNG, or WebP image',
    });
    expect(uploadStreamMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported registration video formats', async () => {
    await expect(
      service.uploadRegistrationVideo({
        buffer: Buffer.from('video-bytes'),
        mimetype: 'video/mp4',
        originalname: 'entry.mpeg',
        size: 9,
      }),
    ).rejects.toMatchObject<Partial<BadRequestException>>({
      message:
        'Invalid registration video file type. Upload an MP4, MOV, WebM, AVI, MKV, or 3GP video',
    });
    expect(uploadStreamMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported payment proof formats', async () => {
    await expect(
      service.uploadPaymentProof({
        buffer: Buffer.from('gif-bytes'),
        mimetype: 'image/gif',
        originalname: 'proof.gif',
        size: 9,
      }),
    ).rejects.toMatchObject<Partial<BadRequestException>>({
      message:
        'Invalid payment proof file type. Upload a JPG, JPEG, PNG, or WebP image',
    });
    expect(uploadStreamMock).not.toHaveBeenCalled();
  });

  it('converts payment proof Cloudinary failures to a friendly 502', async () => {
    uploadStreamMock.mockImplementation(
      (_options: unknown, callback: (error: Error) => void) =>
        new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
          final(done) {
            callback(new Error('cloudinary unavailable'));
            done();
          },
        }),
    );

    await expect(
      service.uploadPaymentProof({
        buffer: Buffer.from('proof-bytes'),
        mimetype: 'image/png',
        originalname: 'proof.png',
        size: 11,
      }),
    ).rejects.toMatchObject<Partial<BadGatewayException>>({
      message: 'Payment proof upload service failed. Please try again',
    });
  });
});
