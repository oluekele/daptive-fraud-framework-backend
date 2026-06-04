import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { PrismaService } from '../../prisma/prisma.service';

type AccessTokenPayload = {
  sub?: string;
  sid?: string;
  email?: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>() as AuthenticatedRequest;

    const authHeader = (req.headers['authorization'] ?? '').toString();
    const [scheme, token] = authHeader.split(' ');

    if (!token || scheme?.toLowerCase() !== 'bearer') {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Authentication required. Provide a valid access token.',
      });
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Authentication failed. Access token is invalid or expired.',
      });
    }

    if (!payload.sub || !payload.sid) {
      throw new UnauthorizedException({
        statusCode: 401,
        message:
          'Authentication failed. Access token is missing required session claims.',
      });
    }

    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        endedAt: null,
      },
      select: { id: true },
    });

    if (!session) {
      throw new UnauthorizedException({
        statusCode: 401,
        message:
          'Authentication failed. Session is no longer active. Please log in again.',
      });
    }

    req.user = {
      userId: payload.sub,
      sessionId: payload.sid,
      email: payload.email,
    };

    return true;
  }
}
