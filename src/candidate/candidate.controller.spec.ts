import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { User } from '@clerk/express';

import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
const mockCandidateService = {
  getAll: jest.fn(),
  getCandidateById: jest.fn(),
  delete: jest.fn(),
};

describe('CandidateController', () => {
  let controller: CandidateController;

  const mockUser: User = {
    id: 'recruiter-123',
    emailAddresses: [{ emailAddress: 'recruiter@test.com' }],
  } as User;

  const mockObjectId = new Types.ObjectId();
  const mockInterviewId = new Types.ObjectId();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateController],
      providers: [
        {
          provide: CandidateService,
          useValue: mockCandidateService,
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CandidateController>(CandidateController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAll', () => {
    it('should get all candidates with pagination', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [
          {
            id: mockObjectId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@test.com',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockCandidateService.getAll.mockResolvedValue(expectedResult);

      const result = await controller.getAll(
        paginationDto,
        undefined,
        mockUser,
      );

      expect(mockCandidateService.getAll).toHaveBeenCalledWith(
        mockUser.id,
        paginationDto,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should get all candidates with interview filter', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const interviewFilter = mockInterviewId.toString();
      const expectedResult = {
        data: [
          {
            id: mockObjectId,
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@test.com',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockCandidateService.getAll.mockResolvedValue(expectedResult);

      const result = await controller.getAll(
        paginationDto,
        interviewFilter,
        mockUser,
      );

      expect(mockCandidateService.getAll).toHaveBeenCalledWith(
        mockUser.id,
        paginationDto,
        mockInterviewId,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      mockCandidateService.getAll.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getAll(paginationDto, undefined, mockUser),
      ).rejects.toThrow('Service error');
    });
  });

  describe('getCandidate', () => {
    it('should get specific candidate information', async () => {
      const expectedResult = {
        id: mockObjectId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        interviews: [
          {
            id: mockInterviewId,
            name: 'Software Engineer Interview',
            status: 'invited',
          },
        ],
      };

      mockCandidateService.getCandidateById.mockResolvedValue(expectedResult);

      const result = await controller.getCandidate(mockObjectId, mockUser);

      expect(mockCandidateService.getCandidateById).toHaveBeenCalledWith(
        mockObjectId,
        mockUser.id,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle candidate not found', async () => {
      mockCandidateService.getCandidateById.mockRejectedValue(
        new Error('Candidate not found'),
      );

      await expect(
        controller.getCandidate(mockObjectId, mockUser),
      ).rejects.toThrow('Candidate not found');
    });

    it('should handle unauthorized access', async () => {
      mockCandidateService.getCandidateById.mockRejectedValue(
        new Error('Unauthorized access'),
      );

      await expect(
        controller.getCandidate(mockObjectId, mockUser),
      ).rejects.toThrow('Unauthorized access');
    });
  });

  describe('delete', () => {
    it('should delete a candidate successfully', async () => {
      mockCandidateService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockObjectId, mockUser);

      expect(mockCandidateService.delete).toHaveBeenCalledWith(
        mockObjectId,
        mockUser.id,
      );
      expect(result).toBeUndefined();
    });

    it('should handle delete errors', async () => {
      mockCandidateService.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.delete(mockObjectId, mockUser)).rejects.toThrow(
        'Delete failed',
      );
    });

    it('should handle candidate not found during delete', async () => {
      mockCandidateService.delete.mockRejectedValue(
        new Error('Candidate not found'),
      );

      await expect(controller.delete(mockObjectId, mockUser)).rejects.toThrow(
        'Candidate not found',
      );
    });

    it('should handle unauthorized delete attempt', async () => {
      mockCandidateService.delete.mockRejectedValue(
        new Error('Unauthorized to delete this candidate'),
      );

      await expect(controller.delete(mockObjectId, mockUser)).rejects.toThrow(
        'Unauthorized to delete this candidate',
      );
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle empty pagination parameters', async () => {
      const paginationDto: PaginationDto = { page: 0, limit: 0 };
      const expectedResult = { data: [], total: 0, page: 0, limit: 0 };

      mockCandidateService.getAll.mockResolvedValue(expectedResult);

      const result = await controller.getAll(
        paginationDto,
        undefined,
        mockUser,
      );

      expect(mockCandidateService.getAll).toHaveBeenCalledWith(
        mockUser.id,
        paginationDto,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle large pagination limits', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 1000 };
      const expectedResult = { data: [], total: 0, page: 1, limit: 1000 };

      mockCandidateService.getAll.mockResolvedValue(expectedResult);

      const result = await controller.getAll(
        paginationDto,
        undefined,
        mockUser,
      );

      expect(mockCandidateService.getAll).toHaveBeenCalledWith(
        mockUser.id,
        paginationDto,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
