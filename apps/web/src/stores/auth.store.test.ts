import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, User } from './auth.store';

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('should initialize with no authenticated user', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it('should set authenticated user and tokens correctly for regular user', () => {
    const user: User = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'USER',
    };

    useAuthStore.getState().setAuth(user, 'mock-access-token', 'mock-refresh-token');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('mock-access-token');
    expect(state.refreshToken).toBe('mock-refresh-token');
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it('should correctly identify ADMIN users', () => {
    const adminUser: User = {
      id: 'admin-1',
      email: 'admin@allobook.id',
      name: 'AlloBook Admin',
      role: 'ADMIN',
    };

    useAuthStore.getState().setAuth(adminUser, 'admin-token', 'admin-refresh');
    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it('should clear authentication data on logout', () => {
    useAuthStore.getState().setAuth(
      { id: '1', email: 'test@test.com', name: 'Test', role: 'USER' },
      'tok',
      'ref'
    );

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });
});
