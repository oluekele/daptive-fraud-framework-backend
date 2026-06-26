import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Bulk generation request.
 * - By default generates for all sessions owned by the authenticated user.
 */
export class GenerateFeaturesAllDto {
  @ApiPropertyOptional({
    description: 'Optional message / reason to log (no functional effect)',
    example: 'backfill-training-features',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
