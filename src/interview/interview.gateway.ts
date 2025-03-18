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
import { Client, Thread } from '@langchain/langgraph-sdk';

import { InterviewService } from './interview.service';
import { AiService } from 'src/ai/ai.service';
import { InterviewStatus } from './enums/candidateInterview.enum';
import { Interview } from './schemas/interview.schema';
import { Candidate } from 'src/candidate/schemas/candidate.schema';
import { CandidateInterview } from './schemas/candidate-interview.schema';
import { SkillLevel } from './enums/interview.enum';

interface InterviewSession {
  interviewId: Types.ObjectId;
  candidateId: Types.ObjectId;
  interviewThreadId: string;
  assessmentThreadId?: string;
  position: string;
  candidateName: string;
  companyName: string;
  difficulty: SkillLevel;
  isAssessment: boolean;
  initialStage: 'Interview' | 'Assessment';
  skills: string[];
  experience: string;
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
  private readonly client: Client;
  private activeSessions: Map<string, InterviewSession> = new Map();

  constructor(
    private readonly interviewService: InterviewService,
    private readonly aiService: AiService,
  ) {
    this.client = new Client();
  }

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

      const interviewThread = await this.client.threads.create();

      let assessmentThread: Thread | undefined;
      if (candidateInterview.interviewId.includeTechnicalAssessment) {
        assessmentThread = await this.client.threads.create();
      }

      const session: InterviewSession = {
        interviewThreadId: interviewThread.thread_id,
        assessmentThreadId: assessmentThread.thread_id,
        interviewId: candidateInterview.interviewId._id,
        candidateId: candidateInterview.candidateId._id,
        position: candidateInterview.interviewId.role,
        candidateName: candidateInterview.candidateId.fullName,
        companyName: 'IFS', // TODO: Get the company name from DB
        difficulty: candidateInterview.interviewId.skillLevel,
        isAssessment: candidateInterview.interviewId.includeTechnicalAssessment,
        initialStage: 'Interview',
        skills: candidateInterview.interviewId.skills,
        experience: candidateInterview.interviewId.experience,
      };

      this.activeSessions.set(client.id, session);

      await this.interviewService.updateInterviewStatus(
        session.interviewId.toString(),
        session.candidateId.toString(),
        InterviewStatus.STARTED,
      );

      const message = await this.aiService.startTechnicalInterview({
        threadId: session.interviewThreadId,
        position: session.position,
        candidateName: session.candidateName,
        companyName: session.companyName,
        skills: session.skills,
        experience: session.experience,
      });

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
        await this.aiService.handleInteviewResponse({
          threadId: session.interviewThreadId,
          position: session.position,
          candidateName: session.candidateName,
          companyName: session.companyName,
          message: payload.message,
        });

      client.emit('interview-message', { message });

      if (endInterview) {
        const results = await this.aiService.evaluateInterview({
          threadId: session.interviewThreadId,
        });

        if (session.isAssessment) {
          client.emit('assessment-transition');
        } else {
          await this.interviewService.updateInterviewStatus(
            session.interviewId.toString(),
            session.candidateId.toString(),
            InterviewStatus.COMPLETED,
          );

          client.emit('interview-end');
        }

        await this.interviewService.saveInterviewResults(
          session.interviewId,
          session.candidateId,
          results,
        );
      }
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('start-assessment')
  async handleStartAssessment(@ConnectedSocket() client: Socket) {
    try {
      const session = this.activeSessions.get(client.id);

      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      const message = await this.aiService.startAssessmentInterview({
        threadId: session.assessmentThreadId,
        difficulty: session.difficulty,
        candidateName: session.candidateName,
      });

      client.emit('assessment-message', { message });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('assessment-response')
  async handleAssessmentResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { message: string },
  ) {
    try {
      const session = this.activeSessions.get(client.id);

      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      const { message, assessment, endAssessment } =
        await this.aiService.handleAssessmentResponse({
          threadId: session.assessmentThreadId,
          difficulty: session.difficulty,
          candidateName: session.candidateName,
          message: payload.message,
          isSubmitSolution: false,
        });

      if (assessment) {
        client.emit('assessment-message', {
          message:
            "Great! Here's your coding question. Please read it carefully and submit your solution when you're ready.",
        });
        client.emit('assessment', { assessment });
      } else {
        client.emit('assessment-message', { message });
      }

      if (endAssessment) {
        const results = await this.aiService.evaluateAssessment({
          threadId: session.assessmentThreadId,
        });

        await this.interviewService.saveAssessmentResults(
          session.interviewId,
          session.candidateId,
          results,
        );

        client.emit('interview-end');
      }
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

      const { message } = await this.aiService.handleAssessmentResponse({
        threadId: session.assessmentThreadId,
        difficulty: session.difficulty,
        candidateName: session.candidateName,
        message: '',
        isSubmitSolution: true,
        solution: payload.solution,
      });

      client.emit('assessment-message', { message });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  handleDisconnect(client: Socket) {
    this.activeSessions.delete(client.id);
  }
}
