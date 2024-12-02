import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { InterviewService } from './interview.service';
import { AiService } from 'src/ai/ai.service';
import { UnauthorizedException } from '@nestjs/common';

interface InterviewSession {
  interviewId: string;
  candidateId: string;
  currentQuestionIndex: number;
  followUpCount: number;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'interview' })
export class InterviewGateway {
  @WebSocketServer() server: Server;

  private activeSessions: Map<string, InterviewSession> = new Map();

  constructor(
    private readonly interviewService: InterviewService,
    private readonly aiService: AiService,
  ) {}

  @SubscribeMessage('startInterview')
  async handleStartInterview(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { invitationToken: string },
  ) {
    try {
      // Validate the invitation token and get interview details
      const candidateInterview =
        await this.interviewService.validateInvitationToken(
          payload.invitationToken,
        );

      if (candidateInterview.status === 'COMPLETED') {
        throw new UnauthorizedException('Interview already completed');
      }

      // Initialize the interview session
      const session: InterviewSession = {
        interviewId: candidateInterview.interviewId,
        candidateId: candidateInterview.candidateId,
        currentQuestionIndex: 0,
        followUpCount: 0,
      };

      this.activeSessions.set(client.id, session);

      // Update the interview status
      await this.interviewService.updateInterviewStatus(
        candidateInterview.interviewId,
        candidateInterview.candidateId,
        'STARTED',
      );

      // Generate the first question
      const question = await this.aiService.generateQuestion(
        'BEGINNER',
        client.id,
        0,
      );

      client.emit('question', { question, questionIndex: 0 });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  private async moveToNextQuestion(client: Socket, session: InterviewSession) {
    session.currentQuestionIndex++;
    session.followUpCount = 0;

    if (session.currentQuestionIndex < 3) {
      const nextQuestion = await this.aiService.generateQuestion(
        null,
        client.id,
        session.currentQuestionIndex,
      );

      this.activeSessions.set(client.id, session);

      client.emit('question', {
        question: nextQuestion,
        questionIndex: session.currentQuestionIndex,
      });
    } else {
      // TODO: update complete interview status
      this.activeSessions.delete(client.id);
      client.emit('interviewCompleted');
    }
  }

  @SubscribeMessage('submitSolution')
  async handleSolution(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { solution: string },
  ) {
    try {
      const session = this.activeSessions.get(client.id);

      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      const followUpQuestion = await this.aiService.generateFollowUpQuestion(
        payload.solution,
        client.id,
      );

      if (followUpQuestion) {
        session.followUpCount++;
        this.activeSessions.set(client.id, session);
        client.emit('followUpQuestion', followUpQuestion);
      } else {
        await this.moveToNextQuestion(client, session);
      }
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('answerFollowUp')
  async handleFollowUpAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { answer: string },
  ) {
    try {
      const session = this.activeSessions.get(client.id);
      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      const nextFollowUp = await this.aiService.processFollowUpAnswer(
        payload.answer,
        client.id,
      );

      if (nextFollowUp && session.followUpCount < 3) {
        // Limit follow-up questions to 3
        session.followUpCount++;
        this.activeSessions.set(client.id, session);
        client.emit('followUpQuestion', nextFollowUp);
      } else {
        await this.moveToNextQuestion(client, session);
      }
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  handleDisconnect(client: Socket) {
    this.activeSessions.delete(client.id);
  }
}
