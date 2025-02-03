import Redis from 'ioredis';
import { ChatGroq } from '@langchain/groq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AssessmentAiService {
  private interviewerModel: ChatGroq;
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.interviewerModel = new ChatGroq({
      apiKey: configService.get('GROQ_API_KEY'),
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    });
    // this.redis = new Redis(configService.get('REDIS_URL'));
  }
}
