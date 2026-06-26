import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ExportTrainingVectorsDto {
  @ApiPropertyOptional({
    description: 'If true, only return sessions that have a non-null label.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  onlyLabeled?: boolean;
}
