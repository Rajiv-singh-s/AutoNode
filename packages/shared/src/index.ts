import { z } from 'zod';

// ──────────────────────── Shared domain enums ────────────────────
// Mirror the Prisma enums as plain TS unions so the web app can use them
// without importing the Prisma client.

export const CHANNEL_TYPES = ['INSTAGRAM', 'MESSENGER', 'WHATSAPP'] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const CONVERSATION_STATUSES = [
  'OPEN',
  'PENDING',
  'RESOLVED',
  'ARCHIVED',
  'SPAM',
] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const CONVERSATION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type ConversationPriority = (typeof CONVERSATION_PRIORITIES)[number];

export const SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const BUYING_INTENTS = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const;
export type BuyingIntent = (typeof BUYING_INTENTS)[number];

export const ORG_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'SUPPORT'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

// ──────────────────────── Auth DTOs ──────────────────────────────

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
  organizationName: z.string().min(1).max(120),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ──────────────────────── Inbox DTOs ─────────────────────────────

export const listConversationsQuerySchema = z.object({
  status: z.enum(CONVERSATION_STATUSES).optional(),
  channelType: z.enum(CHANNEL_TYPES).optional(),
  assignedAgentId: z.string().optional(),
  search: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

export const sendMessageSchema = z.object({
  text: z.string().min(1).max(4096),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ──────────────────────── AI contracts ───────────────────────────

export interface AiAnalysis {
  summary: string;
  sentiment: Sentiment;
  buyingIntent: BuyingIntent;
  leadScore: number; // 0-100
  priorityScore: number; // 0-100
  isSpam: boolean;
  language: string; // ISO 639-1
  labels: string[];
  suggestedReplies: string[];
}

export interface ConversationMessageView {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderType: 'CONTACT' | 'AGENT' | 'AI' | 'SYSTEM';
  type: string;
  text: string | null;
  aiGenerated: boolean;
  sentAt: string;
}

export interface ConversationListItem {
  id: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  aiSummary: string | null;
  sentiment: Sentiment | null;
  buyingIntent: BuyingIntent;
  priorityScore: number;
  channel: { id: string; type: ChannelType; name: string | null };
  contact: { id: string; name: string | null; username: string | null; avatarUrl: string | null; leadScore: number };
}

// ──────────────────────── WebSocket events ───────────────────────

export const WS_EVENTS = {
  CONVERSATION_UPDATED: 'conversation:updated',
  MESSAGE_CREATED: 'message:created',
  AI_ANALYSIS_READY: 'ai:analysis-ready',
} as const;

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
}
