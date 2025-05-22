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
import { Types } from 'mongoose';
import { User } from '@clerk/express';
import { ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

import { InterviewService } from './interview.service';
import { MongoIdPipe } from 'src/common/pipes/mongo-id.pipe';
import { Public } from 'src/common/decorators/public.decorator';
import { ClerkAuthGuard } from 'src/common/guards/clerk-auth.guard';
import { Recruiter } from 'src/common/decorators/recruiter.decorator';

import { InterviewStatus } from './enums/interview.enum';
import {
  HiringStage,
  InterviewStatus as CaInterviewStatus,
} from './enums/candidateInterview.enum';

import { InviteExistingDto } from './dto/invite-existing.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InviteCandidateDto } from './dto/invite-candidate.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { UpdateCandidateInterviewDto } from './dto/update-candidate-interview.dto';

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
  @ApiParam({ name: 'id', type: String })
  async getInterview(
    @Param('id', MongoIdPipe) id: Types.ObjectId,
    @Recruiter() recruiter: User,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.getInterview(id, recruiterId);
  }

  @Get(':id/candidates')
  @ApiOperation({ summary: 'Get all candidates related interview' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'stage', enum: HiringStage, required: false })
  @ApiQuery({ name: 'status', enum: CaInterviewStatus, required: false })
  async getInterviewCandidates(
    @Param('id', MongoIdPipe) interviewId: Types.ObjectId,
    @Recruiter() recruiter: User,
    @Query() paginationDto: PaginationDto,
    @Query('stage') stage?: HiringStage,
    @Query('status') status?: CaInterviewStatus,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.getInterviewCandidates(
      interviewId,
      recruiterId,
      paginationDto,
      stage,
      status,
    );
  }

  @Get('candidates/:id/invitable')
  @ApiOperation({ summary: 'Get all invitable interviews' })
  @ApiParam({ name: 'id', type: String })
  getAllInvitableInterviews(
    @Param('id', MongoIdPipe) candidateId: Types.ObjectId,
    @Recruiter() recruiter: User,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.getAllInvitableInterviews(
      candidateId,
      recruiterId,
    );
  }

  @Get(':id/candidates/:candidateId/details')
  @ApiOperation({ summary: 'Get candidate specific interview details' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'candidateId', type: String })
  async getCandidateInterviewDetails(
    @Param('id', MongoIdPipe) interviewId: Types.ObjectId,
    @Param('candidateId', MongoIdPipe) candidateId: Types.ObjectId,
    @Recruiter() recruiter: User,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.getCandidateInterviewDetails(
      interviewId,
      candidateId,
      recruiterId,
    );
  }

  @Post(':id/invite-existing')
  @ApiOperation({ summary: 'Invite an existing candidate to a new interview' })
  @ApiParam({ name: 'id', type: String })
  async inviteExistingCandidate(
    @Param('id', MongoIdPipe) interviewId: Types.ObjectId,
    @Recruiter() recruiter: User,
    @Body() inviteDto: InviteExistingDto,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.inviteExistingCandidate(
      interviewId,
      recruiterId,
      inviteDto.candidateId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update interview details' })
  @ApiParam({ name: 'id', type: String })
  async updateInterview(
    @Param('id', MongoIdPipe) id: Types.ObjectId,
    @Body() updateInterviewDto: UpdateInterviewDto,
  ) {
    return this.interviewService.update(id, updateInterviewDto);
  }

  @Patch(':id/candidates/:candidateId')
  @ApiOperation({ summary: 'Update candidate interview details' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'candidateId', type: String })
  async updateCandidateInterview(
    @Param('id', MongoIdPipe) interviewId: Types.ObjectId,
    @Param('candidateId', MongoIdPipe) candidateId: Types.ObjectId,
    @Body() updateDto: UpdateCandidateInterviewDto,
    @Recruiter() recruiter: User,
  ) {
    const recruiterId = recruiter.id;
    return this.interviewService.updateCandidateInterview(
      interviewId,
      candidateId,
      recruiterId,
      updateDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an interview' })
  @ApiParam({ name: 'id', type: String })
  async deleteInterview(@Param('id', MongoIdPipe) id: Types.ObjectId) {
    return this.interviewService.delete(id);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a candidate to an interview' })
  @ApiParam({ name: 'id', type: String })
  async inviteCandidate(
    @Param('id', MongoIdPipe) interviewId: Types.ObjectId,
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

  @Public()
  @Get('validate-invitation/:token')
  @ApiOperation({ summary: 'Validate invitation token' })
  async validateInvitation(@Param('token') token: string) {
    return this.interviewService.validateInvitation(token);
  }
}
