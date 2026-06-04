import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type TelemetryEvent = {
  eventType: string;
  payload: unknown;
  createdAt: Date;
};

type Point = {
  x: number;
  y: number;
  timestamp: number;
};

export type BehavioralFeatureVector = {
  avgDwellTime: number | null;
  avgFlightTime: number | null;
  avgMouseSpeed: number | null;
  avgMouseAcceleration: number | null;
  clickFrequency: number | null;
  avgScrollRate: number | null;
  idleTime: number | null;
  typingSpeed: number | null;
};

@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAndStoreFeatures(userId: string, sessionId: string) {
    await this.assertSessionOwner(userId, sessionId);

    const events = await this.prisma.telemetry.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        eventType: true,
        payload: true,
        createdAt: true,
      },
    });

    const features = this.extractFeatures(events);

    return this.prisma.feature.create({
      data: {
        sessionId,
        ...features,
      },
      select: {
        id: true,
        sessionId: true,
        avgDwellTime: true,
        avgFlightTime: true,
        avgMouseSpeed: true,
        avgMouseAcceleration: true,
        clickFrequency: true,
        avgScrollRate: true,
        idleTime: true,
        typingSpeed: true,
        createdAt: true,
      },
    });
  }

  async retrieveFeatures(userId: string, sessionId: string) {
    await this.assertSessionOwner(userId, sessionId);

    return this.prisma.feature.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        avgDwellTime: true,
        avgFlightTime: true,
        avgMouseSpeed: true,
        avgMouseAcceleration: true,
        clickFrequency: true,
        avgScrollRate: true,
        idleTime: true,
        typingSpeed: true,
        createdAt: true,
      },
    });
  }

  extractFeatures(events: TelemetryEvent[]) {
    const keyboardEvents = events.filter((event) =>
      ['keydown', 'keyup'].includes(event.eventType),
    );
    const keydownEvents = keyboardEvents.filter(
      (event) => event.eventType === 'keydown',
    );
    const mousePoints = events
      .filter((event) => event.eventType === 'mouse_move')
      .map((event) => this.toPoint(event))
      .filter((point): point is Point => Boolean(point));
    const clickEvents = events.filter(
      (event) => event.eventType === 'mouse_click',
    );
    const scrollPoints = events
      .filter((event) => event.eventType === 'scroll')
      .map((event) => this.toScrollPoint(event))
      .filter((point): point is Point => Boolean(point));
    const idleEvents = events.filter(
      (event) => event.eventType === 'idle_activity',
    );
    const mouseSpeeds = this.calculateSpeeds(mousePoints);

    return {
      avgDwellTime: this.average(this.calculateDwellTimes(keyboardEvents)),
      avgFlightTime: this.average(this.calculateFlightTimes(keydownEvents)),
      avgMouseSpeed: this.average(mouseSpeeds),
      avgMouseAcceleration: this.average(
        this.calculateAccelerations(mouseSpeeds, mousePoints),
      ),
      clickFrequency: this.calculateEventFrequency(clickEvents),
      avgScrollRate: this.average(this.calculateSpeeds(scrollPoints)),
      idleTime: this.calculateIdleTime(idleEvents),
      typingSpeed: this.calculateTypingSpeed(keydownEvents),
    };
  }

  private calculateDwellTimes(events: TelemetryEvent[]) {
    const openKeydowns = new Map<string, number[]>();
    const dwellTimes: number[] = [];

    for (const event of events) {
      const key = this.getPayloadString(event.payload, ['key', 'code']) ?? '';
      const timestamp = this.getEventTime(event);

      if (!key) {
        continue;
      }

      if (event.eventType === 'keydown') {
        const queue = openKeydowns.get(key) ?? [];
        queue.push(timestamp);
        openKeydowns.set(key, queue);
      }

      if (event.eventType === 'keyup') {
        const queue = openKeydowns.get(key) ?? [];
        const startedAt = queue.shift();

        if (startedAt !== undefined && timestamp > startedAt) {
          dwellTimes.push(timestamp - startedAt);
        }
      }
    }

    return dwellTimes;
  }

  private calculateFlightTimes(events: TelemetryEvent[]) {
    const times = events.map((event) => this.getEventTime(event));
    const flightTimes: number[] = [];

    for (let index = 1; index < times.length; index += 1) {
      const diff = times[index] - times[index - 1];

      if (diff > 0) {
        flightTimes.push(diff);
      }
    }

    return flightTimes;
  }

  private calculateTypingSpeed(events: TelemetryEvent[]) {
    if (events.length < 2) {
      return null;
    }

    const first = this.getEventTime(events[0]);
    const last = this.getEventTime(events[events.length - 1]);
    const minutes = (last - first) / 60000;

    if (minutes <= 0) {
      return null;
    }

    return events.length / minutes;
  }

  private calculateSpeeds(points: Point[]) {
    const speeds: number[] = [];

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const elapsedSeconds = (current.timestamp - previous.timestamp) / 1000;

      if (elapsedSeconds <= 0) {
        continue;
      }

      const distance = Math.hypot(
        current.x - previous.x,
        current.y - previous.y,
      );

      speeds.push(distance / elapsedSeconds);
    }

    return speeds;
  }

  private calculateAccelerations(speeds: number[], points: Point[]) {
    const accelerations: number[] = [];

    for (let index = 1; index < speeds.length; index += 1) {
      const previousPoint = points[index];
      const currentPoint = points[index + 1];

      if (!previousPoint || !currentPoint) {
        continue;
      }

      const elapsedSeconds =
        (currentPoint.timestamp - previousPoint.timestamp) / 1000;

      if (elapsedSeconds <= 0) {
        continue;
      }

      accelerations.push(Math.abs(speeds[index] - speeds[index - 1]) / elapsedSeconds);
    }

    return accelerations;
  }

  private calculateEventFrequency(events: TelemetryEvent[]) {
    if (events.length === 0) {
      return null;
    }

    if (events.length === 1) {
      return 1;
    }

    const first = this.getEventTime(events[0]);
    const last = this.getEventTime(events[events.length - 1]);
    const minutes = (last - first) / 60000;

    if (minutes <= 0) {
      return events.length;
    }

    return events.length / minutes;
  }

  private calculateIdleTime(events: TelemetryEvent[]) {
    const durations = events
      .map((event) =>
        this.getPayloadNumber(event.payload, [
          'durationMs',
          'idleMs',
          'duration',
        ]),
      )
      .filter((value): value is number => value !== null && value > 0);

    if (durations.length === 0) {
      return null;
    }

    return durations.reduce((sum, value) => sum + value, 0);
  }

  private toPoint(event: TelemetryEvent): Point | null {
    const x = this.getPayloadNumber(event.payload, ['x', 'clientX', 'pageX']);
    const y = this.getPayloadNumber(event.payload, ['y', 'clientY', 'pageY']);

    if (x === null || y === null) {
      return null;
    }

    return {
      x,
      y,
      timestamp: this.getEventTime(event),
    };
  }

  private toScrollPoint(event: TelemetryEvent): Point | null {
    const scrollY = this.getPayloadNumber(event.payload, [
      'scrollY',
      'deltaY',
      'y',
    ]);

    if (scrollY === null) {
      return null;
    }

    return {
      x: 0,
      y: scrollY,
      timestamp: this.getEventTime(event),
    };
  }

  private getEventTime(event: TelemetryEvent) {
    return (
      this.getPayloadNumber(event.payload, ['timestamp', 'ts', 'time']) ??
      event.createdAt.getTime()
    );
  }

  private getPayloadNumber(payload: unknown, keys: string[]) {
    const record = this.asRecord(payload);

    if (!record) {
      return null;
    }

    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string') {
        const numeric = Number(value);

        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
    }

    return null;
  }

  private getPayloadString(payload: unknown, keys: string[]) {
    const record = this.asRecord(payload);

    if (!record) {
      return null;
    }

    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return null;
  }

  private asRecord(payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    return payload as Record<string, unknown>;
  }

  private average(values: number[]) {
    if (values.length === 0) {
      return null;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
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
