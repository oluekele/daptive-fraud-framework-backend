import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsString } from 'class-validator';

export const telemetryEventTypes = [
  'keydown',
  'keyup',
  'mouse_move',
  'mouse_click',
  'scroll',
  'touch_move',
  'idle_activity',
] as const;

export class TelemetryEventDto {
  @ApiProperty({
    description: 'Telemetry event type identifier.',
    enum: telemetryEventTypes,
    example: 'mouse_move',
  })
  @IsString()
  @IsIn(telemetryEventTypes)
  eventType: string;

  @ApiProperty({
    description:
      'Keyboard, mouse, scroll, or touch event payload. Stored as JSON.',
    example: {
      x: 420,
      y: 210,
      button: 'left',
      timestamp: 1717186500123,
    },
  })
  @IsObject()
  payload: Record<string, unknown>;
}
