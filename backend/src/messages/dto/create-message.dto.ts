import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
}

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string; // Text content OR Media URL

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}