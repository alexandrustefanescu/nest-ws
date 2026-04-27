import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { DeleteRoomRequest } from '@repo/shared-types';

export class DeleteRoomDto implements DeleteRoomRequest {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  roomId!: number;
}
