import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as webpushImport from 'web-push';

// Handle CommonJS / ESM interop safely
const webpush = (webpushImport as any).default || webpushImport;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {
    // Now webpush.setVapidDetails will work perfectly!
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@yourchatapp.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  async subscribe(userId: string, subscription: any) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { keys: subscription.keys },
      create: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
    });
  }

  async unsubscribe(endpoint: string) {
    return this.prisma.pushSubscription.delete({
      where: { endpoint },
    });
  }

  async sendNotificationToUser(userId: string, payload: object) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    const notificationString = JSON.stringify(payload);

    const promises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys as any,
      };
      
      return webpush.sendNotification(pushSubscription, notificationString).catch((err: any) => {
        // If subscription is expired/invalid, remove it from DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          return this.prisma.pushSubscription.delete({
            where: { endpoint: sub.endpoint },
          });
        }
        console.error('Push notification error:', err.message);
      });
    });

    await Promise.allSettled(promises);
  }
}