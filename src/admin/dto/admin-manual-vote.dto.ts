
import {
    IsInt,
    IsString,
    Max,
    Min,
    MinLength,
    MaxLength,
  } from 'class-validator';
  
  export class AdminManualVoteDto {
    @IsInt()
    @Min(1)
    @Max(10000)
    quantity: number;
  
    @IsString()
    @MinLength(5)
    @MaxLength(500)
    reason: string;
  }
  