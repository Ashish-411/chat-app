import { IsOptional, IsString } from 'class-validator';

export class SearchUsersDto {
  @IsOptional()
  @IsString()
  q?: string;
}