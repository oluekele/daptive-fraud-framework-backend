import { PredictController } from './predict.controller';

describe('PredictController', () => {
  it('returns the backend prediction payload from the risk service', async () => {
    const riskService = {
      predictSession: jest.fn().mockResolvedValue({
        sessionId: 'session-123',
        modelName: 'ml-service',
        fraudProbability: 0.82,
        score: 82,
        level: 'high',
        predictionId: 'prediction-123',
        riskScoreId: 'risk-123',
      }),
    };

    const controller = new PredictController(riskService as any);
    const req = { user: { userId: 'user-1', sessionId: 'session-123' } } as any;

    const result = await controller.predict(req, { sessionId: 'session-123' });

    expect(riskService.predictSession).toHaveBeenCalledWith('user-1', 'session-123', undefined);
    expect(result).toEqual({
      sessionId: 'session-123',
      modelName: 'ml-service',
      fraudProbability: 0.82,
      score: 82,
      level: 'high',
      predictionId: 'prediction-123',
      riskScoreId: 'risk-123',
    });
  });
});
