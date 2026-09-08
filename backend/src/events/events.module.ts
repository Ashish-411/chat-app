import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway.js';

const sevenDaysInSeconds = 7 * 24 * 60 * 60;

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: {
        expiresIn: Number(
          process.env.JWT_EXPIRES_IN_SECONDS ?? sevenDaysInSeconds,
        ),
      },
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway], 
})
export class EventsModule {}