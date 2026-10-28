export type Size = 'S' | 'M' | 'L';
export type Role = 'CUSTOMER' | 'STAFF';
export type PaymentMethod = 'WALLET' | 'CARD';
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  stock: number;
}

export interface SizeOption {
  size: Size;
  label: string;
  volumeMl: number;
  priceDelta: number;
}

export interface Topping {
  id: number;
  name: string;
  price: number;
}

export interface ProductDetail extends Product {
  sizes: SizeOption[];
  toppings: Topping[];
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  loyaltyPoints: number;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  size: Size;
  toppings: Topping[];
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface Payment {
  id: number;
  method: PaymentMethod;
  status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  amount: number;
  transactionRef: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  couponCode: string | null;
  pointsEarned: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: Payment[];
  user?: { fullName: string };
}

export interface PayResult {
  payment: Payment;
  order: Order;
  replayed: boolean;
}

export interface CouponCheck {
  code: string;
  valid: boolean;
  discount: number;
  message: string;
}

export interface CouponSuggestion {
  code: string;
  description: string;
  minSubtotal: number;
}
