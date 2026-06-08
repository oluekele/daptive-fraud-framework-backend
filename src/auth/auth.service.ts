import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async logout(userId: string, sessionId: string) {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
      },
    });

    return { status: 'logged_out', sessionId };
  }

  async register(email: string, password: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Registration failed. Email address is already in use.',
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hash,
      },
    });

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async login(
    email: string,
    password: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Login failed. Email or password is incorrect.',
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Login failed. Email or password is incorrect.',
      });
    }

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    const token = this.jwt.sign({
      sub: user.id,
      sid: session.id,
      email: user.email,
    });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
