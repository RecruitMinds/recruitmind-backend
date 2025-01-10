import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { InterviewStatus, SkillLevel } from '../enums/interview.enum';

export class CreateInterviewDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: SkillLevel })
  @IsEnum(SkillLevel)
  skillLevel: SkillLevel;

  @ApiProperty({ enum: InterviewStatus, default: InterviewStatus.INACTIVE })
  @IsEnum(InterviewStatus)
  status: InterviewStatus;

  @ApiProperty()
  @IsString()
  recruiter: string;
}
