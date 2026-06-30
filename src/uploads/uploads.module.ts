import { Module } from '@nestjs/common';
import {
  PaymentProofUploadInterceptor,
  RegistrationImageUploadInterceptor,
  RegistrationVideoUploadInterceptor,
  UploadsController,
  VideoUploadLoggingInterceptor,
} from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    PaymentProofUploadInterceptor,
    RegistrationImageUploadInterceptor,
    RegistrationVideoUploadInterceptor,
    VideoUploadLoggingInterceptor,
  ],
})
export class UploadsModule {}
