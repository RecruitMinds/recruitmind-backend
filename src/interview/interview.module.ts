import { Module } from '@nestjs/common';
import { InterviewGateway } from './interview.gateway';
import { InterviewService } from './interview.service';
import { InterviewController } from './interview.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewSchema } from './schemas/interview.schema';
import { CandidateSchema } from 'src/candidate/schemas/candidate.schema';
import { CandidateInterviewSchema } from './schemas/candidate-interview.schema';
import { MailModule } from 'src/mail/mail.module';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Interview', schema: InterviewSchema },
      { name: 'Candidate', schema: CandidateSchema },
      { name: 'CandidateInterview', schema: CandidateInterviewSchema },
    ]),
    MailModule,
    AiModule,
  ],
  providers: [InterviewGateway, InterviewService],
  controllers: [InterviewController],
})
export class InterviewModule {}
