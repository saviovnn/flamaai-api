import { BetterAuthUser, BetterAuthSession } from '../auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: BetterAuthUser;
      session?: BetterAuthSession;
    }
  }
}
