import { IsIn, IsString } from 'class-validator';

export class UpdateParticipantRoleDto {
  @IsString()
  @IsIn(['ADMIN', 'MEMBER'])
  role: string;
}