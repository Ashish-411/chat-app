import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AddParticipantsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];
}