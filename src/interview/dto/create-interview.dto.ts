import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateInterviewDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @ApiProperty()
  @IsString()
  recruiter: string;
}
