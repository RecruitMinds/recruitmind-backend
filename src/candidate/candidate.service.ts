import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { Candidate } from './schemas/candidate.schema';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CandidateInterview } from 'src/interview/schemas/candidate-interview.schema';

@Injectable()
export class CandidateService {
  constructor(
    @InjectModel(Candidate.name)
    private readonly candidateModel: Model<Candidate>,
    @InjectModel(CandidateInterview.name)
    private readonly candidateInterviewModel: Model<CandidateInterview>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async getAll(
    recruiterId: string,
    paginationDto: PaginationDto,
    interview?: string,
  ) {
    const { page, limit, search } = paginationDto;
    const skip = (page - 1) * limit;

    const matchStage: any = { recruiter: recruiterId };

    if (search) {
      matchStage.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

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

  async delete(id: string, recruiterId: string): Promise<void> {
    try {
      const candidateId = new Types.ObjectId(id);

      // Find the candidate first to ensure it exists and belongs to the recruiter
      const candidate = await this.candidateModel.findOne({
        _id: candidateId,
        recruiter: recruiterId,
      });

      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      // Delete all related candidate interviews using the interviews array
      if (candidate.interviews?.length > 0) {
        await this.candidateInterviewModel.deleteMany({
          _id: { $in: candidate.interviews },
        });
      }

      // Delete the candidate
      await this.candidateModel.findByIdAndDelete(candidateId);
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException('Invalid candidate ID');
      }
      if (!(error instanceof NotFoundException)) {
        throw new InternalServerErrorException('Error deleting candidate');
      }
      throw error;
    }
  }
}
