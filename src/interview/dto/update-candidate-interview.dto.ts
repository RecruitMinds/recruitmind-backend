import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { HiringStage, InterviewStatus } from '../enums/candidateInterview.enum';

export class UpdateCandidateInterviewDto {
  @ApiProperty({ enum: InterviewStatus })
  @IsEnum(InterviewStatus)
  @IsOptional()
  status?: InterviewStatus;

  @ApiProperty({ enum: HiringStage })
  @IsEnum(HiringStage)
  @IsOptional()
  stage?: HiringStage;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  comment?: string;
}
