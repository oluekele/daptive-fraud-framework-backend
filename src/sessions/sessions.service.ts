import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        userId: true,
        userAgent: true,
        ipAddress: true,
        startedAt: true,
        endedAt: true,
        _count: {
          select: {
            telemetry: true,
            riskScores: true,
            predictions: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID "${sessionId}" not found`);
    }

    return session;
  }

  async endSession(userId: string, sessionId: string) {
    await this.getSession(userId, sessionId);

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
      select: {
        id: true,
        userId: true,
        userAgent: true,
        ipAddress: true,
        startedAt: true,
        endedAt: true,
      },
    });
  }

  async getSessionHistory(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        startedAt: true,
        endedAt: true,
        _count: {
          select: {
            telemetry: true,
            riskScores: true,
            predictions: true,
          },
        },
      },
    });
  }
}
