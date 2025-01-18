import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import {
  InterviewStatus,
  SkillLevel,
  WorkArrangements,
} from '../enums/interview.enum';

export class CreateInterviewDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiProperty({ enum: WorkArrangements })
  @IsEnum(WorkArrangements)
  workArrangements: WorkArrangements;

  @ApiProperty()
  @IsBoolean()
  includeTechnicalAssessment: boolean;

  @ApiProperty({ enum: SkillLevel, required: false })
  @ValidateIf((o) => o.includeTechnicalAssessment === true)
  @IsEnum(SkillLevel)
  skillLevel?: SkillLevel;

  @ApiProperty({ enum: InterviewStatus, default: InterviewStatus.INACTIVE })
  @IsEnum(InterviewStatus)
  status: InterviewStatus;
}
