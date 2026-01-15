import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DATABASE_CONNECTION } from '../db/app.module';

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: any;

  beforeEach(async () => {
    // Define variáveis de ambiente para os testes
    process.env.RESEND_API_KEY = 'test-key';
    process.env.BASE_URL = 'http://localhost:3000';

    // Mock do banco de dados
    mockDb = {
      query: {
        users: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
        accounts: {
          findFirst: jest.fn(),
        },
        verifications: {
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
      }),
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

  it('should initialize betterAuth', () => {
    expect(service.auth).toBeDefined();
  });
});
