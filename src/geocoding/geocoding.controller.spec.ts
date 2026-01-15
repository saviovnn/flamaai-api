import { Test, TestingModule } from '@nestjs/testing';
import { GeocodingController } from './geocoding.controller';
import { GeocodingService } from './geocoding.service';
import type {
  SearchDto,
  SearchMunicipiosDto,
  LocationIdDto,
} from './dto';
import type {
  GeocodingResult,
  SearchMunicipiosResult,
  LocationResponse,
} from './geocoding.service';

describe('GeocodingController', () => {
  let controller: GeocodingController;
  let mockGeocodingService: jest.Mocked<GeocodingService>;

  beforeEach(async () => {
    // Mock do GeocodingService
    mockGeocodingService = {
      search: jest.fn(),
      searchMunicipios: jest.fn(),
      getDataByLocationId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeocodingController],
      providers: [
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
      ],
    }).compile();

    controller = module.get<GeocodingController>(GeocodingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should call geocodingService.search with correct parameters', async () => {
      const mockBody: SearchDto = {
        query: 'São Paulo',
        user_id: 'user123',
        preference: 'city',
      };
      const mockResponse: GeocodingResult = {
        success: true,
        data: {} as any,
      };

      mockGeocodingService.search.mockResolvedValue(mockResponse);

      const result = await controller.search(mockBody);

      expect(mockGeocodingService.search).toHaveBeenCalledWith(
        mockBody.query,
        mockBody.user_id,
        mockBody.preference,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('searchMunicipios', () => {
    it('should call geocodingService.searchMunicipios with correct parameters', async () => {
      const mockBody: SearchMunicipiosDto = {
        query: 'São Paulo',
      };
      const mockResponse: SearchMunicipiosResult[] = [
        {
          id: '1',
          name: 'São Paulo',
          state: 'SP',
        } as any,
      ];

      mockGeocodingService.searchMunicipios.mockResolvedValue(mockResponse);

      const result = await controller.searchMunicipios(mockBody);

      expect(mockGeocodingService.searchMunicipios).toHaveBeenCalledWith(
        mockBody.query,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getDataByLocationId', () => {
    it('should call geocodingService.getDataByLocationId with correct parameters', async () => {
      const mockBody: LocationIdDto = {
        location_id: '123',
      };
      const mockResponse: LocationResponse = {
        success: true,
        data: {} as any,
      };

      mockGeocodingService.getDataByLocationId.mockResolvedValue(mockResponse);

      const result = await controller.getDataByLocationId(mockBody);

      expect(mockGeocodingService.getDataByLocationId).toHaveBeenCalledWith(
        String(mockBody.location_id),
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
