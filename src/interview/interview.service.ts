import { Model, Types } from 'mongoose';
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

import { MailService } from 'src/mail/mail.service';
import { InterviewStatus } from './enums/interview.enum';
import { InterviewStatus as CaInterviewStatus } from './enums/candidateInterview.enum';

@Injectable()
export class InterviewService {
  constructor(
    @InjectModel(Interview.name)
    private readonly interviewModel: Model<Interview>,
    @InjectModel(Candidate.name)
    private readonly candidateModel: Model<Candidate>,
    @InjectModel(CandidateInterview.name)
    private readonly candidateInterviewModel: Model<CandidateInterview>,
    private readonly mailService: MailService,
  ) {}

  async create(recruiterId: string, createInterviewDto: CreateInterviewDto) {
    const interview = new this.interviewModel({
      recruiter: recruiterId,
      ...createInterviewDto,
    });
    return interview.save();
  }

  async getAll(
    recruiterId: string,
    paginationDto: PaginationDto,
    status: InterviewStatus,
  ) {
    const { page, limit, search } = paginationDto;
    const skip = (page - 1) * limit;

    const matchStage: any = {
      recruiter: recruiterId,
    };

    if (status) {
      matchStage.status = status;
    }

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
      ];
    }

    const interviews = await this.interviewModel.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'candidateinterviews',
          localField: '_id',
          foreignField: 'interviewId',
          as: 'candidateInterviews',
        },
      },
      {
        $addFields: {
          candidates: { $size: '$candidateInterviews' },
          invited: {
            $size: {
              $filter: {
                input: '$candidateInterviews',
                cond: { $eq: ['$$this.status', CaInterviewStatus.INVITED] },
              },
            },
          },
          started: {
            $size: {
              $filter: {
                input: '$candidateInterviews',
                cond: { $eq: ['$$this.status', CaInterviewStatus.STARTED] },
              },
            },
          },
          completed: {
            $size: {
              $filter: {
                input: '$candidateInterviews',
                cond: { $eq: ['$$this.status', CaInterviewStatus.COMPLETED] },
              },
            },
          },
          disqualified: {
            $size: {
              $filter: {
                input: '$candidateInterviews',
                cond: {
                  $eq: ['$$this.status', CaInterviewStatus.DISQUALIFIED],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          completed_percentage: {
            $cond: [
              { $eq: ['$candidates', 0] },
              null,
              {
                $multiply: [{ $divide: ['$completed', '$candidates'] }, 100],
              },
            ],
          },
        },
      },
      {
        $project: {
          candidateInterviews: 0,
        },
      },
    ]);

    const total = await this.interviewModel.countDocuments(matchStage);

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
        stage: ci.stage,
        status: ci.status,
        technicalInterview: ci.technicalInterview,
        technicalAssessment: ci.technicalAssessment,
        createdAt: ci.createdAt,
        updatedAt: ci.updatedAt,
      })),
    };
  }

  async getAllInvitableInterviews(candidateId: string, recruiterId: string) {
    const pipeline = [
      // Match active interviews belonging to recruiter
      {
        $match: {
          recruiter: recruiterId,
          status: InterviewStatus.ACTIVE,
        },
      },
      // Lookup candidate's existing interviews
      {
        $lookup: {
          from: 'candidateinterviews',
          let: { interviewId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$candidateId', new Types.ObjectId(candidateId)] },
                    { $eq: ['$interviewId', '$$interviewId'] },
                  ],
                },
              },
            },
          ],
          as: 'existingInvitations',
        },
      },
      // Filter out interviews with existing invitations
      {
        $match: {
          existingInvitations: { $size: 0 },
        },
      },
      // Project only required fields
      {
        $project: {
          _id: 1,
          name: 1,
        },
      },
    ];

    return await this.interviewModel.aggregate(pipeline);
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

  async inviteCandidate(
    interviewId: string,
    recruiterId: string,
    inviteDto: InviteCandidateDto,
  ) {
    const interview = await this.interviewModel.findById(interviewId);
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    let candidate = await this.candidateModel.findOne({
      email: inviteDto.email,
      recruiter: recruiterId,
    });
    const invitationToken = uuidv4();

    if (!candidate) {
      candidate = new this.candidateModel({
        ...inviteDto,
        recruiter: recruiterId,
      });
    }

    const candidateInterview = new this.candidateInterviewModel({
      candidateId: candidate._id,
      interviewId,
      invitationToken,
    });

    candidate.interviews.push(candidateInterview);

    await candidate.save();
    await candidateInterview.save();

    // TODO: Add Company info and Change URL
    this.mailService.sendInterviewInvitation(candidate.email, {
      name: `${candidate.firstName} ${candidate.lastName}`,
      role: interview.role,
      company: 'IFS',
      invitationLink: `http://localhost:3001/interview?token=${invitationToken}`,
    });
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
