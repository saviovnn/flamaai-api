import { Test, TestingModule } from '@nestjs/testing';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import type { WeatherDto, LocationIdDto } from './dto';
import type { WeatherResponse } from './weather.service';

describe('WeatherController', () => {
  let controller: WeatherController;
  let mockWeatherService: jest.Mocked<WeatherService>;

  beforeEach(async () => {
    // Mock do WeatherService
    mockWeatherService = {
      getWeatherByCoordinates: jest.fn(),
      getWeatherByLocationId: jest.fn(),
      getDataWeatherByLocationId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeatherController],
      providers: [
        {
          provide: WeatherService,
          useValue: mockWeatherService,
        },
      ],
    }).compile();

    controller = module.get<WeatherController>(WeatherController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWeatherByCoordinates', () => {
    it('should call weatherService.getWeatherByCoordinates with correct parameters', async () => {
      const mockBody: WeatherDto = {
        lat: '-23.5505',
        lng: '-46.6333',
        type: 'current',
        location_id: '123',
      };
      const mockResponse: WeatherResponse = {
        success: true,
        data: {} as any,
      };

      mockWeatherService.getWeatherByCoordinates.mockResolvedValue(mockResponse);

      const result = await controller.getWeatherByCoordinates(mockBody);

      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(
        Number(mockBody.lat),
        Number(mockBody.lng),
        mockBody.type,
        mockBody.location_id,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getWeatherByLocationId', () => {
    it('should call weatherService.getWeatherByLocationId with correct parameters', async () => {
      const mockBody: LocationIdDto = {
        location_id: '123',
      };
      const mockResponse: WeatherResponse = {
        success: true,
        data: {} as any,
      };

      mockWeatherService.getWeatherByLocationId.mockResolvedValue(mockResponse);

      const result = await controller.getWeatherByLocationId(mockBody);

      expect(mockWeatherService.getWeatherByLocationId).toHaveBeenCalledWith(
        String(mockBody.location_id),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getDataWeatherByLocationId', () => {
    it('should call weatherService.getDataWeatherByLocationId with correct parameters', async () => {
      const mockBody: LocationIdDto = {
        location_id: '123',
      };
      const mockResponse: WeatherResponse = {
        success: true,
        data: {} as any,
      };

      mockWeatherService.getDataWeatherByLocationId.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getDataWeatherByLocationId(mockBody);

      expect(
        mockWeatherService.getDataWeatherByLocationId,
      ).toHaveBeenCalledWith(String(mockBody.location_id));
      expect(result).toEqual(mockResponse);
    });
  });
});
