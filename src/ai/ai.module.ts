import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AiService } from './ai.service';
import { AssessmentAiService } from './services/assessment.ai.service';
import { InterviewAiService } from './services/interview.ai.service';

@Module({
  imports: [ConfigModule],
  providers: [AiService, InterviewAiService, AssessmentAiService],
  exports: [AiService, AssessmentAiService],
})
export class AiModule {}
