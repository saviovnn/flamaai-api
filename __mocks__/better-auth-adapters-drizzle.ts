// Mock para better-auth/adapters/drizzle
export const drizzleAdapter = jest.fn((db, config) => {
  return {
    provider: config?.provider || 'pg',
    schema: config?.schema || {},
  };
});
