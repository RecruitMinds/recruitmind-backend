import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InviteCandidateDto } from './dto/invite-candidate.dto';

@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  async createInterview(@Body() createInterviewDto: CreateInterviewDto) {
    return this.interviewService.create(createInterviewDto);
  }

  @Post(':id/invite')
  async inviteCandidate(
    @Param('id') interviewId: string,
    @Body() inviteDto: InviteCandidateDto,
  ) {
    return this.interviewService.inviteCandidate(interviewId, inviteDto);
  }

  @Get(':id/results')
  async getInterviewResults(@Param('id') interviewId: string) {
    return this.interviewService.getResults(interviewId);
  }
}
