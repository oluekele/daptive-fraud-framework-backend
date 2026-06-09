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
