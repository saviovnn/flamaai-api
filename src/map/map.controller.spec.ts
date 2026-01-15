import { Test, TestingModule } from '@nestjs/testing';
import { MapController } from './map.controller';
import { MapService } from './map.service';
import type { MapDto } from './dto';
import type { MapResponse } from './map.service';

describe('MapController', () => {
  let controller: MapController;
  let mockMapService: jest.Mocked<MapService>;

  beforeEach(async () => {
    // Mock do MapService
    mockMapService = {
      getMapByIbgeId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapController],
      providers: [
        {
          provide: MapService,
          useValue: mockMapService,
        },
      ],
    }).compile();

    controller = module.get<MapController>(MapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMapByIbgeId', () => {
    it('should call mapService.getMapByIbgeId with correct parameters', async () => {
      const mockBody: MapDto = {
        ibge_id: '3550308',
      };
      const mockResponse: MapResponse = {
        success: true,
        data: {} as any,
      };

      mockMapService.getMapByIbgeId.mockResolvedValue(mockResponse);

      const result = await controller.getMapByIbgeId(mockBody);

      expect(mockMapService.getMapByIbgeId).toHaveBeenCalledWith(
        mockBody.ibge_id,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
