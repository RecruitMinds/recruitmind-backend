import { ChatGroq } from '@langchain/groq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { INTERVIEW_PROMPTS } from '../prompts/interview.prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import {
  RunnableLambda,
  RunnableWithMessageHistory,
} from '@langchain/core/runnables';
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis';
import { AIMessage } from '@langchain/core/messages';

export interface InterviewResponse {
  message: string;
  state: 'INTERVIEWING' | 'COMPLETED';
}

export interface InterviewEvaluation {
  totalScore: number;
  technicalSkillsScore: number;
  softSkillsScore: number;
}

@Injectable()
export class InterviewAiService {
  private chatModel: ChatGroq;
  private redis: Redis;
  private activeChains: Map<
    string,
    RunnableWithMessageHistory<any, AIMessage>
  > = new Map();

  constructor(private readonly configService: ConfigService) {
    this.chatModel = new ChatGroq({
      apiKey: configService.get('GROQ_API_KEY'),
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
    });

    this.redis = new Redis({
      url: configService.get('UPSTASH_REDIS_REST_URL'),
      token: configService.get('UPSTASH_REDIS_REST_TOKEN'),
    });
  }

  private getMemory(sessionId: string) {
    return new UpstashRedisChatMessageHistory({
      sessionId,
      sessionTTL: 3600,
      client: this.redis,
    });
  }

  private createChain() {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', INTERVIEW_PROMPTS.INTERVIWER],
      new MessagesPlaceholder('history'),
      ['human', '{input}'],
    ]);

    const outputParser = new JsonOutputParser<InterviewResponse>();

    const chain = prompt.pipe(this.chatModel).pipe(
      new RunnableLambda({
        func: async (response) => {
          const parsed = await outputParser.invoke(response);
          return new AIMessage({ content: JSON.stringify(parsed) });
        },
      }),
    );

    return new RunnableWithMessageHistory({
      runnable: chain,
      getMessageHistory: (sessionId) => this.getMemory(sessionId),
      inputMessagesKey: 'input',
      historyMessagesKey: 'history',
    });
  }

  private getOrCreateChain(sessionId: string) {
    if (!this.activeChains.has(sessionId)) {
      this.activeChains.set(sessionId, this.createChain());
    }

    return this.activeChains.get(sessionId);
  }

  private async getTranscript(sessionId: string) {
    const history = await this.getMemory(sessionId).getMessages();
    const transcript = history
      .map((m) => {
        if (m.getType() === 'ai') {
          return `Interviewer: ${JSON.parse(m.content.toString())?.message}`;
        }

        return `Candidate: ${m.content}`;
      })
      .join('\n');

    return transcript;
  }

  async startInterview(sessionId: string) {
    const chain = this.getOrCreateChain(sessionId);
    const response = await chain.invoke(
      {
        input: 'Hi',
        position: 'Software Engineer',
      },
      { configurable: { sessionId } },
    );

    const { message } = JSON.parse(
      response.content.toString(),
    ) as InterviewResponse;

    return message;
  }

  async handleResponse(
    sessionId: string,
    message: string,
  ): Promise<{
    message: string;
    endInterview: boolean;
  }> {
    const chain = this.getOrCreateChain(sessionId);
    const response = await chain.invoke(
      {
        input: message,
        position: 'Software Engineer',
      },
      { configurable: { sessionId } },
    );

    const res = JSON.parse(response.content.toString()) as InterviewResponse;

    return {
      message: res.message,
      endInterview: res.state === 'COMPLETED',
    };
  }

  async evaluateInterview(sessionId: string): Promise<InterviewEvaluation> {
    const prompt = ChatPromptTemplate.fromTemplate(INTERVIEW_PROMPTS.EVALUATE);
    const parser = new JsonOutputParser<InterviewEvaluation>();
    const chain = prompt.pipe(this.chatModel).pipe(parser);

    const transcript = await this.getTranscript(sessionId);

    const response = await chain.invoke({ transcript });
    return response;
  }
}
