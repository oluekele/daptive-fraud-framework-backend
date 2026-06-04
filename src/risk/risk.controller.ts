import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CalculateRiskDto } from './dto/calculate-risk.dto';
import { RiskService } from './risk.service';

@ApiTags('risk')
@Controller('risk')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RiskController {
  constructor(private readonly risk: RiskService) {}

  @Post('calculate')
  @ApiOperation({
    summary: 'Calculate, save, and return risk for a session',
  })
  @ApiCreatedResponse({ description: 'Risk score calculated and stored.' })
  calculateRisk(
    @Body() dto: CalculateRiskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.risk.calculateAndSaveRisk(
      req.user!.userId,
      dto.sessionId ?? req.user!.sessionId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve risk scores for the active session' })
  @ApiOkResponse({ description: 'Risk scores returned.' })
  retrieveActiveSessionRisk(@Req() req: AuthenticatedRequest) {
    return this.risk.retrieveRiskScores(req.user!.userId, req.user!.sessionId);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Retrieve risk scores by owned session' })
  @ApiOkResponse({ description: 'Risk scores returned.' })
  retrieveRisk(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.risk.retrieveRiskScores(req.user!.userId, sessionId);
  }
}
