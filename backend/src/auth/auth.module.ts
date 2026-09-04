import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

const sevenDaysInSeconds = 7 * 24 * 60 * 60;

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: {
        expiresIn: Number(
          process.env.JWT_EXPIRES_IN_SECONDS ?? sevenDaysInSeconds,
        ),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}