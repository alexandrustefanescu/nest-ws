import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { CreateRoomRequest } from '@repo/shared-types';

export class CreateRoomDto implements CreateRoomRequest {
  @ApiProperty({ example: 'general', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
