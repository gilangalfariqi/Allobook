import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from './chat.store';

describe('ChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().resetSession();
  });

  it('should initialize with default welcome message and closed state', () => {
    const state = useChatStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].id).toBe('welcome');
    expect(state.messages[0].role).toBe('assistant');
    expect(state.orderSessionToken).toBeNull();
    expect(state.isStreaming).toBe(false);
  });

  it('should toggle and set open state', () => {
    useChatStore.getState().toggleOpen();
    expect(useChatStore.getState().isOpen).toBe(true);

    useChatStore.getState().setOpen(false);
    expect(useChatStore.getState().isOpen).toBe(false);
  });

  it('should set order session token for verified order inquiries', () => {
    useChatStore.getState().setOrderSessionToken('mock-jwt-token-15m');
    expect(useChatStore.getState().orderSessionToken).toBe('mock-jwt-token-15m');
  });

  it('should reset session and clear token and messages', () => {
    const initialSessionId = useChatStore.getState().sessionId;
    useChatStore.getState().setOrderSessionToken('token-to-be-cleared');

    useChatStore.getState().resetSession();

    expect(useChatStore.getState().orderSessionToken).toBeNull();
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].id).toBe('welcome');
    expect(useChatStore.getState().sessionId).not.toBe(initialSessionId);
  });

  it('should not send empty message', async () => {
    const initialCount = useChatStore.getState().messages.length;
    await useChatStore.getState().sendMessage('   ');
    expect(useChatStore.getState().messages.length).toBe(initialCount);
  });
});
