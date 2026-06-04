import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'analyst@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6, example: 'StrongPassword123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
