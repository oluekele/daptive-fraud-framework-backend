import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryEventDto } from './dto/telemetry-event.dto';

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  async storeEvent(sessionId: string, dto: TelemetryEventDto) {
    return this.prisma.telemetry.create({
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
