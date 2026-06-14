import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UploadsService } from './uploads.service';

type UploadedMultipartFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 100);
const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: maxUploadSizeBytes },
    }),
  )
  uploadVideo(@UploadedFile() file: UploadedMultipartFile) {
    return this.uploadsService.upload(file, 'video');
  }

  @Post('image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: maxUploadSizeBytes },
    }),
  )
  uploadImage(@UploadedFile() file: UploadedMultipartFile) {
    return this.uploadsService.upload(file, 'image');
  }
}
