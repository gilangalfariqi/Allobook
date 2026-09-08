import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  bookId: string;
  slug: string;
  title: string;
  author: string;
  price: number;
  coverUrl?: string | null;
  quantity: number;
  isPreOrder: boolean;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.bookId === item.bookId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.bookId === item.bookId ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity }],
          };
        });
      },

      removeItem: (bookId) => {
        set((state) => ({
          items: state.items.filter((i) => i.bookId !== bookId),
        }));
      },

      updateQuantity: (bookId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(bookId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.bookId === bookId ? { ...i, quantity } : i)),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalAmount: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      totalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'allobook-cart',
    }
  )
);
