import type {
  BuyingIntent,
  ChannelType,
  ConversationPriority,
  ConversationStatus,
  Sentiment,
} from '@autonode/shared';

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
  contact: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
    leadScore: number;
  };
}

export interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderType: 'CONTACT' | 'AGENT' | 'AI' | 'SYSTEM';
  type: string;
  text: string | null;
  aiGenerated: boolean;
  deliveryStatus: string;
  sentAt: string;
}

export interface InternalNote {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null };
}

export interface ConversationDetail extends ConversationListItem {
  language: string | null;
  isSpam: boolean;
  aiSuggestedReplies: string[];
  contact: ConversationListItem['contact'] & {
    externalId: string;
    leadStage: string;
    tags: string[];
  };
  assignedAgent: { id: string; name: string | null; email: string } | null;
  messages: Message[];
  internalNotes: InternalNote[];
  labels: { label: { id: string; name: string; color: string } }[];
}

export interface Paginated<T> {
  data: T[];
  nextCursor: string | null;
}
