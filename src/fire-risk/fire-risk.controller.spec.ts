import { Test, TestingModule } from '@nestjs/testing';
import { FireRiskController } from './fire-risk.controller';
import { FireRiskService } from './fire-risk.service';
import type { FireRiskDto, WeatherDataIdsDto } from './dto';
import type { FireRiskResponse } from './fire-risk.service';
import * as schema from '../db/schema';

describe('FireRiskController', () => {
  let controller: FireRiskController;
  let mockFireRiskService: jest.Mocked<FireRiskService>;

  beforeEach(async () => {
    // Mock do FireRiskService
    mockFireRiskService = {
      getFireRisk: jest.fn(),
      getFireRiskByWeatherDataIds: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FireRiskController],
      providers: [
        {
          provide: FireRiskService,
          useValue: mockFireRiskService,
        },
      ],
    }).compile();

    controller = module.get<FireRiskController>(FireRiskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFireRisk', () => {
    it('should call fireRiskService.getFireRisk with correct parameters', async () => {
      const mockBody: FireRiskDto = {
        location_id: '123',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        weather_data_ids: ['1', '2'],
        model_version: '1.0',
      };
      const mockResponse: FireRiskResponse = {
        success: true,
        data: {} as any,
      };

      mockFireRiskService.getFireRisk.mockResolvedValue(mockResponse);

      const result = await controller.getFireRisk(mockBody);

      expect(mockFireRiskService.getFireRisk).toHaveBeenCalledWith(
        String(mockBody.location_id),
        new Date(mockBody.start_date),
        new Date(mockBody.end_date),
        mockBody.weather_data_ids,
        String(mockBody.model_version),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getFireRiskByWeatherDataIds', () => {
    it('should call fireRiskService.getFireRiskByWeatherDataIds with correct parameters', async () => {
      const mockBody: WeatherDataIdsDto = {
        weather_data_ids: ['1', '2', '3'],
      };
      const mockResponse: (typeof schema.fireRisk.$inferSelect)[] = [
        {} as any,
        {} as any,
      ];

      mockFireRiskService.getFireRiskByWeatherDataIds.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getFireRiskByWeatherDataIds(mockBody);

      expect(
        mockFireRiskService.getFireRiskByWeatherDataIds,
      ).toHaveBeenCalledWith(mockBody.weather_data_ids);
      expect(result).toEqual(mockResponse);
    });
  });
});
