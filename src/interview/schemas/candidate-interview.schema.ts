import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type CandidateInterviewDocument = HydratedDocument<CandidateInterview>;

@Schema({ timestamps: true })
export class CandidateInterview {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Candidate' })
  candidateId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Interview' })
  interviewId: string;

  @Prop({ default: 'INVITED', enum: ['INVITED', 'STARTED', 'COMPLETED'] })
  status: string;

  @Prop()
  invitationToken: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  results: {
    totalScore: number;
    questions: {
      question: string;
      candidateAnswer: string;
      evaluation: {
        correctness: number;
        efficiency: number;
        bestPractices: number;
        followUpQuestions: {
          question: string;
          answer: string;
          evaluation: string;
        }[];
      }[];
    }[];
  };
}

export const CandidateInterviewSchema =
  SchemaFactory.createForClass(CandidateInterview);
