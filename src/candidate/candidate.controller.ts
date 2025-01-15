import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { User } from '@clerk/express';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

import { CandidateService } from './candidate.service';
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
    return this.candidateService.getAll(recruiterId, paginationDto, interview);
  }
}
