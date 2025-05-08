import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@langchain/langgraph-sdk';

import { SkillLevel } from 'src/interview/enums/interview.enum';
import {
  InterviewResponse,
  AssessmentResponse,
  InterviewMessage,
} from './ai.types';
import {
  TechnicalAssessment,
  TechnicalInterview,
} from 'src/interview/schemas/interview-sections.schema';

@Injectable()
export class AiService {
  private readonly client: Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      apiUrl: this.configService.get('LANGGRAPH_API_URL'),
    });
  }

  private extractTranscript(
    messages: InterviewMessage[],
  ): Array<{ role: string; content: string }> {
    return messages
      .slice(1)
      .filter((m) => {
        // Skip tool messages
        if (m.type === 'tool') return false;

        // Skip messages with tool calls
        if (m.tool_calls && m.tool_calls.length > 0) return false;

        // Skip empty AI messages
        if (m.type === 'ai' && !m.content) return false;

        return true;
      })
      .map((m) => ({
        role: m.type === 'ai' ? 'Interviewer' : 'Candidate',
        content: m.content
          .replace('end_of_the_interview', '')
          .replace('CANDIDATE SOLUTION:', '')
          .trim(),
      }));
  }

  // Interview
  async startTechnicalInterview({
    threadId,
    candidateName,
    position,
    companyName,
    skills,
    experience,
  }: {
    threadId: string;
    candidateName: string;
    position: string;
    companyName: string;
    skills: string[];
    experience: string;
  }) {
    const messages = [{ role: 'human', content: 'Hi' }];

    const response = await this.client.runs.wait(threadId, 'interview_agent', {
      input: {
        messages,
        position,
        candidate: candidateName,
        company: companyName,
        skills,
        experience,
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
    companyName,
    message,
  }: {
    threadId: string;
    candidateName: string;
    position: string;
    companyName: string;
    message: string;
  }) {
    const messages = [{ role: 'human', content: message }];

    const response = await this.client.runs.wait(threadId, 'interview_agent', {
      input: {
        messages,
        position,
        candidate: candidateName,
        company: companyName,
      },
    });

    const result = response as unknown as InterviewResponse;
    const lastMessage = result.messages[result.messages.length - 1].content;
    const endInterview = lastMessage.includes('end_of_the_interview');

    return {
      message: endInterview
        ? lastMessage.replace('end_of_the_interview', '').trim()
        : lastMessage,
      endInterview,
    };
  }

  async evaluateInterview({ threadId }: { threadId: string }) {
    const response = await this.client.runs.wait(threadId, 'interview_agent', {
      input: { route: 'evaluate' },
    });

    const { messages, evaluation } = response as unknown as InterviewResponse;
    const transcript = this.extractTranscript(messages);

    return { ...evaluation, transcript } as TechnicalInterview;
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

    const result = response as unknown as AssessmentResponse;
    const lastMessage = result.messages[result.messages.length - 1].content;

    return lastMessage;
  }

  async handleAssessmentResponse({
    threadId,
    candidateName,
    difficulty,
    message,
    isSubmitSolution = false,
    solution,
  }: {
    threadId: string;
    candidateName: string;
    difficulty: SkillLevel;
    message: string;
    isSubmitSolution: boolean;
    solution?: string;
  }) {
    const messageContent = isSubmitSolution
      ? `CANDIDATE SOLUTION:\n ${solution}\n`
      : message;

    const messages = [{ role: 'human', content: messageContent }];

    const response = await this.client.runs.wait(threadId, 'assessment_agent', {
      input: {
        messages,
        difficulty,
        candidate: candidateName,
        ...(isSubmitSolution && { solution }),
      },
    });

    const result = response as unknown as AssessmentResponse;
    const lastMessage = result.messages[result.messages.length - 1];
    const secondLastMessage =
      result.messages.length > 2 && result.messages[result.messages.length - 2];

    let assessment: string | null;

    if (
      secondLastMessage &&
      secondLastMessage.type === 'tool' &&
      secondLastMessage.name === 'get_assessment'
    ) {
      assessment = secondLastMessage.content;
    }

    const endAssessment = lastMessage.content.includes('end_of_the_interview');

    return {
      message: endAssessment
        ? lastMessage.content.replace('end_of_the_interview', '').trim()
        : lastMessage.content,
      assessment,
      endAssessment,
    };
  }

  async evaluateAssessment({ threadId }: { threadId: string }) {
    const response = await this.client.runs.wait(threadId, 'assessment_agent', {
      input: { route: 'evaluate' },
    });

    const { messages, coding_assessment, solution, evaluation } =
      response as unknown as AssessmentResponse;

    const transcript = this.extractTranscript(messages);

    return {
      totalScore: evaluation.totalScore,
      question: {
        question: coding_assessment,
        solution,
        evaluation: evaluation.evaluation,
      },
      transcript,
    } as TechnicalAssessment;
  }
}
