const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  token?: string;
  timeout?: number;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, timeout = 6000, signal, ...rest } = options;

  const authHeader: Record<string, string> = {};

  // Try passed token first, then check localStorage on client side
  const authToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);

  if (authToken) {
    authHeader['Authorization'] = `Bearer ${authToken}`;
  }

  const isFormData = rest.body instanceof FormData;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...authHeader,
        ...(headers as Record<string, string>),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || data?.error || `HTTP error ${response.status}`);
    }

    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
