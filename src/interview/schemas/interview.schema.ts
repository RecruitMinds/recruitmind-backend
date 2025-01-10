import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { InterviewStatus, SkillLevel } from '../enums/interview.enum';

export type InterviewDocument = HydratedDocument<Interview>;

@Schema({ timestamps: true })
export class Interview {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: String, enum: SkillLevel, required: true })
  skillLevel: SkillLevel;

  @Prop({
    type: String,
    enum: InterviewStatus,
    default: InterviewStatus.INACTIVE,
    required: true,
  })
  status: InterviewStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Recruiter' })
  recruiter: string;
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);
