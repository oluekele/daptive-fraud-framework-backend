import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { TelemetryEventDto } from './dto/telemetry-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@ApiTags('telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Store a keyboard, mouse, touch, or scroll event for the active session',
  })
  @ApiCreatedResponse({
    description: 'Telemetry event stored for the session embedded in the JWT.',
    schema: {
      example: {
        id: '0d056dad-5d65-412b-b5d6-6dbe1e6cc94e',
        sessionId: '6a60f6f1-b97e-4906-b947-03ee8d7ac90d',
        eventType: 'mouse_move',
        payload: { x: 420, y: 210, timestamp: 1717186500123 },
        createdAt: '2026-05-31T20:52:01.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (missing/invalid token)',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required. Provide a valid access token.',
      },
    },
  })
  async create(
    @Body() dto: TelemetryEventDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.telemetry.storeEvent(req.user!.sessionId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve telemetry for the active session',
  })
  @ApiOkResponse({
    description: 'Telemetry events returned for the active session.',
  })
  async findActiveSessionTelemetry(
    @Req() req: AuthenticatedRequest,
    @Query('eventType') eventType?: string,
  ) {
    return this.telemetry.retrieveTelemetry(
      req.user!.userId,
      req.user!.sessionId,
      eventType,
    );
  }

  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve telemetry filtered by an owned session',
  })
  @ApiOkResponse({
    description: 'Telemetry events returned for the selected session.',
  })
  async findBySession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
    @Query('eventType') eventType?: string,
  ) {
    return this.telemetry.retrieveTelemetry(
      req.user!.userId,
      sessionId,
      eventType,
    );
  }

  @Get('dataset')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate the first dataset for the active session',
  })
  @ApiOkResponse({
    description: 'Session telemetry dataset generated from stored events.',
  })
  async dataset(@Req() req: AuthenticatedRequest) {
    return this.telemetry.buildSessionDataset(req.user!.sessionId);
  }

  @Get('datasets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Generate telemetry datasets for ALL sessions owned by the authenticated user',
  })
  @ApiOkResponse({
    description:
      'Telemetry datasets for all sessions generated from stored events.',
  })
  async datasets(@Req() req: AuthenticatedRequest) {
    return this.telemetry.buildDatasetsForUser(req.user!.userId);
  }
}
