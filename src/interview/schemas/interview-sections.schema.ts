import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export class TechnicalInterview {
  @Prop({ type: Number, default: null })
  totalScore: number | null;

  @Prop({ type: Number, default: null })
  technicalSkillsScore: number | null;

  @Prop({ type: Number, default: null })
  softSkillsScore: number | null;

  @Prop([
    {
      question: String,
      answer: String,
      evaluation: String,
    },
  ])
  questions: Array<{
    question: string;
    answer: string;
    evaluation: string;
  }>;

  @Prop([
    {
      role: String,
      content: String,
    },
  ])
  transcript: Array<{
    role: string;
    content: string;
  }>;
}

@Schema()
export class TechnicalAssessment {
  @Prop({ type: Number, default: null })
  totalScore: number | null;

  @Prop([
    {
      question: {
        title: String,
        description: String,
        examples: [{ input: String, output: String, explanations: String }],
        constraints: [String],
      },
      solution: String,
      evaluation: String,
    },
  ])
  questions: Array<{
    question: {
      title: string;
      description: string;
      examples: { input: string; output: string; explanations: string }[];
      constraints: string[];
    };
    solution: string;
    evaluation: string;
  }>;

  @Prop([
    {
      role: String,
      content: String,
    },
  ])
  transcript: Array<{
    role: string;
    content: string;
  }>;
}
