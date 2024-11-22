import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type InterviewDocument = HydratedDocument<Interview>;

@Schema({ timestamps: true })
export class Interview {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  skillLevel: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Recruiter' })
  recruiter: string;
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);
