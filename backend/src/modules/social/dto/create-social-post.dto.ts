import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const SOCIAL_POST_TITLE_MAX_LENGTH = 140;
export const SOCIAL_POST_BODY_MAX_LENGTH = 2000;

export class CreateSocialPostDto {
  @ApiProperty({ example: 'user-123', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId!: string;

  @ApiProperty({ example: 'Shipped the first global feed milestone', maxLength: SOCIAL_POST_TITLE_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SOCIAL_POST_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty({
    example: 'We now have the first social-domain API slice in place and can build the new home feed on top of it.',
    maxLength: SOCIAL_POST_BODY_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SOCIAL_POST_BODY_MAX_LENGTH)
  body!: string;
}
