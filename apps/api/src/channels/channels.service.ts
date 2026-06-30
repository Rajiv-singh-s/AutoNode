import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChannelStatus } from '@autonode/database';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import { BillingService } from '../billing/billing.service';
import type { ConnectChannelDto, UpdateChannelDto } from './channels.dto';

const channelSelect = {
  id: true,
  type: true,
  status: true,
  externalId: true,
  name: true,
  username: true,
  avatarUrl: true,
  pageId: true,
  wabaId: true,
  phoneNumberId: true,
  lastSyncedAt: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { conversations: true, contacts: true } },
} as const;

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly billing: BillingService,
  ) {}

  list(orgId: string) {
    return this.prisma.channel.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: channelSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(orgId: string, id: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: channelSelect,
    });
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  async connect(orgId: string, dto: ConnectChannelDto) {
    // Prevent duplicate active channel; revive soft-deleted rows for reconnect.
    const existing = await this.prisma.channel.findFirst({
      where: {
        organizationId: orgId,
        type: dto.type,
        externalId: dto.externalId,
      },
      select: { id: true, deletedAt: true },
    });
    if (existing?.deletedAt == null) {
      throw new ConflictException(
        'A channel of this type with the same external ID is already connected',
      );
    }
    await this.billing.enforceLimit(orgId, 'channels');

    const accessTokenEnc = this.crypto.encrypt(dto.accessToken);

    if (existing?.deletedAt) {
      return this.prisma.channel.update({
        where: { id: existing.id },
        data: {
          status: ChannelStatus.CONNECTED,
          deletedAt: null,
          name: dto.name,
          username: dto.username,
          avatarUrl: dto.avatarUrl,
          accessTokenEnc,
          pageId: dto.pageId,
          wabaId: dto.wabaId,
          phoneNumberId: dto.phoneNumberId,
          lastError: null,
        },
        select: channelSelect,
      });
    }

    return this.prisma.channel.create({
      data: {
        organizationId: orgId,
        type: dto.type,
        status: ChannelStatus.CONNECTED,
        externalId: dto.externalId,
        name: dto.name,
        username: dto.username,
        avatarUrl: dto.avatarUrl,
        accessTokenEnc,
        pageId: dto.pageId,
        wabaId: dto.wabaId,
        phoneNumberId: dto.phoneNumberId,
      },
      select: channelSelect,
    });
  }

  async update(orgId: string, id: string, dto: UpdateChannelDto) {
    await this.assert(orgId, id);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.accessToken) {
      data.accessTokenEnc = this.crypto.encrypt(dto.accessToken);
      data.lastError = null;
    }

    return this.prisma.channel.update({
      where: { id },
      data,
      select: channelSelect,
    });
  }

  async disconnect(orgId: string, id: string): Promise<{ success: true }> {
    await this.assert(orgId, id);
    await this.prisma.channel.update({
      where: { id },
      data: { status: ChannelStatus.DISCONNECTED, deletedAt: new Date() },
    });
    return { success: true };
  }

  /** Returns an aggregated health summary for the org's channels. */
  async healthSummary(orgId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { id: true, type: true, status: true, lastError: true, lastSyncedAt: true },
    });
    const total = channels.length;
    const connected = channels.filter((c) => c.status === ChannelStatus.CONNECTED).length;
    const errored = channels.filter((c) => c.status === ChannelStatus.ERROR).length;
    return { total, connected, errored, channels };
  }

  private async assert(orgId: string, id: string): Promise<void> {
    const exists = await this.prisma.channel.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Channel not found');
  }
}
