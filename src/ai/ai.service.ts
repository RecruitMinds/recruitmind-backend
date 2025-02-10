import { Injectable } from '@nestjs/common';
import { Client } from '@langchain/langgraph-sdk';

import { SkillLevel } from 'src/interview/enums/interview.enum';

type InterviewMessage = {
  content: string;
  type: 'human' | 'ai' | 'tool';
  name: 'generate_assessment' | null;
};

type InterviewResponse = {
  messages: InterviewMessage[];
};

@Injectable()
export class AiService {
  private readonly client: Client;

  constructor() {
    this.client = new Client();
  }

  // Interview
  async startTechnicalInterview({
    threadId,
    candidateName,
    position,
  }: {
    threadId: string;
    candidateName: string;
    position: string;
  }) {
    const messages = [{ role: 'human', content: 'Hi' }];

    const response = await this.client.runs.wait(threadId, 'interview_agent', {
      input: {
        messages,
        position,
        candidate: candidateName,
      },
    });

    const result = response as unknown as InterviewResponse;
    const lastMessage = result.messages[result.messages.length - 1].content;

    return lastMessage;
  }

  async handleInteviewResponse({
    threadId,
    candidateName,
    position,
    message,
  }: {
    threadId: string;
    candidateName: string;
    position: string;
    message: string;
  }) {
    const messages = [{ role: 'human', content: message }];

    const response = await this.client.runs.wait(threadId, 'interview_agent', {
      input: {
        messages,
        position,
        candidate: candidateName,
      },
    });

    const result = response as unknown as InterviewResponse;
    const lastMessage = result.messages[result.messages.length - 1].content;
    const endInterview = lastMessage.includes('end_of_the_interview');

    return {
      message: endInterview
        ? lastMessage.replace('end_of_the_interview', '')
        : lastMessage,
      endInterview,
    };
  }

  async evaluateInterview(sessionId: string) {
    return;
  }

  // Assessment
  async startAssessmentInterview({
    threadId,
    candidateName,
    difficulty,
  }: {
    threadId: string;
    candidateName: string;
    difficulty: SkillLevel;
  }) {
    const messages = [{ role: 'human', content: 'Hi' }];

    const response = await this.client.runs.wait(threadId, 'assessment_agent', {
      input: {
        messages,
        difficulty,
        candidate: candidateName,
      },
    });

    const result = response as unknown as InterviewResponse;
    const lastMessage = result.messages[result.messages.length - 1].content;

    return lastMessage;
  }

  async handleAssessmentResponse({
    threadId,
    candidateName,
    difficulty,
    message,
  }: {
    threadId: string;
    candidateName: string;
    difficulty: SkillLevel;
    message: string;
  }) {
    const messages = [{ role: 'human', content: message }];

    const response = await this.client.runs.wait(threadId, 'assessment_agent', {
      input: {
        messages,
        difficulty,
        candidate: candidateName,
      },
    });

    const result = response as unknown as InterviewResponse;
    const lastMessage = result.messages[result.messages.length - 1];
    const secondLastMessage =
      result.messages.length > 2 && result.messages[result.messages.length - 2];

    let assessment: string | null;

    if (
      secondLastMessage &&
      secondLastMessage.type === 'tool' &&
      secondLastMessage.name === 'generate_assessment'
    ) {
      assessment = secondLastMessage.content;
    }

    const endAssessment = lastMessage.content.includes('end_of_the_interview');

    return {
      message: endAssessment
        ? lastMessage.content.replace('end_of_the_interview', '')
        : lastMessage.content,
      assessment,
      endAssessment,
    };
  }

  async evaluateAssessment(sessionId: string) {}
}
