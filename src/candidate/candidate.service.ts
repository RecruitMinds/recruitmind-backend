import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';

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
  ) {}

  async getAll(
    recruiterId: string,
    paginationDto: PaginationDto,
    interview?: Types.ObjectId,
  ) {
    const { page, limit, search } = paginationDto;
    const skip = (page - 1) * limit;

    const basePipeline: PipelineStage[] = [
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
      basePipeline.push({
        $match: {
          'interviewDetails.interviewId': interview,
        },
      });
    }

    const matchStage: any = { recruiter: recruiterId };
    if (search) {
      matchStage.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    basePipeline.push({ $match: matchStage });

    const [candidates, [countResult]] = await Promise.all([
      this.candidateModel.aggregate([
        ...basePipeline,
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
      ]),
      this.candidateModel.aggregate([...basePipeline, { $count: 'total' }]),
    ]);

    const total = countResult?.total || 0;

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

  async getCandidateById(id: Types.ObjectId, recruiterId: string) {
    const candidate = await this.candidateModel.findOne({
      _id: id,
      recruiter: recruiterId,
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    return {
      _id: candidate._id,
      email: candidate.email,
      fullName: candidate.fullName,
      interviews_count: candidate.interviews?.length || 0,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  }

  async delete(id: Types.ObjectId, recruiterId: string): Promise<void> {
    try {
      // Find the candidate first to ensure it exists and belongs to the recruiter
      const candidate = await this.candidateModel.findOne({
        _id: id,
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
      await this.candidateModel.findByIdAndDelete(id);
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
