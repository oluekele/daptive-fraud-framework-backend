import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MlPredictionFeaturesDto } from './ml-prediction.dto';

type MlServicePredictionResponse = {
  prediction: unknown;
  confidence: number;
};


@Injectable()
export class MlPredictionService {
  constructor(private readonly prisma: PrismaService) { }


  async predictAndSaveMlPrediction(params: {
    userId: string;
    sessionId: string;
    features: MlPredictionFeaturesDto;
  }) {
    const { userId, sessionId, features } = params;

    // Ensure session belongs to user
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      throw new InternalServerErrorException('Session not found for user');
    }

    // Call python ML service
    const mlBaseUrl = process.env.ML_SERVICE_URL ?? 'https://ml-service-3lgq.onrender.com';
    // const mlBaseUrl = process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8000';
    let mlResponse: MlServicePredictionResponse;

    // Node 18+ global fetch
    const res = await fetch(`${mlBaseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new InternalServerErrorException(
        `ML service error: ${res.status} ${res.statusText} ${text}`.trim(),
      );
    }

    mlResponse = (await res.json()) as MlServicePredictionResponse;


    // Normalize prediction into float probability: ML service returns only class + confidence.
    // We store confidence as anomalyScore and fraudProbability as confidence.
    const confidence = Number(mlResponse.confidence);

    const prediction = mlResponse.prediction;

    const predictionRecord = await this.prisma.prediction.create({
      data: {
        sessionId,
        modelName: 'ml-fastapi-random-forest',
        fraudProbability: confidence,
        anomalyScore: confidence,
      },
      select: {
        id: true,
        sessionId: true,
        modelName: true,
        fraudProbability: true,
        anomalyScore: true,
        featureId: true,
        createdAt: true,
      },
    });


    // Also create a RiskScore row linked to this prediction
    const riskLevel = confidence >= 0.8 ? 'critical' : confidence >= 0.6 ? 'high' : confidence >= 0.3 ? 'medium' : 'low';

    const riskScore = await this.prisma.riskScore.create({
      data: {
        sessionId,
        score: confidence * 100,
        level: riskLevel,
        predictionId: predictionRecord.id,
      },
      select: {
        id: true,
        sessionId: true,
        score: true,
        level: true,
        createdAt: true,
      },
    });

    return {
      sessionId,
      predictionId: predictionRecord.id,
      riskScoreId: riskScore.id,
      modelName: predictionRecord.modelName,
      fraudProbability: predictionRecord.fraudProbability,
      score: riskScore.score,
      level: riskScore.level,
      confidence: confidence,
      ml: {
        prediction,
        confidence,
      },
    };
  }
}
