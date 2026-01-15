// Mock global para resend
export class Resend {
  constructor(apiKey?: string) {
    // Mock constructor - não precisa fazer nada
  }

  emails = {
    send: jest.fn().mockResolvedValue({
      data: { id: 'mock-email-id' },
      error: null,
    }),
  };
}
