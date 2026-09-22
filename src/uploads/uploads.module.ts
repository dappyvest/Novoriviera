import { Module } from '@nestjs/common';
import {
  PaymentProofUploadInterceptor,
  RegistrationImageUploadInterceptor,
  RegistrationVideoUploadInterceptor,
  UploadsController,
  VideoUploadLoggingInterceptor,
} from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PublicVotesModule } from '../public-votes/public-votes.module';

@Module({
  imports: [PublicVotesModule],
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
