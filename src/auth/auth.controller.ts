import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({
    description:
      'User registered successfully. Password hash is never returned.',
  })
  @ApiConflictResponse({
    description: 'Email address already exists.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Registration failed. Email address is already in use.',
      },
    },
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and create a tracked session' })
  @ApiOkResponse({
    description: 'Login successful. Returns JWT access token and session id.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
        sessionId: '6a60f6f1-b97e-4906-b947-03ee8d7ac90d',
        user: {
          id: '9d153022-5afe-4066-a1ca-31ed80e05f38',
          email: 'analyst@example.com',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid login credentials.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Login failed. Email or password is incorrect.',
      },
    },
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  //   @Post('logout')
  //   @UseGuards(JwtAuthGuard)
  //   @ApiOperation({ summary: 'Logout and end the active session' })
  //   logout(@Req() req: any) {
  //     return this.auth.logout(req.user.userId, req.user.sessionId);
  //   }
}
