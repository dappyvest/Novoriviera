import { Module } from '@nestjs/common';
import {
  PaymentProofUploadInterceptor,
  UploadsController,
  VideoUploadLoggingInterceptor,
} from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    PaymentProofUploadInterceptor,
    VideoUploadLoggingInterceptor,
  ],
})
export class UploadsModule {}
