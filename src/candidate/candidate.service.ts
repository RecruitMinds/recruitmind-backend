import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Candidate } from './schemas/candidate.schema';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class CandidateService {
  constructor(
    @InjectModel(Candidate.name)
    private readonly candidateModel: Model<Candidate>,
  ) {}

  async getAll(
    recruiterId: string,
    paginationDto: PaginationDto,
    interview?: string,
  ) {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const matchStage = { recruiter: recruiterId };
    const pipeline: any[] = [
      {
        $lookup: {
          from: 'candidateinterviews',
          localField: 'interviews',
          foreignField: '_id',
          as: 'interviewDetails',
        },
      },
    ];

    if (interview) {
      pipeline.push({
        $match: {
          'interviewDetails.interviewId': new Types.ObjectId(interview),
        },
      });
    }

    pipeline.push(
      { $match: matchStage },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 1,
          email: 1,
          fullName: { $concat: ['$firstName', ' ', '$lastName'] },
          interviews_count: { $size: '$interviews' },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    );

    const [candidates, total] = await Promise.all([
      this.candidateModel.aggregate(pipeline),
      this.candidateModel.countDocuments(matchStage),
    ]);

    return {
      data: candidates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
