import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get the active session from the access token' })
  @ApiOkResponse({ description: 'Active session returned.' })
  getCurrentSession(@Req() req: AuthenticatedRequest) {
    return this.sessions.getSession(req.user!.userId, req.user!.sessionId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get session history for the authenticated user' })
  @ApiOkResponse({ description: 'Session history returned.' })
  getSessionHistory(@Req() req: AuthenticatedRequest) {
    return this.sessions.getSessionHistory(req.user!.userId);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get a session owned by the authenticated user' })
  @ApiOkResponse({ description: 'Session returned.' })
  getSession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sessions.getSession(req.user!.userId, sessionId);
  }

  @Patch('current/end')
  @ApiOperation({ summary: 'End the active session from the access token' })
  @ApiOkResponse({ description: 'Active session ended.' })
  endCurrentSession(@Req() req: AuthenticatedRequest) {
    return this.sessions.endSession(req.user!.userId, req.user!.sessionId);
  }
}
