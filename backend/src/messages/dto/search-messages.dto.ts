import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchMessagesDto {
  @IsString()
  @IsNotEmpty()
  q: string;

  @IsOptional()
  @IsString()
  cursor?: string;
}