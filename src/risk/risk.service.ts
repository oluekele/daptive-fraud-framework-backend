import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeaturesService } from '../features/features.service';

type RiskFeatureInput = {
  avgDwellTime: number | null;
  avgFlightTime: number | null;
  avgMouseSpeed: number | null;
  avgScrollRate: number | null;
  typingSpeed: number | null;
};

@Injectable()
export class RiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: FeaturesService,
  ) {}

  async calculateAndSaveRisk(userId: string, sessionId: string) {
    await this.assertSessionOwner(userId, sessionId);

    const featureSet = await this.features.generateAndStoreFeatures(
      userId,
      sessionId,
    );
    const telemetryCount = await this.prisma.telemetry.count({
      where: { sessionId },
    });
    const score = this.calculateRiskScore(featureSet as any, telemetryCount);
    const level = this.getRiskLevel(score);

    const risk = await this.prisma.riskScore.create({
      data: {
        sessionId,
        score,
        level,
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
      ...risk,
      features: featureSet,
    };
  }

  async retrieveRiskScores(userId: string, sessionId: string) {
    await this.assertSessionOwner(userId, sessionId);

    return this.prisma.riskScore.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        score: true,
        level: true,
        createdAt: true,
      },
    });
  }

  calculateRiskScore(
    features: {
      avgDwellTime: number | null;
      avgFlightTime: number | null;
      avgMouseSpeed: number | null;
      avgScrollRate: number | null;
      typingSpeed: number | null;
    },
    telemetryCount: number,
  ) {
    let score = 5;

    if (telemetryCount < 5) {
      score += 20;
    }

    if (
      features.avgDwellTime !== null &&
      (features.avgDwellTime < 40 || features.avgDwellTime > 500)
    ) {
      score += 15;
    }

    if (
      features.avgFlightTime !== null &&
      (features.avgFlightTime < 20 || features.avgFlightTime > 700)
    ) {
      score += 15;
    }

    if (
      features.typingSpeed !== null &&
      (features.typingSpeed < 40 || features.typingSpeed > 450)
    ) {
      score += 15;
    }

    if (features.avgMouseSpeed !== null && features.avgMouseSpeed > 2500) {
      score += 15;
    }

    if (features.avgScrollRate !== null && features.avgScrollRate > 4000) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  getRiskLevel(score: number) {
    if (score >= 80) {
      return 'critical';
    }

    if (score >= 60) {
      return 'high';
    }

    if (score >= 30) {
      return 'medium';
    }

    return 'low';
  }

  private async assertSessionOwner(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID "${sessionId}" not found`);
    }
  }
}
