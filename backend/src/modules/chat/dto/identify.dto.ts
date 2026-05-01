import { IsNotEmpty, IsString } from 'class-validator';

export class IdentifyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
