import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsInt,
  ValidateNested,
} from 'class-validator';

export class MlPredictionFeaturesDto {
  @ApiProperty({ example: 180 })
  @IsNumber()
  @Type(() => Number)
  duration_seconds!: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Type(() => Number)
  mouse_moves!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Type(() => Number)
  mouse_clicks!: number;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Type(() => Number)
  scroll_events!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Type(() => Number)
  keyboard_events!: number;

  @ApiProperty({ example: 200 })
  @IsNumber()
  @Type(() => Number)
  avg_mouse_speed!: number;

  @ApiProperty({ example: 900 })
  @IsNumber()
  @Type(() => Number)
  max_mouse_speed!: number;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Type(() => Number)
  avg_scroll_speed!: number;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Type(() => Number)
  scroll_depth!: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Type(() => Number)
  scroll_direction_changes!: number;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Type(() => Number)
  idle_time_seconds!: number;

  @ApiProperty({ example: 0.2 })
  @IsNumber()
  @Type(() => Number)
  keystrokes_per_second!: number;

  @ApiProperty({ example: 0.02 })
  @IsNumber()
  @Type(() => Number)
  click_rate!: number;

  @ApiProperty({ example: 0.52 })
  @IsNumber()
  @Type(() => Number)
  event_rate!: number;
}

export class PredictMlBodyDto {
  @ValidateNested()
  @Type(() => MlPredictionFeaturesDto)
  // Accepts request shape: { "features": { ... } }
  features!: MlPredictionFeaturesDto;
}



