/** Named BullMQ queues used across the platform. */
export const QUEUES = {
  WEBHOOK: 'webhook',
  AI: 'ai',
  NOTIFICATION: 'notification',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** Job names within the AI queue. */
export const AI_JOBS = {
  ANALYZE_CONVERSATION: 'analyze-conversation',
} as const;

/** Job names within the webhook queue. */
export const WEBHOOK_JOBS = {
  PROCESS_EVENT: 'process-event',
} as const;

/** Shared job options: bounded retries with backoff feed the dead-letter flow. */
export const DEFAULT_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};
