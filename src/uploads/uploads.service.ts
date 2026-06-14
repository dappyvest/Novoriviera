import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type UploadKind = 'image' | 'video';

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  async upload(file: UploadedFile | undefined, kind: UploadKind) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const isValidMime =
      kind === 'video'
        ? file.mimetype.startsWith('video/')
        : file.mimetype.startsWith('image/');

    if (!isValidMime) {
      throw new BadRequestException(`Only ${kind} uploads are allowed`);
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const folder =
      this.configService.get<string>('CLOUDINARY_UPLOAD_FOLDER') ?? 'novorivera';

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException('Cloudinary is not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.signUpload({ folder, timestamp }, apiSecret);
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      file.originalname,
    );
    form.append('api_key', apiKey);
    form.append('timestamp', timestamp);
    form.append('folder', folder);
    form.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${kind}/upload`,
      {
        method: 'POST',
        body: form,
      },
    );
    const body = (await response.json()) as {
      secure_url?: string;
      public_id?: string;
      resource_type?: string;
      format?: string;
      bytes?: number;
      duration?: number;
      error?: { message?: string };
    };

    if (!response.ok || !body.secure_url || !body.public_id) {
      throw new BadRequestException(
        body.error?.message ?? 'Cloudinary upload failed',
      );
    }

    return {
      secureUrl: body.secure_url,
      publicId: body.public_id,
      resourceType: body.resource_type,
      format: body.format,
      bytes: body.bytes,
      duration: body.duration,
    };
  }

  private signUpload(params: Record<string, string>, apiSecret: string) {
    const payload = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
  }
}
