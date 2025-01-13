import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export class TechnicalInterview {
  @Prop()
  totalScore: number;

  @Prop([
    {
      question: String,
      candidateAnswer: String,
      score: Number,
    },
  ])
  questions: Array<{
    question: string;
    candidateAnswer: string;
    score: number;
    evaluation: string;
  }>;

  @Prop()
  transcript: string;
}

@Schema()
export class TechnicalAssessment {
  @Prop()
  totalScore: number;

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

  @Prop()
  transcript: string;
}
