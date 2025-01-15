import { Prop, Schema, SchemaFactory, Virtual } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

import { CandidateInterview } from 'src/interview/schemas/candidate-interview.schema';

export type CandidateDocument = HydratedDocument<Candidate>;

@Schema({ timestamps: true, toJSON: { getters: true, virtuals: true } })
export class Candidate {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Virtual({
    get: function (this: Candidate) {
      return `${this.firstName} ${this.lastName}`;
    },
  })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'CandidateInterview' }],
  })
  interviews: CandidateInterview[];

  @Prop({ type: String, required: true })
  recruiter: string;

  @Prop({ type: MongooseSchema.Types.Date })
  createdAt?: Date;

  @Prop({ type: MongooseSchema.Types.Date })
  updatedAt?: Date;
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate);
