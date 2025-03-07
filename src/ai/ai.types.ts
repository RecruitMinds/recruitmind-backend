import { TechnicalInterview } from 'src/interview/schemas/interview-sections.schema';

export type InterviewMessage = {
  content: string;
  type: 'human' | 'ai' | 'tool';
  name: 'generate_assessment' | null;
  tool_calls?: [object];
};

export type InterviewResponse = {
  messages: InterviewMessage[];
  evaluation: Omit<TechnicalInterview, 'transcript'>;
};

export interface Example {
  input: string;
  output: string;
  explanation: string;
}

export interface CodingAssessment {
  title: string;
  description: string;
  examples: Example[];
  constraints: string[];
}

export type AssessmentResponse = {
  messages: InterviewMessage[];
  evaluation: { totalScore: number; evaluation: string };
  coding_assessment: CodingAssessment;
  solution: string;
};
