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

type PublicUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
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

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toPublicUser(user);
  }

  private buildAuthResponse(user: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}