import { FeaturesService } from './features.service';

describe('FeaturesService.buildTrainingRecord', () => {
  it('builds a flattened training record with the expected structure', () => {
    const service = new FeaturesService({} as any);

    const events = [
      { eventType: 'keydown', payload: { key: 'a', timestamp: 0 }, createdAt: new Date(0) },
      { eventType: 'keyup', payload: { key: 'a', timestamp: 100 }, createdAt: new Date(0) },
      { eventType: 'mouse_move', payload: { x: 0, y: 0, timestamp: 100 }, createdAt: new Date(0) },
      { eventType: 'mouse_move', payload: { x: 10, y: 5, timestamp: 200 }, createdAt: new Date(0) },
      { eventType: 'mouse_click', payload: { timestamp: 250 }, createdAt: new Date(0) },
      { eventType: 'scroll', payload: { scrollY: 50, timestamp: 300 }, createdAt: new Date(0) },
      { eventType: 'idle_activity', payload: { durationMs: 2000, timestamp: 350 }, createdAt: new Date(0) },
    ];

    const record = service.buildTrainingRecord(events, {
      sessionId: 'session-123',
      riskLevel: 'low',
    });

    expect(record).toMatchObject({
      session_id: 'session-123',
      mouse_moves: 2,
      mouse_clicks: 1,
      scroll_events: 1,
      keyboard_events: 2,
      idle_time_seconds: 2,
      risk_label: 'legitimate',
    });
    expect(record.duration_seconds).toBeCloseTo(0.35, 5);
    expect(record.avg_mouse_speed).toBeGreaterThan(0);
    expect(record.max_mouse_speed).toBeGreaterThan(0);
    expect(record.mouse_distance).toBeGreaterThan(0);
  });
});

describe('FeaturesService.deleteFeature', () => {
  it('deletes features for the owning session when given a session id', async () => {
    const prisma = {
      feature: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([{ id: 'feature-1', sessionId: 'session-1' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      prediction: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      session: {
        findFirst: jest.fn().mockResolvedValue({ id: 'session-1' }),
      },
      $transaction: jest.fn().mockImplementation(async (operations) => {
        for (const operation of operations) {
          await operation;
        }
      }),
    };

    const service = new FeaturesService(prisma as any);

    const result = await service.deleteFeature('user-1', 'session-1');

    expect(prisma.feature.findMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
      select: { id: true, sessionId: true },
    });
    expect(prisma.session.findFirst).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1' },
      select: { id: true },
    });
    expect(prisma.prediction.updateMany).toHaveBeenCalledWith({
      where: { featureId: { in: ['feature-1'] } },
      data: { featureId: null },
    });
    expect(prisma.feature.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
    });
    expect(result).toEqual({ success: true, sessionId: 'session-1', deletedCount: 1 });
  });
});

describe('FeaturesService.extractTrainingVector', () => {
  it('captures scroll direction changes and idle time from telemetry payloads', () => {
    const service = new FeaturesService({} as any);

    const vector = service.extractTrainingVector([
      { eventType: 'scroll', payload: { deltaY: 50, timestamp: 100 }, createdAt: new Date(0) },
      { eventType: 'scroll', payload: { deltaY: -10, timestamp: 200 }, createdAt: new Date(0) },
      { eventType: 'idle_activity', payload: { durationMs: 2500, timestamp: 300 }, createdAt: new Date(0) },
    ]);

    expect(vector.avgScrollSpeed).toBeCloseTo(300, 5);
    expect(vector.scrollDirectionChanges).toBe(1);
    expect(vector.idleTimeSeconds).toBe(2.5);
  });
});
