import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { HiringStage, InterviewStatus } from '../enums/candidateInterview.enum';
import {
  TechnicalAssessment,
  TechnicalInterview,
} from './interview-sections.schema';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CandidateInterview {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Candidate' })
  candidateId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Interview' })
  interviewId: string;

  @Prop({
    type: String,
    enum: InterviewStatus,
    default: InterviewStatus.INVITED,
  })
  status: InterviewStatus;

  @Prop({
    type: String,
    enum: HiringStage,
    default: HiringStage.NEW,
  })
  stage: HiringStage;

  @Prop()
  invitationToken: string;

  @Prop({ type: TechnicalInterview, required: false, default: null })
  technicalInterview?: TechnicalInterview | null;

  @Prop({ type: TechnicalAssessment, required: false, default: null })
  technicalAssessment?: TechnicalAssessment | null;

  @Prop({ required: false, default: null })
  rating?: number | null;

  @Prop({ required: false, default: null })
  comment?: string | null;

  @Prop({ type: MongooseSchema.Types.Date })
  createdAt?: Date;

  @Prop({ type: MongooseSchema.Types.Date })
  updatedAt?: Date;
}

export const CandidateInterviewSchema =
  SchemaFactory.createForClass(CandidateInterview);

CandidateInterviewSchema.virtual('finalScore').get(function () {
  const interviewScore = this.technicalInterview?.totalScore ?? 0;
  const assessmentScore = this.technicalAssessment?.totalScore ?? 0;

  // If both scores exist, calculate average
  if (interviewScore && assessmentScore) {
    return (interviewScore + assessmentScore) / 2;
  }

  // If only one score exists, return that score
  return interviewScore || assessmentScore || 0;
});

export type CandidateInterviewDocumentOverride = {
  technicalInterview: Types.Subdocument<Types.ObjectId & TechnicalInterview>;
  technicalAssessment: Types.Subdocument<Types.ObjectId & TechnicalAssessment>;
};

export type CandidateInterviewDocument = HydratedDocument<
  CandidateInterview,
  CandidateInterviewDocumentOverride
>;
