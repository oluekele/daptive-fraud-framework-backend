import { BadRequestException } from '@nestjs/common';

import { MlPredictionService } from './ml-prediction.service';
import { PredictController } from './predict.controller';

describe('PredictController', () => {
  it('returns the backend prediction payload from the ML prediction service', async () => {
    const mlPredictionService = {
      predictForSession: jest.fn().mockResolvedValue({
        sessionId: 'session-123',
        mlPrediction: 1,
        confidence: 0.82,
        probabilities: { 0: 0.18, 1: 0.82 },
        score: 82,
        level: 'high',
        predictionId: 'prediction-123',
      }),
    };

    const controller = new PredictController(
      mlPredictionService as unknown as MlPredictionService,
    );

    const req = { user: { userId: 'user-1', sessionId: 'session-123' } } as any;

    const result = await controller.predictMl(req);

    expect(mlPredictionService.predictForSession).toHaveBeenCalledWith(
      'user-1',
      'session-123',
    );

    expect(result).toEqual({
      sessionId: 'session-123',
      mlPrediction: 1,
      confidence: 0.82,
      probabilities: { 0: 0.18, 1: 0.82 },
      score: 82,
      level: 'high',
      predictionId: 'prediction-123',
    });
  });

  it('throws a BadRequestException when sessionId is missing from auth claims', async () => {
    const mlPredictionService = {
      predictForSession: jest.fn(),
    };

    const controller = new PredictController(
      mlPredictionService as unknown as MlPredictionService,
    );

    const req = { user: { userId: 'user-1', sessionId: undefined } } as any;

    await expect(controller.predictMl(req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

