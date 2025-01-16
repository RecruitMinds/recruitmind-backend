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
import { ApiOperation } from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Create a new interview' })
  async createInterview(
    @Recruiter() recruiter: User,
    @Body() createInterviewDto: CreateInterviewDto,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.create(recruiterId, createInterviewDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all interviews with pagination and filters' })
  async getAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status: InterviewStatus,
    @Recruiter() recruiter: User,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.getAll(recruiterId, paginationDto, status);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get simplified list of active interviews' })
  async getInterviewList(@Recruiter() recruiter: User) {
    const recruiterId = recruiter.id;
    return this.interviewService.getInterviewList(recruiterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview detail' })
  async getInterview(@Param('id') id: string, @Recruiter() recruiter: User) {
    const recruiterId = recruiter.id;
    return this.interviewService.getInterview(id, recruiterId);
  }

  @Get('candidates/:id/invitable')
  @ApiOperation({ summary: 'Get all invitable interviews' })
  getAllInvitableInterviews(
    @Param('id') candidateId: string,
    @Recruiter() recruiter: User,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.getAllInvitableInterviews(
      candidateId,
      recruiterId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update interview details' })
  async updateInterview(
    @Param('id') id: string,
    @Body() updateInterviewDto: UpdateInterviewDto,
  ) {
    return this.interviewService.update(id, updateInterviewDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an interview' })
  async deleteInterview(@Param('id') id: string) {
    return this.interviewService.delete(id);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a candidate to an interview' })
  async inviteCandidate(
    @Param('id') interviewId: string,
    @Recruiter() recruiter: User,
    @Body() inviteDto: InviteCandidateDto,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.inviteCandidate(
      interviewId,
      recruiterId,
      inviteDto,
    );
  }
}
