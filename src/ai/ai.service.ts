import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';
import { ConfigService } from '@nestjs/config';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  StringOutputParser,
  JsonOutputParser,
} from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import Redis from 'ioredis';

interface InterviewContext {
  skillLevel: string;
  questions: QuestionResponse[];
  currentQuestion: string;
  currentSolution?: string;
  currentEvaluation?: any;
  followUpHistory: string[];
}

interface Example {
  input: string;
  output: string;
  explanation: string;
}

interface QuestionResponse {
  title: string;
  description: string;
  examples: Example[];
  constraints: string[];
}

@Injectable()
export class AiService {
  private chatModel: ChatGroq;
  // private chatModel: ChatOpenAI;
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.chatModel = new ChatGroq({
      apiKey: configService.get('GROQ_API_KEY'),
      model: 'llama-3.1-70b-versatile',
      temperature: 0.7,
    });
    // this.chatModel = new ChatOpenAI({
    //   apiKey: configService.get('OPENAI_API_KEY'),
    //   modelName: 'gpt-4',
    //   temperature: 0.7,
    // });
    this.redis = new Redis(process.env.REDIS_URL);
  }

  private async saveContext(sessionId: string, context: InterviewContext) {
    await this.redis.set(
      `interview_context:${sessionId}`,
      JSON.stringify(context),
      'EX',
      3600, // 1 hour expiry
    );
  }

  private async getContext(
    sessionId: string,
  ): Promise<InterviewContext | null> {
    const context = await this.redis.get(`interview_context:${sessionId}`);
    return context ? JSON.parse(context) : null;
  }

  async generateQuestion(
    skillLevel: string | null,
    sessionId: string,
    questionIndex: number,
  ): Promise<QuestionResponse> {
    let context = await this.getContext(sessionId);

    if (!context && !skillLevel) {
      throw new Error('Invalid session context');
    }

    if (!context) {
      context = {
        skillLevel,
        questions: [],
        currentQuestion: '',
        followUpHistory: [],
      };
    }

    const questionTemplate = ChatPromptTemplate.fromTemplate(`
      Generate a coding problem for a {skillLevel} software engineer.
      This is question #{questionNumber} out of 3.
      Previous questions: {previousQuestions}
      
      Requirements:
      - Problem should be different from previous questions
      - Must include clear problem statement
      - Include 2-3 sample input/output examples
      - Should be solvable within 15-20 minutes
      - Focus on practical software engineering scenarios
      
      Return a JSON object with the following structure:
      {{
        "title": "Problem title",
        "description": "Detailed problem description",
        "examples": [
          {{
            "input": "Input parameters with exact format",
            "output": "Expected output",
            "explanation": "Detailed step-by-step explanation"
          }}
        ],
        "constraints": [
          "Constraint 1",
          "Constraint 2"
        ]
      }}
    `);

    const parser = new JsonOutputParser<QuestionResponse>();
    const chain = RunnableSequence.from([
      questionTemplate,
      this.chatModel,
      parser,
    ]);

    const response = await chain.invoke({
      skillLevel: context.skillLevel,
      questionNumber: questionIndex + 1,
      previousQuestions: JSON.stringify(context.questions),
    });

    context.currentQuestion = JSON.stringify(response);
    context.questions.push(response);
    await this.saveContext(sessionId, context);

    return response;
  }

  async generateFollowUpQuestion(
    solution: string,
    sessionId: string,
  ): Promise<string | null> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new Error('Invalid session context');
    }

    const followUpTemplate = ChatPromptTemplate.fromTemplate(`
        Context:
        Original Question: {question}
        Candidate's Solution: {solution}
        Previous Follow-ups: {previousFollowUps}
  
        First, evaluate if the solution demonstrates clear understanding. 
        If the solution shows gaps in understanding or needs clarification, 
        generate a follow-up question that:
        1. Focuses on understanding how their solution works
        2. Asks about specific parts of their implementation
        3. Probes their understanding of the approach they chose
        4. Questions their decision-making process
        
        Guidelines for follow-up:
        - DO NOT ask about alternative solutions or optimizations
        - DO NOT extend the original problem
        - DO focus on their current solution only
        - DO ask about specific lines or blocks of their code
        
        If the solution demonstrates clear understanding and no clarification is needed, 
        respond only with exactly "COMPLETE".
        Otherwise, provide only the follow-up question.
      `);

    const chain = RunnableSequence.from([
      followUpTemplate,
      this.chatModel,
      new StringOutputParser(),
    ]);

    const response = await chain.invoke({
      question: context.currentQuestion,
      solution,
      previousFollowUps: JSON.stringify(context.followUpHistory),
    });

    if (response === 'COMPLETE') {
      return null;
    }

    context.currentSolution = solution;
    context.followUpHistory.push(response);
    await this.saveContext(sessionId, context);

    return response;
  }

  async processFollowUpAnswer(
    answer: string,
    sessionId: string,
  ): Promise<string | null> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new Error('Invalid session context');
    }

    const followUpTemplate = ChatPromptTemplate.fromTemplate(`
      Context:
      Original Question: {question}
      Candidate Solution: {solution}
      Previous Follow-ups: {previousFollowUps}
      Latest Answer: {answer}

      First, evaluate if the answer demonstrates clear understanding.
      If the answer shows gaps in understanding or needs clarification,
      generate a follow-up question that:
      1. Focuses on understanding how their solution works
      2. Asks about specific parts that still need clarification
      3. Probes deeper into any unclear explanations
      
      Guidelines for follow-up:
      - DO NOT ask about alternative solutions or optimizations
      - DO NOT extend the original problem
      - DO focus on their current solution and explanation
      - DO ask specific questions about their understanding
      
      If the answer demonstrates clear understanding and no clarification is needed,
      respond with exactly "COMPLETE".
      Otherwise, provide only the follow-up question.
    `);

    const chain = RunnableSequence.from([
      followUpTemplate,
      this.chatModel,
      new StringOutputParser(),
    ]);

    const response = await chain.invoke({
      question: context.currentQuestion,
      solution: context.currentSolution,
      previousFollowUps: JSON.stringify(context.followUpHistory),
      answer,
    });

    if (response === 'COMPLETE') {
      return null;
    }

    context.followUpHistory.push(response);
    await this.saveContext(sessionId, context);

    return response;
  }
}
