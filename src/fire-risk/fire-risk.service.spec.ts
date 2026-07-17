import { Test, TestingModule } from '@nestjs/testing';
import { FireRiskService } from './fire-risk.service';
import { DATABASE_CONNECTION } from '../db/app.module';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FireRiskService', () => {
  let service: FireRiskService;
  let mockDb: any;

  const mockLocation = [
    {
      id: 'location-123',
      name: 'Brasília',
      state: 'DF',
      lat: -15.78,
      lng: -47.93,
      cdMun: '5300108',
    },
  ];

  const mockWeatherRows = Array.from({ length: 7 }, (_, i) => ({
    id: `weather-${i}`,
    time: new Date(Date.UTC(2024, 0, i + 1)),
    temperature_2m_max: 30,
    temperature_2m_min: 18,
    temperature_2m_mean: 24,
    relative_humidity_2m_mean: 40,
    precipitation_sum: 0,
    rain_sum: 0,
    windspeed_10m_max: 10,
    windgusts_10m_max: 15,
    et0_fao_evapotranspiration: 5,
    uv_index_max: 8,
  }));

  function mockSelectChains() {
    mockDb.select.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: jest.fn().mockResolvedValue(mockLocation),
        }),
      }),
    }));
    mockDb.select.mockImplementationOnce(() => ({
      from: () => ({
        where: jest.fn().mockResolvedValue(mockWeatherRows),
      }),
    }));
  }

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
    };

    mockedAxios.post.mockReset();

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
    it('should calculate fire risk via model API and return response', async () => {
      mockSelectChains();

      const mockFireRisk = {
        id: 'fire-risk-123',
        locationId: 'location-123',
        week_start_date: new Date('2024-01-01'),
        week_end_date: new Date('2024-01-07'),
        dailyRisks: [],
        weekly_risk_mean: 0.45,
        risk_level: 'medio',
        rag_explanation: 'Explicação RAG de teste',
        model_version: 'v8-xgb',
      };

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            model_version: 'v8-xgb',
            daily_risks: mockWeatherRows.map((r) => ({
              day: r.time.toISOString().split('T')[0],
              risk: 0.45,
            })),
            weekly_risk_mean: 0.45,
          },
        })
        .mockResolvedValueOnce({
          data: { resposta: 'Explicação RAG de teste' },
        });

      mockDb.insert
        .mockReturnValueOnce({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockFireRisk]),
          }),
        })
        .mockReturnValueOnce({
          values: jest.fn().mockResolvedValue(undefined),
        });

      const result = await service.getFireRisk(
        'location-123',
        new Date(2024, 0, 1),
        new Date(2024, 0, 7),
        mockWeatherRows.map((r) => r.id),
        'v8-xgb',
      );

      expect(result.risk_level).toBe('medio');
      expect(result.weekly_risk_mean).toBe(0.45);
      expect(result.daily_risks).toHaveLength(7);
      expect(result.rag_explanation).toBe('Explicação RAG de teste');
      expect(result.model_version).toBe('v8-xgb');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should fallback rag when RAG is down', async () => {
      mockSelectChains();

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            model_version: 'v8-xgb',
            daily_risks: mockWeatherRows.map((r) => ({
              day: r.time.toISOString().split('T')[0],
              risk: 0.15,
            })),
            weekly_risk_mean: 0.15,
          },
        })
        .mockRejectedValueOnce(new Error('RAG down'));

      mockDb.insert
        .mockReturnValueOnce({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              {
                id: 'fr-1',
                locationId: 'location-123',
                week_start_date: new Date('2024-01-01'),
                week_end_date: new Date('2024-01-07'),
                dailyRisks: [],
                weekly_risk_mean: 0.15,
                risk_level: 'minimo',
                rag_explanation: 'fallback',
                model_version: 'v8-xgb',
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
          values: jest.fn().mockResolvedValue(undefined),
        });

      const result = await service.getFireRisk(
        'location-123',
        new Date(2024, 0, 1),
        new Date(2024, 0, 7),
        mockWeatherRows.map((r) => r.id),
      );

      expect(result.risk_level).toBe('minimo');
      expect(result.rag_explanation).toContain('indisponível');
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
          risk_level: 'baixo',
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
