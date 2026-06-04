import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CalculateRiskDto {
  @ApiPropertyOptional({
    description:
      'Session to calculate risk for. Defaults to the active session.',
    example: '6a60f6f1-b97e-4906-b947-03ee8d7ac90d',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
