import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ToggleBookmarkDto {
  @ApiProperty({ example: 'user-123', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId!: string;
}

export class ToggleBookmarkResponseDto {
  @ApiProperty({ example: true })
  bookmarked!: boolean;
}
