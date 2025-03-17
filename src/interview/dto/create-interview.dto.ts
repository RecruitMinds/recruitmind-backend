import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  ValidateIf,
  IsArray,
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
  @IsString()
  experience: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  skills: string[];

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
