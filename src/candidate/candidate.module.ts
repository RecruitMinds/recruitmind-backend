import { Module } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { CandidateController } from './candidate.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CandidateSchema } from './schemas/candidate.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Candidate', schema: CandidateSchema }]),
  ],
  controllers: [CandidateController],
  providers: [CandidateService],
})
export class CandidateModule {}
