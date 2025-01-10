import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { InterviewService } from './interview.service';

import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InviteCandidateDto } from './dto/invite-candidate.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  async createInterview(@Body() createInterviewDto: CreateInterviewDto) {
    return this.interviewService.create(createInterviewDto);
  }

  @Get()
  async getAll(
    @Query() paginationDto: PaginationDto,
    @Query('recruiterId') recruiterId: string,
  ) {
    return this.interviewService.getAll(recruiterId, paginationDto);
  }

  @Get(':id')
  async getInterview(
    @Param('id') id: string,
    @Query('recruiterId') recruiterId: string,
  ) {
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

  @Get(':id/results')
  async getInterviewResults(@Param('id') interviewId: string) {
    return this.interviewService.getResults(interviewId);
  }
}
