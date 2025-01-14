import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User } from '@clerk/express';

import { InterviewService } from './interview.service';
import { InterviewStatus } from './enums/interview.enum';
import { ClerkAuthGuard } from 'src/common/guards/clerk-auth.guard';
import { Recruiter } from 'src/common/decorators/recruiter.decorator';

import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InviteCandidateDto } from './dto/invite-candidate.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

@Controller('interview')
@UseGuards(ClerkAuthGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  async createInterview(
    @Recruiter() recruiter: User,
    @Body() createInterviewDto: CreateInterviewDto,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.create(recruiterId, createInterviewDto);
  }

  @Get()
  async getAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status: InterviewStatus,
    @Recruiter() recruiter: User,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.getAll(recruiterId, paginationDto, status);
  }

  @Get(':id')
  async getInterview(@Param('id') id: string, @Recruiter() recruiter: User) {
    const recruiterId = recruiter.id;
    return this.interviewService.getInterviewWithResults(id, recruiterId);
  }

  @Patch(':id')
  async updateInterview(
    @Param('id') id: string,
    @Body() updateInterviewDto: UpdateInterviewDto,
  ) {
    return this.interviewService.update(id, updateInterviewDto);
  }

  @Delete(':id')
  async deleteInterview(@Param('id') id: string) {
    return this.interviewService.delete(id);
  }

  @Post(':id/invite')
  async inviteCandidate(
    @Param('id') interviewId: string,
    @Body() inviteDto: InviteCandidateDto,
  ) {
    return this.interviewService.inviteCandidate(interviewId, inviteDto);
  }
}
