import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDmDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}