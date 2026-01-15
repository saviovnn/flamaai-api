// Mock global para better-auth
export const betterAuth = jest.fn((config) => {
  return {
    api: {
      signUpEmail: jest.fn(),
      signInEmail: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn().mockResolvedValue(null),
      updatePassword: jest.fn(),
    },
    handler: jest.fn(),
    ...config,
  };
});

export const toNodeHandler = jest.fn((auth) => {
  return jest.fn((req, res) => {
    return Promise.resolve();
  });
});
