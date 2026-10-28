import type { OrderStatus, Size } from './types';

const vnd = new Intl.NumberFormat('vi-VN');

export const formatVnd = (n: number) => `${vnd.format(n)}đ`;

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

export const orderCode = (id: number) => `#${id}`;

export const SIZE_LABEL: Record<Size, string> = { S: 'Nhỏ', M: 'Vừa', L: 'Lớn' };

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PAYMENT_FAILED: 'Thanh toán lỗi',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng nhận',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

export const METHOD_LABEL = { WALLET: 'Ví điện tử', CARD: 'Thẻ ngân hàng' } as const;
