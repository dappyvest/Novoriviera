import { Module } from '@nestjs/common';
import {
  AdminVideoUploadGuard,
  PaymentProofUploadInterceptor,
  RegistrationImageUploadInterceptor,
  UploadsController,
  VideoUploadLoggingInterceptor,
} from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PublicVotesModule } from '../public-votes/public-votes.module';

@Module({
  imports: [PublicVotesModule],
  controllers: [UploadsController],
  providers: [
    AdminVideoUploadGuard,
    UploadsService,
    PaymentProofUploadInterceptor,
    RegistrationImageUploadInterceptor,
    VideoUploadLoggingInterceptor,
  ],
})
export class UploadsModule {}
