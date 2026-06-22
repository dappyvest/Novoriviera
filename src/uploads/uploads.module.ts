import { Module } from '@nestjs/common';
import {
  UploadsController,
  VideoUploadLoggingInterceptor,
} from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, VideoUploadLoggingInterceptor],
})
export class UploadsModule {}
