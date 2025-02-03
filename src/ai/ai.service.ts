import { Injectable } from '@nestjs/common';

import { AssessmentAiService } from './services/assessment.ai.service';
import { InterviewAiService } from './services/interview.ai.service';

@Injectable()
export class AiService {
  constructor(
    private readonly assessmentAiService: AssessmentAiService,
    private readonly interviewAiService: InterviewAiService,
  ) {}

  // Interview
  async startTechnicalInterview(sessionId: string) {
    return this.interviewAiService.startInterview(sessionId);
  }

  async handleInteviewResponse(sessionId: string, message: string) {
    return this.interviewAiService.handleResponse(sessionId, message);
  }

  async evaluateInterview(sessionId: string) {
    return this.interviewAiService.evaluateInterview(sessionId);
  }

  // Assessment
  async startAssessmentInterview() {}

  async handleAssessmentResponse() {}

  async evaluateAssessment(sessionId: string) {}
}
