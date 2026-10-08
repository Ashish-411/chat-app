import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as webpush from 'web-push';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {
    // Configure VAPID details
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  async subscribe(userId: string, subscription: any) {
    // Store the subscription
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

    // Send to all devices for this user
    const promises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys as any,
      };
      return webpush.sendNotification(pushSubscription, notificationString).catch(err => {
        // If subscription is expired/invalid, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          return this.prisma.pushSubscription.delete({
            where: { endpoint: sub.endpoint },
          });
        }
      });
    });

    await Promise.allSettled(promises);
  }
}