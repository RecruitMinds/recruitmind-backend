import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class InviteExistingDto {
  @ApiProperty({ type: String })
  @Transform(
    ({ value }) => {
      if (!Types.ObjectId.isValid(value)) {
        throw new BadRequestException('Invalid candidate id');
      }
      return new Types.ObjectId(value);
    },
    { toClassOnly: true },
  )
  candidateId: Types.ObjectId;
}
