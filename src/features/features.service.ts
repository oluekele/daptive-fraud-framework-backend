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

type ScrollPoint = {
  y: number;
  timestamp: number;
};

export type TrainingVectorWrapper = {
  session_id: string;
  features: {
    duration_seconds: number | null;
    mouse_moves: number;
    mouse_clicks: number;
    scroll_events: number;
    keyboard_events: number;
    idle_time_seconds: number;
    mouse_distance: number;
    avg_mouse_speed: number | null;
    max_mouse_speed: number | null;
    avg_scroll_speed: number | null;
    scroll_depth: number | null;
    scroll_direction_changes: number;
    keystrokes_per_second: number | null;
    click_rate: number | null;
    event_rate: number | null;
  };
  label: 'human' | 'bot' | 'other' | null;
};

export type TrainingRecord = {
  session_id: string;
  duration_seconds: number | null;
  mouse_moves: number;
  mouse_clicks: number;
  scroll_events: number;
  keyboard_events: number;
  avg_mouse_speed: number | null;
  max_mouse_speed: number | null;
  avg_scroll_speed: number | null;
  scroll_direction_changes: number;
  idle_time_seconds: number;
  keystrokes_per_second: number | null;
  mouse_distance: number;
  click_rate: number | null;
  event_rate: number | null;
  risk_label: 'legitimate' | 'suspicious' | 'unknown';
};

@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) { }

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

    const legacyFeatures = this.extractFeatures(events);
    const vector = this.extractTrainingVector(events);

    return this.prisma.feature.create({
      data: {
        sessionId,
        ...legacyFeatures,
        ...vector,
      },
      select: {
        id: true,
        sessionId: true,
        durationSeconds: true,
        mouseMoves: true,
        mouseClicks: true,
        scrollEvents: true,
        keyboardEvents: true,
        idleTimeSeconds: true,
        mouseDistance: true,
        avgMouseSpeed: true,
        maxMouseSpeed: true,
        avgScrollSpeed: true,
        scrollDepth: true,
        scrollDirectionChanges: true,
        keystrokesPerSecond: true,
        clickRate: true,
        eventRate: true,
        createdAt: true,
      },
    });
  }

  async generateAndStoreFeaturesForAllSessions(userId: string) {
    // Sessions owned by this user
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { id: true },
      orderBy: { startedAt: 'desc' },
    });

    // Nothing to do
    if (!sessions.length) {
      return [];
    }

    // Backfill each session.
    // Feature table currently allows multiple rows per sessionId,
    // so we clear existing rows for that session to avoid duplicates.
    const results: Array<{ sessionId: string }> = [];

    for (const { id: sessionId } of sessions) {
      await this.prisma.feature.deleteMany({ where: { sessionId } });
      await this.generateAndStoreFeatures(userId, sessionId);
      results.push({ sessionId });
    }

    return results;
  }

  async getTrainingVectorWrappersForAllSessions(
    userId: string,
    onlyLabeled: boolean,
  ) {
    // fetch all sessions for user
    const sessions = await this.prisma.session.findMany({
      where: onlyLabeled ? { userId, label: { not: null } } : { userId },
      select: { id: true, label: true },
    });

    if (!sessions.length) return [];

    const sessionIds = sessions.map((s) => s.id);

    // fetch latest Feature per sessionId (active vectors)
    // since Feature has no unique constraint, we take the most recent by createdAt.
    const features = await this.prisma.feature.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        sessionId: true,
        durationSeconds: true,
        mouseMoves: true,
        mouseClicks: true,
        scrollEvents: true,
        keyboardEvents: true,
        idleTimeSeconds: true,
        mouseDistance: true,
        avgMouseSpeed: true,
        maxMouseSpeed: true,
        avgScrollSpeed: true,
        scrollDepth: true,
        scrollDirectionChanges: true,
        keystrokesPerSecond: true,
        clickRate: true,
        eventRate: true,
        createdAt: true,
      },
    });

    // reduce to first feature row per sessionId (because of desc order)
    const bySession = new Map<string, (typeof features)[number]>();
    for (const f of features) {
      if (!bySession.has(f.sessionId)) {
        bySession.set(f.sessionId, f);
      }
    }

    return sessions.map((s) => {
      const f = bySession.get(s.id);
      return {
        session_id: s.id,
        label: s.label as any,
        features: {
          duration_seconds: f?.durationSeconds ?? null,
          mouse_moves: f?.mouseMoves ?? 0,
          mouse_clicks: f?.mouseClicks ?? 0,
          scroll_events: f?.scrollEvents ?? 0,
          keyboard_events: f?.keyboardEvents ?? 0,
          idle_time_seconds: f?.idleTimeSeconds ?? 0,
          mouse_distance: f?.mouseDistance ?? 0,
          avg_mouse_speed: f?.avgMouseSpeed ?? null,
          max_mouse_speed: f?.maxMouseSpeed ?? null,
          avg_scroll_speed: f?.avgScrollSpeed ?? null,
          scroll_depth: f?.scrollDepth ?? null,
          scroll_direction_changes: f?.scrollDirectionChanges ?? 0,
          keystrokes_per_second: f?.keystrokesPerSecond ?? null,
          click_rate: f?.clickRate ?? null,
          event_rate: f?.eventRate ?? null,
        },
      };
    });
  }

  async getTrainingVectorWrapper(

    userId: string,

    sessionId: string,
  ): Promise<TrainingVectorWrapper> {
    await this.assertSessionOwner(userId, sessionId);

    const feature = await this.prisma.feature.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: {
        durationSeconds: true,
        mouseMoves: true,
        mouseClicks: true,
        scrollEvents: true,
        keyboardEvents: true,
        idleTimeSeconds: true,
        mouseDistance: true,
        avgMouseSpeed: true,
        maxMouseSpeed: true,
        avgScrollSpeed: true,
        scrollDepth: true,
        scrollDirectionChanges: true,
        keystrokesPerSecond: true,
        clickRate: true,
        eventRate: true,
      },
    });

    // Session owner check already handled by assertSessionOwner.
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, label: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID "${sessionId}" not found`);
    }

    // If features haven't been generated yet, return null-ish values but keep shape.
    const f = feature;

    return {
      session_id: sessionId,
      features: {
        duration_seconds: f?.durationSeconds ?? null,
        mouse_moves: f?.mouseMoves ?? 0,
        mouse_clicks: f?.mouseClicks ?? 0,
        scroll_events: f?.scrollEvents ?? 0,
        keyboard_events: f?.keyboardEvents ?? 0,
        idle_time_seconds: f?.idleTimeSeconds ?? 0,
        mouse_distance: f?.mouseDistance ?? 0,
        avg_mouse_speed: f?.avgMouseSpeed ?? null,
        max_mouse_speed: f?.maxMouseSpeed ?? null,
        avg_scroll_speed: f?.avgScrollSpeed ?? null,
        scroll_depth: f?.scrollDepth ?? null,
        scroll_direction_changes: f?.scrollDirectionChanges ?? 0,
        keystrokes_per_second: f?.keystrokesPerSecond ?? null,
        click_rate: f?.clickRate ?? null,
        event_rate: f?.eventRate ?? null,
      },
      label: session.label as any,
    };
  }

  buildTrainingRecord(
    events: TelemetryEvent[],
    options: {
      sessionId?: string;
      riskLevel?: string | null;
      riskLabel?: string | null;
    } = {},
  ): TrainingRecord {
    const vector = this.extractTrainingVector(events);

    return {
      session_id: options.sessionId ?? '',
      duration_seconds: vector.durationSeconds,
      mouse_moves: vector.mouseMoves,
      mouse_clicks: vector.mouseClicks,
      scroll_events: vector.scrollEvents,
      keyboard_events: vector.keyboardEvents,
      avg_mouse_speed: vector.avgMouseSpeed,
      max_mouse_speed: vector.maxMouseSpeed,
      avg_scroll_speed: vector.avgScrollSpeed,
      scroll_direction_changes: vector.scrollDirectionChanges,
      idle_time_seconds: vector.idleTimeSeconds,
      keystrokes_per_second: vector.keystrokesPerSecond,
      mouse_distance: vector.mouseDistance,
      click_rate: vector.clickRate,
      event_rate: vector.eventRate,
      risk_label: this.toRiskLabel(options.riskLabel ?? options.riskLevel ?? null),
    };
  }

  async getTrainingSummary(userId: string, sessionId: string): Promise<TrainingRecord> {
    await this.assertSessionOwner(userId, sessionId);

    const [events, latestRisk, session] = await Promise.all([
      this.prisma.telemetry.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        select: {
          eventType: true,
          payload: true,
          createdAt: true,
        },
      }),
      this.prisma.riskScore.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        select: { level: true },
      }),
      this.prisma.session.findFirst({
        where: { id: sessionId, userId },
        select: { id: true, label: true },
      }),
    ]);

    return this.buildTrainingRecord(events, {
      sessionId,
      riskLevel: latestRisk?.level ?? null,
      riskLabel: session?.label ?? null,
    });
  }

  async getTrainingSummariesForAllSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { id: true },
      orderBy: { startedAt: 'desc' },
    });

    return Promise.all(
      sessions.map(({ id }) => this.getTrainingSummary(userId, id)),
    );
  }

  async deleteFeature(userId: string, sessionId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: sessionId },
      select: { id: true, sessionId: true },
    });

    if (feature) {
      await this.assertSessionOwner(userId, feature.sessionId);

      await this.prisma.$transaction([
        this.prisma.prediction.updateMany({
          where: { featureId: feature.id },
          data: { featureId: null },
        }),
        this.prisma.feature.delete({
          where: { id: feature.id },
        }),
      ]);

      return { success: true, featureId: feature.id };
    }

    await this.assertSessionOwner(userId, sessionId);

    const features = await this.prisma.feature.findMany({
      where: { sessionId },
      select: { id: true, sessionId: true },
    });

    if (!features.length) {
      throw new NotFoundException(`No features found for session "${sessionId}"`);
    }

    const featureIds = features.map(({ id }) => id);

    await this.prisma.$transaction([
      this.prisma.prediction.updateMany({
        where: { featureId: { in: featureIds } },
        data: { featureId: null },
      }),
      this.prisma.feature.deleteMany({
        where: { sessionId },
      }),
    ]);

    return { success: true, sessionId, deletedCount: featureIds.length };
  }

  async exportTrainingCsv(userId: string, onlyLabeled = false) {
    const sessions = await this.prisma.session.findMany({
      where: onlyLabeled ? { userId, label: { not: null } } : { userId },
      select: { id: true, label: true },
      orderBy: { startedAt: 'desc' },
    });

    const summaries = await Promise.all(
      sessions.map(async (session) => {
        const summary = await this.getTrainingSummary(userId, session.id);
        return {
          ...summary,
          session_id: session.id,
          label: session.label ?? '',
        };
      }),
    );

    const headers = [
      'session_id',
      'label',
      'duration_seconds',
      'mouse_moves',
      'mouse_clicks',
      'scroll_events',
      'keyboard_events',
      'avg_mouse_speed',
      'max_mouse_speed',
      'avg_scroll_speed',
      'scroll_depth',
      'scroll_direction_changes',
      'idle_time_seconds',
      'keystrokes_per_second',
      'click_rate',
      'event_rate',
      'risk_label',
    ];

    const rows = summaries.map((summary) =>
      headers
        .map((header) => {
          const value = summary[header as keyof typeof summary];
          const normalized = value === null || value === undefined ? '' : String(value);
          return normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')
            ? `"${normalized.replace(/"/g, '""')}"`
            : normalized;
        })
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
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

  extractTrainingVector(events: TelemetryEvent[]): {
    durationSeconds: number | null;
    mouseMoves: number;
    mouseClicks: number;
    scrollEvents: number;
    keyboardEvents: number;
    idleTimeSeconds: number;
    mouseDistance: number;
    avgMouseSpeed: number | null;
    maxMouseSpeed: number | null;
    avgScrollSpeed: number | null;
    scrollDepth: number | null;
    scrollDirectionChanges: number;
    keystrokesPerSecond: number | null;
    clickRate: number | null;
    eventRate: number | null;
  } {
    const firstTime = events.length ? this.getEventTime(events[0]) : null;
    const lastTime = events.length
      ? this.getEventTime(events[events.length - 1])
      : null;

    const durationSeconds =
      firstTime !== null && lastTime !== null
        ? Math.max(0, (lastTime - firstTime) / 1000)
        : null;

    const keyboardEvents = events.filter((e) =>
      ['keydown', 'keyup'].includes(e.eventType),
    );
    const keydownEvents = keyboardEvents.filter(
      (e) => e.eventType === 'keydown',
    );

    const mouseMoveEvents = events.filter((e) => e.eventType === 'mouse_move');
    const mouseClickEvents = events.filter(
      (e) => e.eventType === 'mouse_click',
    );
    const scrollEvents = events.filter((e) => e.eventType === 'scroll');
    const idleEvents = events.filter((e) => e.eventType === 'idle_activity');

    const mouseMoves = mouseMoveEvents.length;
    const mouseClicks = mouseClickEvents.length;
    const scrollEventsCount = scrollEvents.length;
    const keyboardEventsCount = keyboardEvents.length;

    // idle_time_seconds from payload durationMs|idleMs|duration (ms)
    const idleTimeMs = idleEvents
      .map((e) =>
        this.getPayloadNumber(e.payload, ['durationMs', 'idleMs', 'duration']),
      )
      .filter((v): v is number => v !== null && v > 0);

    const idleTimeSeconds =
      idleTimeMs.length > 0 ? idleTimeMs.reduce((a, b) => a + b, 0) / 1000 : 0;

    // Mouse points for distance/speed
    const mousePoints = mouseMoveEvents
      .map((e) => this.toPoint(e))
      .filter((p): p is Point => Boolean(p));

    let mouseDistance = 0;
    const mouseSpeeds: number[] = [];

    for (let i = 1; i < mousePoints.length; i += 1) {
      const prev = mousePoints[i - 1];
      const cur = mousePoints[i];
      const dt = (cur.timestamp - prev.timestamp) / 1000;
      if (dt <= 0) continue;
      const dist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      mouseDistance += dist;
      mouseSpeeds.push(dist / dt);
    }

    const avgMouseSpeed = mouseSpeeds.length ? this.average(mouseSpeeds) : null;
    const maxMouseSpeed = mouseSpeeds.length ? Math.max(...mouseSpeeds) : null;

    // Scroll points for depth/speed/direction
    const scrollPoints = scrollEvents
      .map((e) => this.toScrollPoint(e))
      .filter((p): p is Point => Boolean(p));

    let scrollDepth = 0;
    const scrollSpeeds: number[] = [];
    let scrollDirectionChanges = 0;

    let prevSign: number | null = null;

    for (let i = 1; i < scrollPoints.length; i += 1) {
      const prev = scrollPoints[i - 1];
      const cur = scrollPoints[i];
      const deltaY = cur.y - prev.y;
      const dt = (cur.timestamp - prev.timestamp) / 1000;

      scrollDepth += Math.abs(deltaY);

      if (dt > 0) {
        // speed as abs(deltaY)/dt
        scrollSpeeds.push(Math.abs(deltaY) / dt);
      }
    }

    for (const point of scrollPoints) {
      const sign = point.y === 0 ? null : Math.sign(point.y);
      if (sign !== null) {
        if (prevSign !== null && sign !== prevSign) {
          scrollDirectionChanges += 1;
        }
        prevSign = sign;
      }
    }

    const eventCount = events.length;
    const durationForRates =
      durationSeconds && durationSeconds > 0 ? durationSeconds : null;

    const avgScrollSpeed =
      scrollPoints.length > 0 && durationForRates !== null
        ? scrollDepth / Math.max(1, scrollPoints.length - 1) / durationForRates
        : scrollSpeeds.length
          ? this.average(scrollSpeeds)
          : null;

    const keystrokesPerSecond =
      durationForRates !== null ? keyboardEventsCount / durationForRates : null;

    const clickRate =
      durationForRates !== null ? mouseClicks / durationForRates : null;

    const eventRate =
      durationForRates !== null ? eventCount / durationForRates : null;

    return {
      durationSeconds,
      mouseMoves,
      mouseClicks,
      scrollEvents: scrollEventsCount,
      keyboardEvents: keyboardEventsCount,
      idleTimeSeconds,
      mouseDistance,
      avgMouseSpeed,
      maxMouseSpeed,
      avgScrollSpeed,
      scrollDepth,
      scrollDirectionChanges,
      keystrokesPerSecond,
      clickRate,
      eventRate,
    };
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

      accelerations.push(
        Math.abs(speeds[index] - speeds[index - 1]) / elapsedSeconds,
      );
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
    const deltaY = this.getPayloadNumber(event.payload, ['deltaY', 'scrollDeltaY']);
    const scrollY = this.getPayloadNumber(event.payload, ['scrollY', 'y']);
    const effectiveY = deltaY ?? scrollY;

    if (effectiveY === null) {
      return null;
    }

    return {
      x: 0,
      y: effectiveY,
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

  private toRiskLabel(value: string | null | undefined): TrainingRecord['risk_label'] {
    const normalized = (value ?? '').toLowerCase();

    if (['human', 'legitimate', 'safe', 'low'].includes(normalized)) {
      return 'legitimate';
    }

    if (['bot', 'suspicious', 'anomalous', 'medium', 'high', 'critical'].includes(normalized)) {
      return 'suspicious';
    }

    return 'unknown';
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
