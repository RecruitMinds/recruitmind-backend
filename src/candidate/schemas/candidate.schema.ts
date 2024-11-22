import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { CandidateInterview } from 'src/interview/schemas/candidate-interview.schema';

export type CandidateDocument = HydratedDocument<Candidate>;

@Schema({ timestamps: true })
export class Candidate {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'CandidateInterview' }],
  })
  interviews: CandidateInterview[];
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate);
