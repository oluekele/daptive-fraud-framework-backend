import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DatasetBySessionDto {
  @ApiProperty({
    description:
      'Optional sessionId. If omitted, dataset is built for all owned sessions.',
    required: false,
    example: '6a60f6f1-b97e-4906-b947-03ee8d7ac90d',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'Whether to include raw event rows in the response.',
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  includeEvents?: boolean;
}
