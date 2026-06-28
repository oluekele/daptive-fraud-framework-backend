import {
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

import { MlPredictionService } from './ml-prediction.service';

@ApiTags('predict')
@Controller('predict')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PredictController {
  constructor(
    private readonly mlPredictionService: MlPredictionService,
  ) { }

  @Post('ml')
  @ApiOperation({
    summary: 'Generate ML prediction for current session',
  })
  @ApiOkResponse({
    description: 'Prediction returned',
  })
  async predictMl(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mlPredictionService.predictForSession(
      req.user!.userId,
      req.user!.sessionId,
    );
  }
}