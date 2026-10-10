import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50) // Emojis can be multiple characters
  emoji: string;
}