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
      skill: String,
      evaluation: String,
      score: String,
    },
  ])
  skillsEvaluation: Array<{
    skill: string;
    evaluation: string;
    score: string;
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

  @Prop({
    type: {
      question: {
        title: String,
        description: String,
        examples: [
          {
            input: String,
            output: String,
            explanations: { type: String, required: false },
          },
        ],
        constraints: { type: [String], required: false },
      },
      solution: String,
      evaluation: String,
    },
    default: null,
  })
  question: {
    question: {
      title: string;
      description: string;
      examples: { input: string; output: string; explanations?: string }[];
      constraints?: string[];
    };
    solution: string;
    evaluation: string;
  };

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
