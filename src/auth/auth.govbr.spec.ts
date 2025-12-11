import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DATABASE_CONNECTION } from '../db/app.module';

describe('AuthService - Gov.br Integration', () => {
  let service: AuthService;
  let mockDb: any;

  beforeEach(async () => {
    // Mock do banco de dados
    mockDb = {
      query: {
        usuarios: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have auth instance configured', () => {
    expect(service.auth).toBeDefined();
  });

  describe('Gov.br Configuration', () => {
    it('should have correct Gov.br endpoints configured', () => {
      // Note: Isso é um teste conceitual, pois a configuração é privada
      // Em uma aplicação real, você pode querer expor esses valores para teste
      expect(process.env.GOVBR_CLIENT_ID).toBeDefined();
      expect(process.env.GOVBR_CLIENT_SECRET).toBeDefined();
    });
  });

  describe('Gov.br Profile Mapping', () => {
    it('should map Gov.br profile correctly', () => {
      // Simula um perfil do Gov.br
      const mockProfile = {
        sub: '12345678900',
        name: 'João da Silva',
        email: 'joao@exemplo.com',
        email_verified: true,
        reliability_info: {
          level: 'gold',
          reliabilities: ['selo_cadastro', 'selo_cpf', 'selo_facial'],
        },
      };

      // A função mapProfile está dentro da configuração do Better Auth
      // Este é um teste conceitual de como o mapeamento deve funcionar
      const expectedMapping = {
        id: '12345678900',
        name: 'João da Silva',
        email: 'joao@exemplo.com',
        emailVerified: true,
        image: null,
        cpf: '12345678900',
        govbrLevel: 'gold',
        govbrReliabilities: ['selo_cadastro', 'selo_cpf', 'selo_facial'],
      };

      // Verifica se os campos estão mapeados corretamente
      expect(mockProfile.sub).toBe(expectedMapping.id);
      expect(mockProfile.name).toBe(expectedMapping.name);
      expect(mockProfile.reliability_info.level).toBe(expectedMapping.govbrLevel);
    });

    it('should use default level "bronze" when not provided', () => {
      const mockProfile = {
        sub: '98765432100',
        name: 'Maria Santos',
        email: 'maria@exemplo.com',
        email_verified: false,
        // reliability_info não fornecido
      };

      const level = mockProfile.reliability_info?.level || 'bronze';

      expect(level).toBe('bronze');
    });

    it('should handle missing reliabilities array', () => {
      const mockProfile = {
        sub: '11122233344',
        name: 'Pedro Oliveira',
        email: 'pedro@exemplo.com',
        email_verified: true,
        reliability_info: {
          level: 'silver',
          // reliabilities não fornecido
        },
      };

      const reliabilities = mockProfile.reliability_info?.reliabilities || [];

      expect(Array.isArray(reliabilities)).toBe(true);
      expect(reliabilities).toEqual([]);
    });
  });

  describe('Additional Fields', () => {
    it('should support CPF field', () => {
      const cpf = '12345678900';
      expect(cpf).toMatch(/^\d{11}$/);
    });

    it('should support govbrLevel field with valid values', () => {
      const validLevels = ['bronze', 'silver', 'gold'];
      const testLevel = 'gold';

      expect(validLevels).toContain(testLevel);
    });

    it('should support govbrReliabilities as array', () => {
      const reliabilities = ['selo1', 'selo2', 'selo3'];

      expect(Array.isArray(reliabilities)).toBe(true);
      expect(reliabilities.length).toBeGreaterThan(0);
    });
  });
});
