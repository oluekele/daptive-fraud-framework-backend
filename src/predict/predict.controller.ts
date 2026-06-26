// import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
// import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
// import { RiskService } from '../risk/risk.service';
// import { MlPredictionService } from './ml-prediction.service';
// import { PredictMlBodyDto } from './ml-prediction.dto';

// class PredictBodyDto {
//   sessionId?: string;
// }


// @ApiTags('predict')
// @Controller('predict')
// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
// export class PredictController {
//   constructor(
//     private readonly riskService: RiskService,
//     private readonly mlPrediction: MlPredictionService,
//   ) { }


//   @Post()
//   @ApiOperation({ summary: 'Generate a prediction for the active or supplied session' })
//   @ApiOkResponse({ description: 'Prediction returned.' })
//   async predict(
//     @Req() req: AuthenticatedRequest,
//     @Body() dto: PredictBodyDto,
//   ) {
//     const sessionId = dto?.sessionId ?? req.user!.sessionId;

//     const result = await this.riskService.calculateAndSaveRisk(
//       req.user!.userId,
//       sessionId,
//     );

//     return {
//       sessionId,
//       modelName: 'heuristic-random-forest',
//       fraudProbability: Number((result.score / 100).toFixed(4)),
//       score: result.score,
//       level: result.level,
//       features: result.features,
//     };
//   }

//   @Post('ml')
//   @ApiOperation({ summary: 'Generate a prediction using the ML service' })
//   @ApiOkResponse({ description: 'ML prediction returned.' })
//   async predictMl(
//     @Req() req: AuthenticatedRequest,
//     @Body() body: PredictMlBodyDto,
//   ) {
//     const sessionId = req.user!.sessionId;

//     const result = await this.mlPrediction.predictAndSaveMlPrediction({
//       userId: req.user!.userId,
//       sessionId,
//       // approach A: send raw feature vector; body.features contains ML keys
//       features: body.features,
//     });

//     return {
//       ...result,
//       modelName: result.modelName,
//     };
//   }
// }


import {
  BadRequestException,
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
import { RiskService } from '../risk/risk.service';
import { MlPredictionService } from './ml-prediction.service';
import { PredictMlBodyDto } from './ml-prediction.dto';

class PredictBodyDto {
  sessionId?: string;
}


@ApiTags('predict')
@Controller('predict')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PredictController {
  constructor(
    private readonly riskService: RiskService,
    private readonly mlPrediction: MlPredictionService,
  ) { }

  @Post('ml')
  @ApiOperation({
    summary: 'Generate ML prediction for current session',
    description:
      'This endpoint uses the authenticated user session (JWT claims) and does not accept a request body.',
  })
  @ApiOkResponse({
    description: 'Prediction returned',
    schema: {
      example: {
        sessionId: 'session_123',
        mlPrediction: 1,
        confidence: 0.82,
        probabilities: {
          0: 0.18,
          1: 0.82,
        },
        score: 82,
        level: 'high',
        predictionId: 'prediction_123',
      },
    },
  })
  async predictMl(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PredictBodyDto,
  ) {
    if (!req.user?.userId || !req.user?.sessionId) {
      // Deployed guard/Auth issues can lead to missing claims
      // (e.g. “sessionId not available”). Return a clear error.
      // Using an exception ensures correct HTTP status codes.
      throw new BadRequestException(
        'sessionId not available in authenticated request. Call must include a valid bearer token for an active session.',
      );
    }

    return this.mlPredictionService.predictForSession(
      req.user.userId,
      req.user.sessionId,
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

  @Post('ml')
  @ApiOperation({ summary: 'Generate a prediction using the ML service' })
  @ApiOkResponse({ description: 'ML prediction returned.' })
  async predictMl(
    @Req() req: AuthenticatedRequest,
    @Body() body: PredictMlBodyDto,
  ) {
    const sessionId = req.user!.sessionId;

    const result = await this.mlPrediction.predictAndSaveMlPrediction({
      userId: req.user!.userId,
      sessionId,
      // approach A: send raw feature vector; body.features contains ML keys
      features: body.features,
    });

    return {
      ...result,
      modelName: result.modelName,
    };
  }
}

