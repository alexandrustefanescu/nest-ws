import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PostComment } from '../post-comment.entity';
import { POST_COMMENT_BODY_MAX_LENGTH } from '../social-post-content.policy';

export class CreatePostCommentDto {
  @ApiProperty({ example: 'user-123', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId!: string;

  @ApiProperty({
    example: 'This is exactly the kind of feed layout I wanted.',
    maxLength: POST_COMMENT_BODY_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(POST_COMMENT_BODY_MAX_LENGTH)
  body!: string;
}

export class PostCommentsResponseDto {
  @ApiProperty({ example: 1 })
  postId!: number;

  @ApiProperty({ type: [PostComment] })
  comments!: PostComment[];
}
