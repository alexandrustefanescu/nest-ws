import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class ListProfileFeedDto {
  @ApiPropertyOptional({ example: 100, description: 'Fetch posts with id less than this cursor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  before?: number;

  @ApiPropertyOptional({ example: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
