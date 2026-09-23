import { describe, it, expect } from 'vitest';
import { shouldAdvanceStatus, applyStatusUpdate } from '@maildesk/core';

describe('Core Package - Status Rank Lattice', () => {
  it('should advance from queued to sending', () => {
    expect(shouldAdvanceStatus('queued', 'sending')).toBe(true);
  });

  it('should advance from sending to sent', () => {
    expect(shouldAdvanceStatus('sending', 'sent')).toBe(true);
  });

  it('should advance from sent to delivered', () => {
    expect(shouldAdvanceStatus('sent', 'delivered')).toBe(true);
  });

  it('should advance from delivered to read', () => {
    expect(shouldAdvanceStatus('delivered', 'read')).toBe(true);
  });

  it('should not advance backwards', () => {
    expect(shouldAdvanceStatus('delivered', 'sent')).toBe(false);
    expect(shouldAdvanceStatus('sent', 'queued')).toBe(false);
  });

  it('should not advance to same status', () => {
    expect(shouldAdvanceStatus('sent', 'sent')).toBe(false);
  });

  it('should always apply terminal status', () => {
    expect(shouldAdvanceStatus('queued', 'failed')).toBe(true);
    expect(shouldAdvanceStatus('delivered', 'bounced')).toBe(true);
    expect(shouldAdvanceStatus('read', 'complained')).toBe(true);
  });

  it('should not override terminal status with non-terminal', () => {
    expect(shouldAdvanceStatus('failed', 'sent')).toBe(false);
    expect(shouldAdvanceStatus('bounced', 'delivered')).toBe(false);
  });

  it('should apply status update when advancing', () => {
    expect(applyStatusUpdate('queued', 'sending')).toBe('sending');
  });

  it('should keep current status when not advancing', () => {
    expect(applyStatusUpdate('delivered', 'sent')).toBe('delivered');
  });

  it('should apply terminal status over any status', () => {
    expect(applyStatusUpdate('sent', 'failed')).toBe('failed');
    expect(applyStatusUpdate('delivered', 'bounced')).toBe('bounced');
  });
});
