export const OrderStatus = {
  PENDING:    'PENDING',
  PROCESSING: 'PROCESSING',
  CONFIRMED:  'CONFIRMED',
  SHIPPED:    'SHIPPED',
  DONE:       'DONE',
  CANCELLED:  'CANCELLED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:    'Waiting Confirmation',
  PROCESSING: 'PO Processing',
  CONFIRMED:  'Confirmed',
  SHIPPED:    'Shipped',
  DONE:       'Completed',
  CANCELLED:  'Cancelled',
};
