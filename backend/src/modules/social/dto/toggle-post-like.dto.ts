import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TogglePostLikeDto {
  @ApiProperty({ example: 'user-123', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId!: string;
}

export class TogglePostLikeResponseDto {
  @ApiProperty({ example: 1 })
  postId!: number;

  @ApiProperty({ example: 3 })
  likeCount!: number;

  @ApiProperty({ example: true })
  liked!: boolean;
}
