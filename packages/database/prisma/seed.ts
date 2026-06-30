import {
  PrismaClient,
  OrgRole,
  ChannelType,
  ChannelStatus,
  ConversationStatus,
  ConversationPriority,
  MessageDirection,
  MessageType,
  SenderType,
  Sentiment,
  BuyingIntent,
  LeadStage,
  Prisma,
} from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

/** Mirrors the password hashing used by the API auth module (scrypt). */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);
const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!;

async function main() {
  console.log('🌱 Seeding AutoNode...');

  const owner = await prisma.user.upsert({
    where: { email: 'owner@autonode.dev' },
    update: {},
    create: {
      email: 'owner@autonode.dev',
      name: 'Ada Owner',
      passwordHash: hashPassword('Password123!'),
      emailVerified: new Date(),
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'sam@autonode.dev' },
    update: {},
    create: {
      email: 'sam@autonode.dev',
      name: 'Sam Sales',
      passwordHash: hashPassword('Password123!'),
      emailVerified: new Date(),
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Inc',
      slug: 'acme',
      plan: 'pro',
      trialEndsAt: daysAgo(-14),
    },
  });

  for (const [user, role] of [
    [owner, OrgRole.OWNER],
    [agent, OrgRole.SALES],
  ] as const) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: { role },
      create: { userId: user.id, organizationId: org.id, role },
    });
  }

  // Three connected channels (Instagram, Messenger, WhatsApp).
  const channelDefs = [
    { type: ChannelType.INSTAGRAM, externalId: 'ig_demo_1784140', name: 'Acme Store', username: 'acme.store' },
    { type: ChannelType.MESSENGER, externalId: 'fb_page_99001', name: 'Acme Page', username: 'acmeinc' },
    { type: ChannelType.WHATSAPP, externalId: 'wa_pn_55510', name: 'Acme WhatsApp', username: '+1 555-0110' },
  ];
  const channels = [];
  for (const def of channelDefs) {
    channels.push(
      await prisma.channel.upsert({
        where: {
          organizationId_type_externalId: {
            organizationId: org.id,
            type: def.type,
            externalId: def.externalId,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          type: def.type,
          status: ChannelStatus.CONNECTED,
          externalId: def.externalId,
          name: def.name,
          username: def.username,
          lastSyncedAt: new Date(),
        },
      }),
    );
  }

  // Clean prior demo contacts/conversations so re-seeding is idempotent.
  await prisma.message.deleteMany({ where: { organizationId: org.id } });
  await prisma.conversation.deleteMany({ where: { organizationId: org.id } });
  await prisma.contact.deleteMany({ where: { organizationId: org.id } });

  const names = [
    'Jordan Lee', 'Maya Chen', 'Diego Alvarez', 'Priya Nair', 'Tom Becker',
    'Aisha Khan', 'Liam Murphy', 'Sofia Rossi', 'Noah Kim', 'Elena Petrova',
    'Marcus Bell', 'Yuki Tanaka', 'Hana Cohen', 'Omar Farouk', 'Grace Park',
  ];
  const stages = [
    LeadStage.NEW, LeadStage.NEW, LeadStage.CONTACTED, LeadStage.CONTACTED,
    LeadStage.QUALIFIED, LeadStage.QUALIFIED, LeadStage.PROPOSAL,
    LeadStage.NEGOTIATION, LeadStage.WON, LeadStage.WON, LeadStage.LOST,
  ];
  const intents = [BuyingIntent.LOW, BuyingIntent.MEDIUM, BuyingIntent.HIGH, BuyingIntent.NONE];
  const sentiments = [Sentiment.POSITIVE, Sentiment.NEUTRAL, Sentiment.NEGATIVE];
  const priorities = [
    ConversationPriority.LOW, ConversationPriority.MEDIUM,
    ConversationPriority.HIGH, ConversationPriority.URGENT,
  ];
  const sampleMsgs = [
    'Hi! Love your products 😍',
    'Do you ship internationally?',
    'How much for 3 units?',
    'Is this still available?',
    'Can I get a discount code?',
    'What are the dimensions?',
    'Just placed my order, thanks!',
  ];

  let created = 0;
  for (let i = 0; i < names.length; i++) {
    const channel = pick(channels, i);
    const stage = pick(stages, i);
    const score = stage === LeadStage.WON ? 90 + (i % 10) : stage === LeadStage.LOST ? 15 : 35 + ((i * 7) % 55);
    const won = stage === LeadStage.WON;
    const intent = won ? BuyingIntent.HIGH : pick(intents, i);
    const createdAt = daysAgo(i % 14);

    const contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        channelId: channel.id,
        externalId: `ext_${channel.type}_${i}`,
        name: names[i]!,
        username: names[i]!.toLowerCase().replace(' ', '.'),
        leadStage: stage,
        leadScore: Math.min(100, score),
        leadValue: won ? new Prisma.Decimal(250 + i * 120) : i % 3 === 0 ? new Prisma.Decimal(180) : null,
        source: `${channel.type.toLowerCase()}_dm`,
        tags: won ? ['customer'] : i % 2 === 0 ? ['warm'] : [],
        createdAt,
      },
    });

    const lastAt = daysAgo(i % 7);
    await prisma.conversation.create({
      data: {
        organizationId: org.id,
        channelId: channel.id,
        contactId: contact.id,
        status: won ? ConversationStatus.RESOLVED : pick([ConversationStatus.OPEN, ConversationStatus.PENDING, ConversationStatus.OPEN], i),
        priority: pick(priorities, i),
        unreadCount: i % 3 === 0 ? 1 : 0,
        lastMessageAt: lastAt,
        lastMessagePreview: pick(sampleMsgs, i + 1),
        aiSummary: `${names[i]} — ${intent === BuyingIntent.HIGH ? 'strong purchase intent' : 'exploring options'} via ${channel.type.toLowerCase()}.`,
        sentiment: pick(sentiments, i),
        buyingIntent: intent,
        priorityScore: Math.min(100, score + (intent === BuyingIntent.HIGH ? 15 : 0)),
        language: 'en',
        createdAt,
        messages: {
          create: [
            {
              organizationId: org.id,
              direction: MessageDirection.INBOUND,
              senderType: SenderType.CONTACT,
              type: MessageType.TEXT,
              text: pick(sampleMsgs, i),
              externalId: `mid_${i}_1`,
              sentAt: new Date(lastAt.getTime() - 900_000),
            },
            {
              organizationId: org.id,
              direction: MessageDirection.OUTBOUND,
              senderType: SenderType.AGENT,
              type: MessageType.TEXT,
              text: 'Thanks for reaching out! How can we help?',
              externalId: `mid_${i}_2`,
              sentByUserId: agent.id,
              sentAt: new Date(lastAt.getTime() - 300_000),
            },
            {
              organizationId: org.id,
              direction: MessageDirection.INBOUND,
              senderType: SenderType.CONTACT,
              type: MessageType.TEXT,
              text: pick(sampleMsgs, i + 2),
              externalId: `mid_${i}_3`,
              sentAt: lastAt,
            },
          ],
        },
      },
    });
    created++;
  }

  console.log(`✅ Seeded org=${org.slug}: ${channels.length} channels, ${created} contacts + conversations`);
  console.log('   Owner login: owner@autonode.dev / Password123!');
  console.log('   Agent login: sam@autonode.dev   / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
