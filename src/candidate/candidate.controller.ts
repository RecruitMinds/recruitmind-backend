import {
  Controller,
  Get,
  UseGuards,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { User } from '@clerk/express';
import { ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

import { CandidateService } from './candidate.service';
import { MongoIdPipe } from 'src/common/pipes/mongo-id.pipe';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ClerkAuthGuard } from 'src/common/guards/clerk-auth.guard';
import { Recruiter } from 'src/common/decorators/recruiter.decorator';

@Controller('candidate')
@UseGuards(ClerkAuthGuard)
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all candidates with filters' })
  @ApiQuery({ name: 'interview', required: false, type: String })
  getAll(
    @Query() paginationDto: PaginationDto,
    @Query('interview') interview: string,
    @Recruiter() recruiter: User,
  ) {
    const recruiterId = recruiter.id;
    const interviewId = interview
      ? new MongoIdPipe().transform(interview)
      : undefined;

    return this.candidateService.getAll(
      recruiterId,
      paginationDto,
      interviewId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific candidate information' })
  @ApiParam({ name: 'id', type: String })
  async getCandidate(
    @Param('id', MongoIdPipe) id: Types.ObjectId,
    @Recruiter() recruiter: User,
  ) {
    return this.candidateService.getCandidateById(id, recruiter.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a candidate' })
  @ApiParam({ name: 'id', type: String })
  async delete(
    @Param('id', MongoIdPipe) id: Types.ObjectId,
    @Recruiter() recruiter: User,
  ): Promise<void> {
    await this.candidateService.delete(id, recruiter.id);
  }
}
