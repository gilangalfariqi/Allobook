import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart.store';

describe('CartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('should initialize with an empty cart', () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
    expect(useCartStore.getState().totalItems()).toBe(0);
    expect(useCartStore.getState().totalAmount()).toBe(0);
  });

  it('should add items and calculate quantity & total price correctly', () => {
    const bookA = {
      bookId: 'book-1',
      slug: 'laskar-pelangi',
      title: 'Laskar Pelangi',
      author: 'Andrea Hirata',
      price: 95000,
      isPreOrder: false,
    };

    useCartStore.getState().addItem(bookA, 2);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(useCartStore.getState().totalItems()).toBe(2);
    expect(useCartStore.getState().totalAmount()).toBe(190000);

    // Adding same book should increase quantity
    useCartStore.getState().addItem(bookA, 1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    expect(useCartStore.getState().totalAmount()).toBe(285000);
  });

  it('should handle pre-order books alongside regular books', () => {
    useCartStore.getState().addItem({
      bookId: 'book-po',
      slug: 'rare-manuscript',
      title: 'Rare Architecture Manuscript',
      author: 'Vitruvius',
      price: 250000,
      isPreOrder: true,
    });

    const items = useCartStore.getState().items;
    expect(items[0].isPreOrder).toBe(true);
    expect(items[0].price).toBe(250000);
  });

  it('should update quantity and remove item if quantity is zero', () => {
    useCartStore.getState().addItem({
      bookId: 'book-1',
      slug: 'test-slug',
      title: 'Test Book',
      author: 'Author',
      price: 50000,
      isPreOrder: false,
    }, 2);

    useCartStore.getState().updateQuantity('book-1', 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);

    useCartStore.getState().updateQuantity('book-1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('should remove item and clear cart', () => {
    useCartStore.getState().addItem({
      bookId: 'book-1',
      slug: 'book-1',
      title: 'Book 1',
      author: 'Author 1',
      price: 10000,
      isPreOrder: false,
    });
    useCartStore.getState().addItem({
      bookId: 'book-2',
      slug: 'book-2',
      title: 'Book 2',
      author: 'Author 2',
      price: 20000,
      isPreOrder: false,
    });

    useCartStore.getState().removeItem('book-1');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].bookId).toBe('book-2');

    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
