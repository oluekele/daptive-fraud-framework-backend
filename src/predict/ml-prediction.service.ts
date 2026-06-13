
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class MlPredictionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
  ) { }

  async predictForSession(
    userId: string,
    sessionId: string,
  ) {
    const riskResult =
      await this.riskService.calculateAndSaveRisk(
        userId,
        sessionId,
      );

    const features = riskResult.features;

    const payload = {
      duration_seconds: features.durationSeconds ?? 0,
      mouse_moves: features.mouseMoves ?? 0,
      mouse_clicks: features.mouseClicks ?? 0,
      scroll_events: features.scrollEvents ?? 0,
      keyboard_events: features.keyboardEvents ?? 0,
      avg_mouse_speed: features.avgMouseSpeed ?? 0,
      max_mouse_speed: features.maxMouseSpeed ?? 0,
      avg_scroll_speed: features.avgScrollSpeed ?? 0,
      scroll_depth: features.scrollDepth ?? 0,
      scroll_direction_changes:
        features.scrollDirectionChanges ?? 0,
      idle_time_seconds: features.idleTimeSeconds ?? 0,
      keystrokes_per_second: features.keystrokesPerSecond ?? 0,
      click_rate: features.clickRate ?? 0,
      event_rate: features.eventRate ?? 0,
    };

    const mlUrl =
      process.env.ML_SERVICE_URL ??
      'https://ml-service-3lgq.onrender.com';

    const response = await fetch(
      `${mlUrl}/predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new InternalServerErrorException(
        errorText,
      );
    }

    const ml =
      await response.json();

    const fraudProbability =
      Number(ml.confidence);

    const prediction =
      await this.prisma.prediction.create({
        data: {
          sessionId,
          modelName:
            'random-forest-v1',
          fraudProbability,
          anomalyScore:
            fraudProbability,
        },
      });

    const risk =
      await this.prisma.riskScore.create({
        data: {
          sessionId,
          score:
            fraudProbability * 100,
          level:
            fraudProbability >= 0.8
              ? 'critical'
              : fraudProbability >= 0.6
                ? 'high'
                : fraudProbability >= 0.3
                  ? 'medium'
                  : 'low',
          predictionId:
            prediction.id,
        },
      });

    return {
      sessionId,
      mlPrediction:
        ml.prediction,

      confidence:
        ml.confidence,

      probabilities:
        ml.probabilities,

      score:
        risk.score,

      level:
        risk.level,

      predictionId:
        prediction.id,
    };
  }
}
