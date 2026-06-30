import { Injectable } from '@nestjs/common';
import { NotificationType } from '@autonode/database';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a notification for a specific user. */
  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
      },
      select: { id: true, type: true, title: true, body: true, actionUrl: true, read: true, createdAt: true },
    });
  }

  /** Fan a notification out to all members of the organization (or a subset of roles). */
  async broadcast(
    organizationId: string,
    roles: string[],
    type: NotificationType,
    title: string,
    body?: string,
    actionUrl?: string,
  ) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        organizationId,
        ...(roles.length > 0 ? { role: { in: roles as never[] } } : {}),
      },
      select: { userId: true },
    });

    if (memberships.length === 0) return;

    await this.prisma.notification.createMany({
      data: memberships.map((m) => ({
        organizationId,
        userId: m.userId,
        type,
        title,
        body,
        actionUrl,
      })),
      skipDuplicates: true,
    });
  }

  /** List recent notifications for a user (newest first, max 50). */
  async list(userId: string, onlyUnread = false) {
    const where = { userId, ...(onlyUnread ? { read: false } : {}) };
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, type: true, title: true, body: true, actionUrl: true, read: true, createdAt: true },
      }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { notifications, unreadCount };
  }

  /** Mark one notification as read. */
  async markRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    return { success: true };
  }

  /** Mark all notifications as read for a user. */
  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  /** Unread count only — used for the notification badge. */
  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }
}
