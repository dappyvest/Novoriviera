import {
  BadRequestException,
  CallHandler,
  Controller,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { tmpdir } from 'os';
import { Observable, catchError, throwError } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

type UploadedMultipartFile = {
  buffer?: Buffer;
  mimetype: string;
  originalname: string;
  path?: string;
  size: number;
};

const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 100);
const maxVideoUploadSizeMb = Number(
  process.env.MAX_VIDEO_UPLOAD_SIZE_MB ?? 50,
);
const maxPaymentProofUploadSizeMb = Number(
  process.env.MAX_PAYMENT_PROOF_UPLOAD_SIZE_MB ?? 5,
);
const maxRegistrationImageUploadSizeMb = 5;
const maxRegistrationVideoUploadSizeMb = 100;
const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;
const maxVideoUploadSizeBytes = maxVideoUploadSizeMb * 1024 * 1024;
const maxPaymentProofUploadSizeBytes =
  maxPaymentProofUploadSizeMb * 1024 * 1024;
const maxRegistrationImageUploadSizeBytes =
  maxRegistrationImageUploadSizeMb * 1024 * 1024;
const maxRegistrationVideoUploadSizeBytes =
  maxRegistrationVideoUploadSizeMb * 1024 * 1024;
const registrationImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const registrationImageExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);
const registrationVideoMimeTypes = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
  'video/3gpp',
]);
const registrationVideoExtensions = new Set([
  '.mp4',
  '.mov',
  '.webm',
  '.avi',
  '.mkv',
  '.3gp',
]);
const paymentProofMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const paymentProofExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

@Injectable()
export class VideoUploadLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('VideoUpload');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    this.logger.log(
      `Upload started contentLength=${request.headers['content-length'] ?? 'unknown'} contentType=${request.headers['content-type'] ?? 'unknown'}`,
    );

    return next.handle().pipe(
      catchError((error: unknown) => {
        const multerCode = (error as { code?: string })?.code;
        const status = (error as { getStatus?: () => number })?.getStatus?.();
        if (multerCode === 'LIMIT_FILE_SIZE' || status === 413) {
          this.logger.warn(
            `Upload rejected: file exceeds ${maxVideoUploadSizeMb} MB`,
          );
          return throwError(
            () =>
              new PayloadTooLargeException(
                `Video file exceeds the ${maxVideoUploadSizeMb} MB limit`,
              ),
          );
        }

        this.logger.error(
          `Upload request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return throwError(() => error);
      }),
    );
  }
}

@Injectable()
export class RegistrationImageUploadInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        const multerCode = (error as { code?: string })?.code;
        const status = (error as { getStatus?: () => number })?.getStatus?.();

        if (multerCode === 'LIMIT_FILE_SIZE' || status === 413) {
          return throwError(
            () =>
              new PayloadTooLargeException(
                `Registration image exceeds the ${maxRegistrationImageUploadSizeMb} MB limit`,
              ),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}

@Injectable()
export class RegistrationVideoUploadInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RegistrationVideoUpload');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    this.logger.log(
      `Registration video upload started contentLength=${request.headers['content-length'] ?? 'unknown'} contentType=${request.headers['content-type'] ?? 'unknown'}`,
    );

    return next.handle().pipe(
      catchError((error: unknown) => {
        const multerCode = (error as { code?: string })?.code;
        const status = (error as { getStatus?: () => number })?.getStatus?.();

        if (multerCode === 'LIMIT_FILE_SIZE' || status === 413) {
          return throwError(
            () =>
              new PayloadTooLargeException(
                `Registration video exceeds the ${maxRegistrationVideoUploadSizeMb} MB limit`,
              ),
          );
        }

        this.logger.error(
          `Registration video upload request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return throwError(() => error);
      }),
    );
  }
}

@Injectable()
export class PaymentProofUploadInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        const multerCode = (error as { code?: string })?.code;
        const status = (error as { getStatus?: () => number })?.getStatus?.();

        if (multerCode === 'LIMIT_FILE_SIZE' || status === 413) {
          return throwError(
            () =>
              new PayloadTooLargeException(
                `Payment proof image exceeds the ${maxPaymentProofUploadSizeMb} MB limit`,
              ),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  @Post('video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    VideoUploadLoggingInterceptor,
    FileInterceptor('file', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_request, file, callback) =>
          callback(
            null,
            `novorivera-${randomUUID()}${extname(file.originalname)}`,
          ),
      }),
      limits: { fileSize: maxVideoUploadSizeBytes, files: 1 },
    }),
  )
  uploadVideo(@UploadedFile() file: UploadedMultipartFile | undefined) {
    if (file) {
      this.logger.log(
        `Video received name=${file.originalname} size=${file.size} mimetype=${file.mimetype}`,
      );
    }
    return this.uploadsService.upload(file, 'video');
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: maxUploadSizeBytes },
    }),
  )
  uploadImage(@UploadedFile() file: UploadedMultipartFile | undefined) {
    if (file && !file.buffer) {
      throw new BadRequestException('Invalid image upload');
    }
    return this.uploadsService.upload(file, 'image');
  }

  @Post('registration-image')
  @UseInterceptors(
    RegistrationImageUploadInterceptor,
    FileInterceptor('file', {
      limits: { fileSize: maxRegistrationImageUploadSizeBytes, files: 1 },
      fileFilter: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const isValid =
          registrationImageMimeTypes.has(file.mimetype) &&
          registrationImageExtensions.has(extension);

        if (!isValid) {
          callback(
            new BadRequestException(
              'Invalid registration image file type. Upload a JPG, JPEG, PNG, or WebP image',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadRegistrationImage(
    @UploadedFile() file: UploadedMultipartFile | undefined,
  ) {
    if (file && !file.buffer) {
      throw new BadRequestException('Invalid registration image upload');
    }

    return this.uploadsService.uploadRegistrationImage(file);
  }

  @Post('registration-video')
  @UseInterceptors(
    RegistrationVideoUploadInterceptor,
    FileInterceptor('file', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_request, file, callback) =>
          callback(
            null,
            `novorivera-registration-${randomUUID()}${extname(file.originalname)}`,
          ),
      }),
      limits: { fileSize: maxRegistrationVideoUploadSizeBytes, files: 1 },
      fileFilter: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const isValid =
          registrationVideoMimeTypes.has(file.mimetype) &&
          registrationVideoExtensions.has(extension);

        if (!isValid) {
          callback(
            new BadRequestException(
              'Invalid registration video file type. Upload an MP4, MOV, WebM, AVI, MKV, or 3GP video',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadRegistrationVideo(
    @UploadedFile() file: UploadedMultipartFile | undefined,
  ) {
    if (file) {
      this.logger.log(
        `Registration video received name=${file.originalname} size=${file.size} mimetype=${file.mimetype}`,
      );
    }

    return this.uploadsService.uploadRegistrationVideo(file);
  }

  @Post('payment-proof')
  @UseInterceptors(
    PaymentProofUploadInterceptor,
    FileInterceptor('file', {
      limits: { fileSize: maxPaymentProofUploadSizeBytes, files: 1 },
      fileFilter: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const isValid =
          paymentProofMimeTypes.has(file.mimetype) &&
          paymentProofExtensions.has(extension);

        if (!isValid) {
          callback(
            new BadRequestException(
              'Invalid payment proof file type. Upload a JPG, JPEG, PNG, or WebP image',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadPaymentProof(
    @UploadedFile() file: UploadedMultipartFile | undefined,
  ) {
    if (file && !file.buffer) {
      throw new BadRequestException('Invalid payment proof upload');
    }

    return this.uploadsService.uploadPaymentProof(file);
  }
}
