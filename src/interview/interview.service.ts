import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';

import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InviteCandidateDto } from './dto/invite-candidate.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

import { Interview } from './schemas/interview.schema';
import { CandidateInterview } from './schemas/candidate-interview.schema';
import { Candidate } from 'src/candidate/schemas/candidate.schema';

@Injectable()
export class InterviewService {
  constructor(
    @InjectModel(Interview.name)
    private readonly interviewModel: Model<Interview>,
    @InjectModel(Candidate.name)
    private readonly candidateModel: Model<Candidate>,
    @InjectModel(CandidateInterview.name)
    private readonly candidateInterviewModel: Model<CandidateInterview>,
  ) {}

  async create(createInterviewDto: CreateInterviewDto) {
    const interview = new this.interviewModel(createInterviewDto);
    return interview.save();
  }

  async getAll(recruiterId: string, paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [interviews, total] = await Promise.all([
      this.interviewModel
        .find({ recruiter: recruiterId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.interviewModel.countDocuments({ recruiter: recruiterId }),
    ]);

    return {
      data: interviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInterviewWithResults(interviewId: string, recruiterId: string) {
    const interview = await this.interviewModel.findOne({
      _id: interviewId,
      recruiter: recruiterId,
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const candidateInterviews = await this.candidateInterviewModel
      .find({ interviewId })
      .populate({
        path: 'candidateId',
        select: 'firstName lastName email',
      })
      .select('status results createdAt updatedAt');

    return {
      interview,
      candidates: candidateInterviews.map((ci) => ({
        candidate: ci.candidateId,
        status: ci.status,
        results: ci.results,
        createdAt: ci.createdAt,
        updatedAt: ci.updatedAt,
      })),
    };
  }

  async update(interviewId: string, updateInterviewDto: UpdateInterviewDto) {
    const interview = await this.interviewModel.findOneAndUpdate(
      { _id: interviewId },
      { $set: updateInterviewDto },
      { new: true },
    );

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async delete(interviewId: string) {
    // Get all candidate interviews before deletion for reference cleanup
    const candidateInterviews = await this.candidateInterviewModel
      .find({ interviewId })
      .select('candidateId');

    const interview = await this.interviewModel.findByIdAndDelete(interviewId);

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    // Delete all candidate interviews
    await this.candidateInterviewModel.deleteMany({ interviewId });

    // Remove interview references from candidates
    if (candidateInterviews.length > 0) {
      await this.candidateModel.updateMany(
        { _id: { $in: candidateInterviews.map((ci) => ci.candidateId) } },
        {
          $pull: {
            interviews: { $in: candidateInterviews.map((ci) => ci._id) },
          },
        },
      );
    }

    return interview;
  }

  async inviteCandidate(interviewId: string, inviteDto: InviteCandidateDto) {
    const interview = await this.interviewModel.findById(interviewId);
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    let candidate = await this.candidateModel.findOne({
      email: inviteDto.email,
    });
    const invitationToken = uuidv4();

    if (!candidate) {
      candidate = new this.candidateModel({ ...inviteDto });
    }

    const candidateInterview = new this.candidateInterviewModel({
      candidateId: candidate._id,
      interviewId,
      status: 'INVITED',
      invitationToken,
    });

    candidate.interviews.push(candidateInterview);

    await candidate.save();
    await candidateInterview.save();
    // await this.mailService.sendInterviewInvitation(
    //   candidate.email,
    //   invitationToken,
    //   interview.title,
    // );
  }

  async getResults(interviewId: string) {
    const candidateInterview = await this.candidateInterviewModel.findOne({
      interviewId,
    });

    return candidateInterview;
  }

  async validateInvitationToken(token: string) {
    const candidateInterview = await this.candidateInterviewModel
      .findOne({
        invitationToken: token,
      })
      .populate({ path: 'candidateId' })
      .populate({ path: 'interviewId' });

    if (!candidateInterview) {
      throw new NotFoundException('Invalid invitation token');
    }

    return candidateInterview;
  }

  async updateInterviewStatus(
    interviewId: string,
    candidateId: string,
    status: any,
  ) {
    return this.candidateInterviewModel.updateOne(
      {
        interviewId: interviewId,
        candidateId: candidateId,
      },
      { $set: { status } },
    );
  }

  async saveInterviewResults(
    interviewId: string,
    candidateId: string,
    results: any,
  ) {
    this.candidateInterviewModel
      .updateOne(
        { interviewId, candidateId },
        { $set: { results, status: 'COMPLETED' } },
      )
      .exec();
  }
}
