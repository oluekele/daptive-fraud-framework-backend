import type { ParsedQs } from 'qs';
import type { Request as ExpressRequest } from 'express';

// Use an Express Request intersection so properties like `headers` are always present.
export type AuthenticatedRequest = ExpressRequest<any, any, any, ParsedQs> & {
  user?: {
    userId: string;
    sessionId: string;
    email?: string;
  };
};
