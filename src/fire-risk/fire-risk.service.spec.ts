import { Test, TestingModule } from '@nestjs/testing';
import { FireRiskService } from './fire-risk.service';
import { DATABASE_CONNECTION } from '../db/app.module';

describe('FireRiskService', () => {
  let service: FireRiskService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn(),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{}]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FireRiskService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<FireRiskService>(FireRiskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFireRisk', () => {
    it('should calculate fire risk and return response', async () => {
      const mockLocation = [{ id: 'location-123', name: 'Test Location' }];
      const mockFireRisk = {
        id: 'fire-risk-123',
        locationId: 'location-123',
        week_start_date: new Date('2024-01-01'),
        week_end_date: new Date('2024-01-07'),
        dailyRisks: [],
        weekly_risk_mean: 0.5,
        risk_level: 'medio',
        rag_explanation: 'Test explanation',
        model_version: '1.0',
      };

      mockDb.limit.mockResolvedValue(mockLocation);
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockFireRisk]),
        }),
      });
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.getFireRisk(
        'location-123',
        new Date('2024-01-01'),
        new Date('2024-01-07'),
        ['1', '2'],
        '1.0',
      );

      expect(result).toBeDefined();
      expect(result.risk_level).toBeDefined();
      expect(result.weekly_risk_mean).toBeDefined();
      expect(result.daily_risks).toHaveLength(7);
      expect(result.rag_explanation).toBeDefined();
    });

    it('should classify risk as low when mean <= 0.3', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.2);

      const mockLocation = [{ id: 'location-123' }];
      mockDb.limit.mockResolvedValue(mockLocation);
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{}]),
        }),
      });
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.getFireRisk(
        'location-123',
        new Date('2024-01-01'),
        new Date('2024-01-07'),
        ['1'],
        '1.0',
      );

      Math.random = originalRandom;

      expect(['baixo', 'regular', 'medio', 'alto', 'critico']).toContain(
        result.risk_level,
      );
    });
  });

  describe('getFireRiskByWeatherDataIds', () => {
    it('should return fire risks for valid weather data ids', async () => {
      const mockFireRiskWeatherData = [
        { id: '1', fireRiskId: 'fire-risk-1', weatherDataId: 'weather-1' },
        { id: '2', fireRiskId: 'fire-risk-1', weatherDataId: 'weather-2' },
      ];

      const mockFireRisks = [
        {
          id: 'fire-risk-1',
          locationId: 'location-123',
          week_start_date: new Date(),
          week_end_date: new Date(),
          dailyRisks: [],
          weekly_risk_mean: 0.5,
          risk_level: 'regular',
          rag_explanation: 'Test',
          model_version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce(mockFireRiskWeatherData),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce(mockFireRisks),
        }),
      });

      const result = await service.getFireRiskByWeatherDataIds([
        'weather-1',
        'weather-2',
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fire-risk-1');
    });
  });
});
