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
});
