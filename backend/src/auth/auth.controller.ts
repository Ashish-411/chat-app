import 'dotenv/config';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

const REFRESH_MAX_AGE_MS =
  Number(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? 7 * 24 * 60 * 60) * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax' as const,
  path: '/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: SignupDto,
  ) {
    const result = await this.authService.signup(dto);

    // Set refresh token as httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      ...refreshCookieOptions,
      maxAge: REFRESH_MAX_AGE_MS,
    });

    // Return access token in body (frontend stores in state)
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('login')
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    const result = await this.authService.login(dto);

    // Set refresh token as httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      ...refreshCookieOptions,
      maxAge: REFRESH_MAX_AGE_MS,
    });

    // Return access token in body (frontend stores in state)
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    // Set new refresh token cookie (rotation)
    res.cookie('refresh_token', result.refreshToken, {
      ...refreshCookieOptions,
      maxAge: REFRESH_MAX_AGE_MS,
    });

    // Return new access token in body
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear the refresh cookie
    res.clearCookie('refresh_token', refreshCookieOptions);

    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser() user: { userId: string }) {
    return this.authService.me(user.userId);
  }
}