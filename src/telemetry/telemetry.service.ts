import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryEventDto } from './dto/telemetry-event.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async storeEvent(sessionId: string, dto: TelemetryEventDto) {
    try {
      const created = await this.prisma.telemetry.create({
        data: {
          sessionId,
          eventType: dto.eventType,
          payload: dto.payload as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          sessionId: true,
          eventType: true,
          payload: true,
          createdAt: true,
        },
      });

      this.logger.debug(
        `Stored telemetry event: sessionId=${sessionId}, eventType=${dto.eventType}, id=${created.id}`,
      );

      return created;
    } catch (err) {
      this.logger.error(
        `Failed to store telemetry event: sessionId=${sessionId}, eventType=${dto.eventType}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  async retrieveTelemetry(
    userId: string,
    sessionId: string,
    eventType?: string,
  ) {
    await this.assertSessionOwner(userId, sessionId);

    return this.prisma.telemetry.findMany({
      where: {
        sessionId,
        ...(eventType ? { eventType } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        sessionId: true,
        eventType: true,
        payload: true,
        createdAt: true,
      },
    });
  }

  async buildSessionDataset(sessionId: string) {
    const events = await this.prisma.telemetry.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        eventType: true,
        payload: true,
        createdAt: true,
      },
    });

    this.logger.debug(
      `Building dataset: sessionId=${sessionId}, totalEvents=${events.length}`,
    );

    const keyboardEvents = events.filter((event) =>
      ['keydown', 'keyup'].includes(event.eventType),
    );
    const mouseEvents = events.filter((event) =>
      ['mouse_move', 'mouse_click'].includes(event.eventType),
    );

    return {
      sessionId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvents: events.length,
        keyboardEvents: keyboardEvents.length,
        mouseEvents: mouseEvents.length,
        scrollEvents: events.filter((event) => event.eventType === 'scroll')
          .length,
        touchEvents: events.filter((event) => event.eventType === 'touch_move')
          .length,
        idleEvents: events.filter(
          (event) => event.eventType === 'idle_activity',
        ).length,
      },
      events,
    };
  }

  async buildDatasetsForUser(userId: string) {
    // Fetch ALL sessions owned by the user
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      select: { id: true },
    });

    this.logger.debug(
      `Building datasets for userId=${userId}, totalSessions=${sessions.length}`,
    );

    // Build dataset per session. If one session has no telemetry, it will return totalEvents=0.
    const sessionsWithDatasets = await Promise.all(
      sessions.map(async (s) => this.buildSessionDataset(s.id)),
    );

    return {
      userId,
      meta: { totalSessions: sessions.length },
      sessions: sessionsWithDatasets,
    };
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
