import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { createReadStream, promises as fs } from 'fs';
import { Readable } from 'stream';

type UploadedFile = {
  buffer?: Buffer;
  mimetype: string;
  originalname: string;
  path?: string;
  size: number;
};

type UploadKind = 'image' | 'video';
type UploadResourceType = 'image' | 'video';

const supportedVideoMimeTypes = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
  'video/3gpp',
]);

const supportedPaymentProofMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const supportedPaymentProofExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly configService: ConfigService) {}

  async upload(file: UploadedFile | undefined, kind: UploadKind) {
    if (!file) {
      throw new BadRequestException(
        `File is required in the multipart/form-data field named "file"`,
      );
    }

    try {
      const isValidMime =
        kind === 'video'
          ? supportedVideoMimeTypes.has(file.mimetype)
          : file.mimetype.startsWith('image/');

      if (!isValidMime) {
        throw new BadRequestException(
          kind === 'video'
            ? 'Unsupported video format. Use MP4, MOV, WebM, AVI, MKV, or 3GP'
            : 'Only image uploads are allowed',
        );
      }

      const folder =
        this.configService.get<string>('CLOUDINARY_UPLOAD_FOLDER') ??
        'novorivera';
      return await this.uploadToCloudinary(file, kind, folder, kind);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cloudinary ${kind} upload failed name=${file.originalname} size=${file.size} mimetype=${file.mimetype}: ${message}`,
      );
      throw new BadGatewayException(
        `${kind === 'video' ? 'Video' : 'Image'} upload service failed. Please try again`,
      );
    } finally {
      if (file.path) {
        await fs.unlink(file.path).catch((cleanupError: unknown) => {
          this.logger.warn(
            `Could not remove temporary upload ${file.path}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
          );
        });
      }
    }
  }

  async uploadPaymentProof(file: UploadedFile | undefined) {
    if (!file) {
      throw new BadRequestException(
        `File is required in the multipart/form-data field named "file"`,
      );
    }

    try {
      const extension = this.getFileExtension(file.originalname);
      const isValidProof =
        supportedPaymentProofMimeTypes.has(file.mimetype) &&
        supportedPaymentProofExtensions.has(extension);

      if (!isValidProof) {
        throw new BadRequestException(
          'Invalid payment proof file type. Upload a JPG, JPEG, PNG, or WebP image',
        );
      }

      const result = await this.uploadToCloudinary(
        file,
        'payment proof',
        'novoriviera/payment-proofs',
        'image',
      );

      return {
        secureUrl: result.secureUrl,
        publicId: result.publicId,
        resourceType: result.resourceType,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cloudinary payment proof upload failed name=${file.originalname} size=${file.size} mimetype=${file.mimetype}: ${message}`,
      );
      throw new BadGatewayException(
        'Payment proof upload service failed. Please try again',
      );
    } finally {
      if (file.path) {
        await fs.unlink(file.path).catch((cleanupError: unknown) => {
          this.logger.warn(
            `Could not remove temporary upload ${file.path}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
          );
        });
      }
    }
  }

  private async uploadToCloudinary(
    file: UploadedFile,
    label: string,
    folder: string,
    resourceType: UploadResourceType,
  ) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException('Cloudinary is not configured');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    this.logger.log(
      `Cloudinary upload starting resourceType=${resourceType} label=${label} size=${file.size} mimetype=${file.mimetype}`,
    );

    const source = file.path
      ? createReadStream(file.path)
      : Readable.from(file.buffer ?? Buffer.alloc(0));
    const result = await this.uploadStream(source, folder, resourceType);

    this.logger.log(
      `Cloudinary upload succeeded publicId=${result.public_id} resourceType=${result.resource_type} bytes=${result.bytes}`,
    );

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      duration: result.duration,
    };
  }

  private getFileExtension(filename: string) {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : '';
  }

  private uploadStream(
    source: Readable,
    folder: string,
    resourceType: UploadResourceType,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const destination = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result?.secure_url || !result.public_id) {
            reject(new Error('Cloudinary returned an incomplete response'));
          } else {
            resolve(result);
          }
        },
      );

      source.on('error', reject);
      source.pipe(destination);
    });
  }
}
