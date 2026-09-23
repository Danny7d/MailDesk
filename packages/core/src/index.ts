// Status rank lattice from 02-system.md §D.5
// This is a pure function with no I/O dependencies

export type MessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'bounced'
  | 'complained';

const STATUS_RANK: Record<MessageStatus, number> = {
  queued: 10,
  sending: 20,
  sent: 30,
  delivered: 40,
  read: 50,
  failed: 85,
  bounced: 90,
  complained: 95,
};

const TERMINAL_STATUSES: Set<MessageStatus> = new Set(['failed', 'bounced', 'complained']);

/**
 * Returns true if the new status should advance the message status.
 * Terminal statuses (failed, bounced, complained) always win over non-terminal statuses.
 */
export function shouldAdvanceStatus(current: MessageStatus, incoming: MessageStatus): boolean {
  const currentRank = STATUS_RANK[current];
  const incomingRank = STATUS_RANK[incoming];

  // Terminal statuses always apply
  if (TERMINAL_STATUSES.has(incoming)) {
    return true;
  }

  // Non-terminal statuses only advance forward
  return incomingRank > currentRank;
}

/**
 * Returns the effective status after applying an incoming status to the current status.
 */
export function applyStatusUpdate(current: MessageStatus, incoming: MessageStatus): MessageStatus {
  return shouldAdvanceStatus(current, incoming) ? incoming : current;
}
