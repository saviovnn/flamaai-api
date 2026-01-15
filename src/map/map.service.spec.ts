import { Test, TestingModule } from '@nestjs/testing';
import { MapService } from './map.service';
import { DATABASE_CONNECTION } from '../db/app.module';
import * as schema from '../db/schema';

describe('MapService', () => {
  let service: MapService;
  let mockDb: any;

  beforeEach(async () => {
    // Mock do banco de dados
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          gid: 1,
          cdMun: '3550308',
          nmMun: 'São Paulo',
          cdUf: '35',
          nmUf: 'São Paulo',
          siglaUf: 'SP',
          areaKm2: 1521.11,
          geom: { type: 'Polygon', coordinates: [] },
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<MapService>(MapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMapByIbgeId', () => {
    it('should return map data for a valid IBGE ID', async () => {
      const ibgeId = '3550308';
      const result = await service.getMapByIbgeId(ibgeId);

      expect(result).toBeDefined();
      expect(result.map).toBeDefined();
      expect(typeof result.map).toBe('string');

      const parsedMap = JSON.parse(result.map);
      expect(parsedMap.cdMun).toBe(ibgeId);
      expect(parsedMap.nmMun).toBe('São Paulo');
    });

    it('should call database with correct parameters', async () => {
      const ibgeId = '3550308';
      await service.getMapByIbgeId(ibgeId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(schema.municipiosIbge);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });
  });
});
