import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import type {
  OrchestratorDto,
  OrchestratorAllDto,
  OrchestratorSingleDto,
} from './dto';
import type {
  OrchestratorSearchResponse,
  OrchestratorSingleResponse,
} from './orchestrator.service';

describe('OrchestratorController', () => {
  let controller: OrchestratorController;
  let mockOrchestratorService: jest.Mocked<OrchestratorService>;

  beforeEach(async () => {
    // Mock do OrchestratorService
    mockOrchestratorService = {
      search: jest.fn(),
      getAll: jest.fn(),
      getSingle: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrchestratorController],
      providers: [
        {
          provide: OrchestratorService,
          useValue: mockOrchestratorService,
        },
      ],
    }).compile();

    controller = module.get<OrchestratorController>(OrchestratorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should call orchestratorService.search with correct parameters', async () => {
      const mockBody: OrchestratorDto = {
        query: 'São Paulo',
        user_id: 'user123',
        preference: 'city',
      };
      const mockResponse: OrchestratorSearchResponse = {
        success: true,
        data: {} as any,
      };

      mockOrchestratorService.search.mockResolvedValue(mockResponse);

      const result = await controller.search(mockBody);

      expect(mockOrchestratorService.search).toHaveBeenCalledWith(
        mockBody.query,
        mockBody.user_id,
        mockBody.preference,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAll', () => {
    it('should call orchestratorService.getAll with correct parameters', async () => {
      const mockBody: OrchestratorAllDto = {
        user_id: 'user123',
      };
      const mockResponse: {
        id: string;
        name: string;
        risk_level: string;
        created_at: Date;
      }[] = [
        {
          id: '1',
          name: 'Location 1',
          risk_level: 'high',
          created_at: new Date(),
        },
      ];

      mockOrchestratorService.getAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockBody);

      expect(mockOrchestratorService.getAll).toHaveBeenCalledWith(
        mockBody.user_id,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSingle', () => {
    it('should call orchestratorService.getSingle with correct parameters', async () => {
      const mockBody: OrchestratorSingleDto = {
        location_id: '123',
      };
      const mockResponse: OrchestratorSingleResponse = {
        success: true,
        data: {} as any,
      };

      mockOrchestratorService.getSingle.mockResolvedValue(mockResponse);

      const result = await controller.getSingle(mockBody);

      expect(mockOrchestratorService.getSingle).toHaveBeenCalledWith(
        String(mockBody.location_id),
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
