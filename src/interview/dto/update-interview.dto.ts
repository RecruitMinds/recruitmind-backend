import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateInterviewDto } from './create-interview.dto';

export class UpdateInterviewDto extends PartialType(
  OmitType(CreateInterviewDto, ['recruiter'] as const),
) {}
