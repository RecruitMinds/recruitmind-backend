import { Module } from '@nestjs/common';
import { InterviewGateway } from './interview.gateway';
import { InterviewService } from './interview.service';
import { AiService } from 'src/ai/ai.service';
import { InterviewController } from './interview.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewSchema } from './schemas/interview.schema';
import { CandidateSchema } from 'src/candidate/schemas/candidate.schema';
import { CandidateInterviewSchema } from './schemas/candidate-interview.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Interview', schema: InterviewSchema },
      { name: 'Candidate', schema: CandidateSchema },
      { name: 'CandidateInterview', schema: CandidateInterviewSchema },
    ]),
  ],
  providers: [InterviewGateway, InterviewService, AiService],
  controllers: [InterviewController],
})
export class InterviewModule {}
