import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from './orchestrator.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { WeatherService } from '../weather/weather.service';
import { FireRiskService } from '../fire-risk/fire-risk.service';
import { MapService } from '../map/map.service';
import { DATABASE_CONNECTION } from '../db/app.module';
import { InternalServerErrorException } from '@nestjs/common';
import * as schema from '../db/schema';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let mockGeocodingService: jest.Mocked<GeocodingService>;
  let mockWeatherService: jest.Mocked<WeatherService>;
  let mockFireRiskService: jest.Mocked<FireRiskService>;
  let mockMapService: jest.Mocked<MapService>;
  let mockDb: any;

  beforeEach(async () => {
    // Mocks dos services
    mockGeocodingService = {
      search: jest.fn(),
      searchMunicipios: jest.fn(),
      getDataByLocationId: jest.fn(),
    } as any;

    mockWeatherService = {
      getWeatherByCoordinates: jest.fn(),
      getWeatherByLocationId: jest.fn(),
      getDataWeatherByLocationId: jest.fn(),
    } as any;

    mockFireRiskService = {
      getFireRisk: jest.fn(),
      getFireRiskByWeatherDataIds: jest.fn(),
    } as any;

    mockMapService = {
      getMapByIbgeId: jest.fn(),
    } as any;

    // Mock do banco de dados
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb,
        },
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
        {
          provide: WeatherService,
          useValue: mockWeatherService,
        },
        {
          provide: FireRiskService,
          useValue: mockFireRiskService,
        },
        {
          provide: MapService,
          useValue: mockMapService,
        },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should orchestrate search and return combined results', async () => {
      const mockGeocodingResult = {
        location_id: 'location-123',
        ibge_id: '3550308',
        cidade: 'São Paulo',
        estado: 'SP',
        lat: -23.5505,
        lng: -46.6333,
      };

      const mockMapResult = {
        map: JSON.stringify({ cdMun: '3550308', nmMun: 'São Paulo' }),
      };

      const mockWeatherResult = {
        success: true,
        weather_data_ids: ['weather-1', 'weather-2'],
        weather_future_7d: [],
        weather_past_7d: [],
      };

      const mockFireRiskResult = {
        risk_level: 'regular',
        rag_explanation: 'Test explanation',
        daily_risks: [],
        weekly_risk_mean: 0.5,
      };

      mockGeocodingService.search.mockResolvedValue(mockGeocodingResult as any);
      mockMapService.getMapByIbgeId.mockResolvedValue(mockMapResult);
      mockWeatherService.getWeatherByLocationId.mockResolvedValue(
        mockWeatherResult as any,
      );
      mockFireRiskService.getFireRisk.mockResolvedValue(mockFireRiskResult);

      const result = await service.search('São Paulo', 'user-123', 'weather');

      expect(result).toBeDefined();
      expect(result.geocoding_result).toEqual(mockGeocodingResult);
      expect(result.map_result).toEqual(mockMapResult);
      expect(result.weather_result).toEqual(mockWeatherResult);
      expect(result.fire_risk_result).toEqual(mockFireRiskResult);

      expect(mockGeocodingService.search).toHaveBeenCalledWith(
        'São Paulo',
        'user-123',
        'weather',
      );
      expect(mockMapService.getMapByIbgeId).toHaveBeenCalledWith('3550308');
      expect(mockWeatherService.getWeatherByLocationId).toHaveBeenCalledWith(
        'location-123',
      );
    });

  });

  describe('getAll', () => {
    it('should return all locations for a user', async () => {
      const mockData = [
        {
          id: 'location-1',
          name: 'São Paulo',
          createdAt: new Date(),
          riskLevel: 'regular',
        },
        {
          id: 'location-2',
          name: 'Rio de Janeiro',
          createdAt: new Date(),
          riskLevel: 'high',
        },
      ];

      mockDb.orderBy.mockResolvedValue(mockData);

      const result = await service.getAll('user-123');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('risk_level');
      expect(result[0]).toHaveProperty('created_at');
    });

  });

  describe('getSingle', () => {
    it('should return single location with all related data', async () => {
      const mockLocationResponse = {
        id: 'location-123',
        user_id: 'user-123',
        bioma_id: 1,
        bioma: 'Mata Atlântica',
        ibge_id: '3550308',
        name: 'São Paulo',
        lat: -23.5505,
        lng: -46.6333,
        preference: 'weather' as const,
        created_at: new Date(),
      };

      const mockMapResult = {
        map: JSON.stringify({ cdMun: '3550308' }),
      };

      const mockWeatherResult = {
        success: true,
        weather_data_ids: ['weather-1', 'weather-2'],
      };

      const mockFireRiskArray = [
        {
          id: 'fire-risk-1',
          locationId: 'location-123',
          dailyRisks: [{ day: '2024-01-01', risk: 0.5 }],
          weekly_risk_mean: 0.5,
          risk_level: 'regular',
          rag_explanation: 'Test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGeocodingService.getDataByLocationId.mockResolvedValue(
        mockLocationResponse as any,
      );
      mockMapService.getMapByIbgeId.mockResolvedValue(mockMapResult);
      mockWeatherService.getDataWeatherByLocationId.mockResolvedValue(
        mockWeatherResult as any,
      );
      mockFireRiskService.getFireRiskByWeatherDataIds.mockResolvedValue(
        mockFireRiskArray as any,
      );

      const result = await service.getSingle('location-123');

      expect(result).toBeDefined();
      expect(result.geocoding_result).toEqual(mockLocationResponse);
      expect(result.map_result).toEqual(mockMapResult);
      expect(result.weather_result).toEqual(mockWeatherResult);
      expect(result.fire_risk_result).toBeDefined();
      expect(result.fire_risk_result?.risk_level).toBe('regular');
    });

  });
});
