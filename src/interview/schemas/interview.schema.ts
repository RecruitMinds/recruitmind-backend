import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  InterviewStatus,
  SkillLevel,
  WorkArrangements,
} from '../enums/interview.enum';

export type InterviewDocument = HydratedDocument<Interview>;

@Schema({ timestamps: true })
export class Interview {
  @Prop({ required: true })
  name: string;

  @Prop()
  experience: string;

  @Prop()
  skills: string[];

  @Prop()
  role: string;

  @Prop()
  location: string;

  @Prop({ type: String, enum: WorkArrangements })
  workArrangements: WorkArrangements;

  @Prop({ type: Boolean, default: false, required: true })
  includeTechnicalAssessment: boolean;

  @Prop({
    type: String,
    enum: SkillLevel,
    required: function (this: Interview) {
      return this.includeTechnicalAssessment === true;
    },
  })
  skillLevel: SkillLevel;

  @Prop({
    type: String,
    enum: InterviewStatus,
    default: InterviewStatus.INACTIVE,
    required: true,
  })
  status: InterviewStatus;

  @Prop({ type: String, required: true })
  recruiter: string;
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);
