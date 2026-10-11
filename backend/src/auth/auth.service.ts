import 'dotenv/config';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET!;

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET!;

const ACCESS_EXPIRES_SECONDS = Number(
  process.env.JWT_ACCESS_EXPIRES_IN_SECONDS ?? 15 * 60,
);

const REFRESH_EXPIRES_SECONDS = Number(
  process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? 7 * 24 * 60 * 60,
);

type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  password: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PublicUser = Omit<AuthUser, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private toPublicUser(user: AuthUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private issueTokens(user: Pick<AuthUser, 'id' | 'email'>) {
    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
      },
      {
        secret: ACCESS_SECRET,
        expiresIn: ACCESS_EXPIRES_SECONDS,
      },
    );

    const refreshToken = this.jwt.sign(
      {
        sub: user.id,
        type: 'refresh',
      },
      {
        secret: REFRESH_SECRET,
        expiresIn: REFRESH_EXPIRES_SECONDS,
      },
    );

    return { accessToken, refreshToken };
  }

  private verifyRefreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: REFRESH_SECRET,
      });

      if (payload.type !== 'refresh' || !payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: passwordHash,
        avatarUrl: dto.avatarUrl,
      },
    });

    const tokens = this.issueTokens(user);

    return {
      user: this.toPublicUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.issueTokens(user);

    return {
      user: this.toPublicUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = this.issueTokens(user);

    return {
      user: this.toPublicUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toPublicUser(user);
  }
}