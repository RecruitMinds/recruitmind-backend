import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InviteCandidateDto } from './dto/invite-candidate.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
