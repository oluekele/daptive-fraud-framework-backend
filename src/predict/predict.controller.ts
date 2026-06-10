import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { RiskService } from '../risk/risk.service';

class PredictBodyDto {
  sessionId?: string;
}

@ApiTags('predict')
@Controller('predict')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PredictController {
  constructor(private readonly riskService: RiskService) { }

  @Post()
  @ApiOperation({ summary: 'Generate a prediction for the active or supplied session' })
  @ApiOkResponse({ description: 'Prediction returned.' })
  async predict(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PredictBodyDto,
  ) {
    const sessionId = dto?.sessionId ?? req.user!.sessionId;

    const result = await this.riskService.calculateAndSaveRisk(
      req.user!.userId,
      sessionId,
    );

    return {
      sessionId,
      modelName: 'heuristic-random-forest',
      fraudProbability: Number((result.score / 100).toFixed(4)),
      score: result.score,
      level: result.level,
      features: result.features,
    };
  }
}
