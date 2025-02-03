import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { UnauthorizedException } from '@nestjs/common';
import { Types, Document } from 'mongoose';

import { InterviewService } from './interview.service';
import { AiService } from 'src/ai/ai.service';
import { InterviewStatus } from './enums/candidateInterview.enum';
import { Interview } from './schemas/interview.schema';
import { Candidate } from 'src/candidate/schemas/candidate.schema';
import { CandidateInterview } from './schemas/candidate-interview.schema';

interface InterviewSession {
  interviewId: Types.ObjectId;
  candidateId: Types.ObjectId;
  isAssessment: boolean;
  initialStage: 'Interview' | 'Assessment';
}

type MongoDocument<T> = Document<unknown, any, T> & T & { _id: Types.ObjectId };

interface PopulatedCandidateInterview
  extends Omit<
    MongoDocument<CandidateInterview>,
    'candidateId' | 'interviewId'
  > {
  candidateId: MongoDocument<Candidate>;
  interviewId: MongoDocument<Interview>;
  status: InterviewStatus;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'interview' })
export class InterviewGateway {
  @WebSocketServer() server: Server;

  private activeSessions: Map<string, InterviewSession> = new Map();

  constructor(
    private readonly interviewService: InterviewService,
    private readonly aiService: AiService,
  ) {}

  @SubscribeMessage('start-interview')
  async handleStartInterview(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { invitationToken: string },
  ) {
    try {
      const result = await this.interviewService.validateInvitationToken(
        payload.invitationToken,
      );

      const candidateInterview =
        result as unknown as PopulatedCandidateInterview;

      if (candidateInterview.status === InterviewStatus.COMPLETED) {
        throw new UnauthorizedException('Interview already completed');
      }

      const session: InterviewSession = {
        interviewId: candidateInterview.interviewId._id,
        candidateId: candidateInterview.candidateId._id,
        isAssessment: candidateInterview.interviewId.includeTechnicalAssessment,
        initialStage: 'Interview',
      };

      this.activeSessions.set(client.id, session);

      await this.interviewService.updateInterviewStatus(
        session.interviewId.toString(),
        session.candidateId.toString(),
        'STARTED',
      );

      const message = await this.aiService.startTechnicalInterview(client.id);
      client.emit('interview-message', { message });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('interview-response')
  async handleInterviewResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { message: string },
  ) {
    try {
      const session = this.activeSessions.get(client.id);

      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      const { message, endInterview } =
        await this.aiService.handleInteviewResponse(client.id, payload.message);

      if (endInterview) {
        const results = await this.aiService.evaluateInterview(client.id);

        if (session.isAssessment) {
          client.emit('start-assessment');
        } else {
          client.emit('interview-end');
        }

        // TODO: Update Technical interview Results
      }

      client.emit('interview-message', { message });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('submit-solution')
  async handleSolution(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { solution: string },
  ) {
    try {
      const session = this.activeSessions.get(client.id);

      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  handleDisconnect(client: Socket) {
    this.activeSessions.delete(client.id);
  }
}
