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
  process.env.MAX_VIDEO_UPLOAD_SIZE_MB ?? maxUploadSizeMb,
);
const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;
const maxVideoUploadSizeBytes = maxVideoUploadSizeMb * 1024 * 1024;

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
}
