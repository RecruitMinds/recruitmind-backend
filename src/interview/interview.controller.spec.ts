import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { User } from '@clerk/express';

import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';

import { InterviewStatus } from './enums/interview.enum';
import {
  HiringStage,
  InterviewStatus as CaInterviewStatus,
} from './enums/candidateInterview.enum';

import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { InviteCandidateDto } from './dto/invite-candidate.dto';
import { InviteExistingDto } from './dto/invite-existing.dto';
import { UpdateCandidateInterviewDto } from './dto/update-candidate-interview.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

// Mock the InterviewService to avoid dependency issues
const mockInterviewService = {
  create: jest.fn(),
  getAll: jest.fn(),
  getInterviewList: jest.fn(),
  getInterview: jest.fn(),
  getInterviewCandidates: jest.fn(),
  getAllInvitableInterviews: jest.fn(),
  getCandidateInterviewDetails: jest.fn(),
  inviteExistingCandidate: jest.fn(),
  update: jest.fn(),
  updateCandidateInterview: jest.fn(),
  delete: jest.fn(),
  inviteCandidate: jest.fn(),
  validateInvitation: jest.fn(),
};

describe('InterviewController', () => {
  let controller: InterviewController;

  const mockUser: User = {
    id: 'recruiter-123',
    emailAddresses: [{ emailAddress: 'recruiter@test.com' }],
  } as User;

  const mockObjectId = new Types.ObjectId();
  const mockCandidateId = new Types.ObjectId();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterviewController],
      providers: [
        {
          provide: InterviewService,
          useValue: mockInterviewService,
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<InterviewController>(InterviewController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createInterview', () => {
    it('should create a new interview', async () => {
      const createInterviewDto: CreateInterviewDto = {
        name: 'Software Engineer Interview',
        experience: '3-5 years',
        skills: ['JavaScript', 'Node.js', 'React'],
        role: 'Software Engineer',
        location: 'New York',
        workArrangements: 'remote' as any,
        includeTechnicalAssessment: true,
        skillLevel: 'medium' as any,
        status: InterviewStatus.ACTIVE,
      };

      const expectedResult = { id: mockObjectId, ...createInterviewDto };
      mockInterviewService.create.mockResolvedValue(expectedResult);

      const result = await controller.createInterview(
        mockUser,
        createInterviewDto,
      );

      expect(mockInterviewService.create).toHaveBeenCalledWith(
        mockUser.id,
        createInterviewDto,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const createInterviewDto: CreateInterviewDto = {
        name: 'Test Interview',
        experience: '2 years',
        skills: ['Python'],
        role: 'Developer',
        location: 'Remote',
        workArrangements: 'remote' as any,
        includeTechnicalAssessment: false,
        status: InterviewStatus.INACTIVE,
      };

      mockInterviewService.create.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.createInterview(mockUser, createInterviewDto),
      ).rejects.toThrow('Service error');
    });
  });

  describe('getAll', () => {
    it('should get all interviews with pagination and filters', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const status = InterviewStatus.ACTIVE;
      const expectedResult = {
        data: [{ id: mockObjectId, name: 'Test Interview' }],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockInterviewService.getAll.mockResolvedValue(expectedResult);

      const result = await controller.getAll(paginationDto, status, mockUser);

      expect(mockInterviewService.getAll).toHaveBeenCalledWith(
        mockUser.id,
        paginationDto,
        status,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should get all interviews without status filter', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [{ id: mockObjectId, name: 'Test Interview' }],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockInterviewService.getAll.mockResolvedValue(expectedResult);

      const result = await controller.getAll(
        paginationDto,
        undefined,
        mockUser,
      );

      expect(mockInterviewService.getAll).toHaveBeenCalledWith(
        mockUser.id,
        paginationDto,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getInterviewList', () => {
    it('should get simplified list of active interviews', async () => {
      const expectedResult = [
        { id: mockObjectId, name: 'Interview 1' },
        { id: new Types.ObjectId(), name: 'Interview 2' },
      ];

      mockInterviewService.getInterviewList.mockResolvedValue(expectedResult);

      const result = await controller.getInterviewList(mockUser);

      expect(mockInterviewService.getInterviewList).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getInterview', () => {
    it('should get interview detail by id', async () => {
      const expectedResult = {
        id: mockObjectId,
        name: 'Test Interview',
        status: InterviewStatus.ACTIVE,
      };

      mockInterviewService.getInterview.mockResolvedValue(expectedResult);

      const result = await controller.getInterview(mockObjectId, mockUser);

      expect(mockInterviewService.getInterview).toHaveBeenCalledWith(
        mockObjectId,
        mockUser.id,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle not found interview', async () => {
      mockInterviewService.getInterview.mockRejectedValue(
        new Error('Interview not found'),
      );

      await expect(
        controller.getInterview(mockObjectId, mockUser),
      ).rejects.toThrow('Interview not found');
    });
  });

  describe('getInterviewCandidates', () => {
    it('should get interview candidates with all filters', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const stage = HiringStage.NEW;
      const status = CaInterviewStatus.INVITED;
      const expectedResult = {
        data: [{ id: mockCandidateId, name: 'John Doe' }],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockInterviewService.getInterviewCandidates.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getInterviewCandidates(
        mockObjectId,
        mockUser,
        paginationDto,
        stage,
        status,
      );

      expect(mockInterviewService.getInterviewCandidates).toHaveBeenCalledWith(
        mockObjectId,
        mockUser.id,
        paginationDto,
        stage,
        status,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should get interview candidates without optional filters', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [{ id: mockCandidateId, name: 'John Doe' }],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockInterviewService.getInterviewCandidates.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getInterviewCandidates(
        mockObjectId,
        mockUser,
        paginationDto,
      );

      expect(mockInterviewService.getInterviewCandidates).toHaveBeenCalledWith(
        mockObjectId,
        mockUser.id,
        paginationDto,
        undefined,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAllInvitableInterviews', () => {
    it('should get all invitable interviews for a candidate', async () => {
      const expectedResult = [
        { id: mockObjectId, name: 'Interview 1' },
        { id: new Types.ObjectId(), name: 'Interview 2' },
      ];

      mockInterviewService.getAllInvitableInterviews.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getAllInvitableInterviews(
        mockCandidateId,
        mockUser,
      );

      expect(
        mockInterviewService.getAllInvitableInterviews,
      ).toHaveBeenCalledWith(mockCandidateId, mockUser.id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getCandidateInterviewDetails', () => {
    it('should get candidate specific interview details', async () => {
      const expectedResult = {
        interview: { id: mockObjectId, name: 'Test Interview' },
        candidate: { id: mockCandidateId, name: 'John Doe' },
        status: CaInterviewStatus.INVITED,
      };

      mockInterviewService.getCandidateInterviewDetails.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getCandidateInterviewDetails(
        mockObjectId,
        mockCandidateId,
        mockUser,
      );

      expect(
        mockInterviewService.getCandidateInterviewDetails,
      ).toHaveBeenCalledWith(mockObjectId, mockCandidateId, mockUser.id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('inviteExistingCandidate', () => {
    it('should invite an existing candidate to interview', async () => {
      const inviteDto: InviteExistingDto = {
        candidateId: mockCandidateId,
      };
      const expectedResult = {
        success: true,
        message: 'Candidate invited successfully',
      };

      mockInterviewService.inviteExistingCandidate.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.inviteExistingCandidate(
        mockObjectId,
        mockUser,
        inviteDto,
      );

      expect(mockInterviewService.inviteExistingCandidate).toHaveBeenCalledWith(
        mockObjectId,
        mockUser.id,
        inviteDto.candidateId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateInterview', () => {
    it('should update interview details', async () => {
      const updateDto: UpdateInterviewDto = {
        name: 'Updated Interview Name',
        status: InterviewStatus.ARCHIVED,
      };
      const expectedResult = { id: mockObjectId, ...updateDto };

      mockInterviewService.update.mockResolvedValue(expectedResult);

      const result = await controller.updateInterview(mockObjectId, updateDto);

      expect(mockInterviewService.update).toHaveBeenCalledWith(
        mockObjectId,
        updateDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateCandidateInterview', () => {
    it('should update candidate interview details', async () => {
      const updateDto: UpdateCandidateInterviewDto = {
        stage: HiringStage.INTERVIEWED,
        status: CaInterviewStatus.COMPLETED,
      };
      const expectedResult = { success: true, updated: updateDto };

      mockInterviewService.updateCandidateInterview.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.updateCandidateInterview(
        mockObjectId,
        mockCandidateId,
        updateDto,
        mockUser,
      );

      expect(
        mockInterviewService.updateCandidateInterview,
      ).toHaveBeenCalledWith(
        mockObjectId,
        mockCandidateId,
        mockUser.id,
        updateDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteInterview', () => {
    it('should delete an interview', async () => {
      const expectedResult = {
        success: true,
        message: 'Interview deleted successfully',
      };

      mockInterviewService.delete.mockResolvedValue(expectedResult);

      const result = await controller.deleteInterview(mockObjectId);

      expect(mockInterviewService.delete).toHaveBeenCalledWith(mockObjectId);
      expect(result).toEqual(expectedResult);
    });

    it('should handle delete errors', async () => {
      mockInterviewService.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.deleteInterview(mockObjectId)).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('inviteCandidate', () => {
    it('should invite a new candidate to interview', async () => {
      const inviteDto: InviteCandidateDto = {
        candidates: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'candidate@test.com',
          },
        ],
      };
      const expectedResult = { success: true, invitationSent: true };

      mockInterviewService.inviteCandidate.mockResolvedValue(expectedResult);

      const result = await controller.inviteCandidate(
        mockObjectId,
        mockUser,
        inviteDto,
      );

      expect(mockInterviewService.inviteCandidate).toHaveBeenCalledWith(
        mockObjectId,
        mockUser.id,
        inviteDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('validateInvitation', () => {
    it('should validate invitation token', async () => {
      const token = 'valid-token-123';
      const expectedResult = {
        valid: true,
        interview: { id: mockObjectId, name: 'Test Interview' },
        candidate: { id: mockCandidateId, name: 'John Doe' },
      };

      mockInterviewService.validateInvitation.mockResolvedValue(expectedResult);

      const result = await controller.validateInvitation(token);

      expect(mockInterviewService.validateInvitation).toHaveBeenCalledWith(
        token,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle invalid token', async () => {
      const token = 'invalid-token';
      const expectedResult = {
        valid: false,
        message: 'Invalid or expired token',
      };

      mockInterviewService.validateInvitation.mockResolvedValue(expectedResult);

      const result = await controller.validateInvitation(token);

      expect(mockInterviewService.validateInvitation).toHaveBeenCalledWith(
        token,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
