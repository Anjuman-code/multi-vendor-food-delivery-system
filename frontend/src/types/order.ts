// Order types

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variants?: { variantId?: string; name: string; price: number }[];
  addons?: { addonId?: string; name: string; price: number }[];
  specialInstructions?: string;
  itemTotal: number;
}

export interface DeliveryAddress {
  street: string;
  apartment?: string;
  area: string;
  district: string;
  coordinates: { latitude: number; longitude: number };
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export type PaymentStatusType = 'pending' | 'paid' | 'failed' | 'refunded';

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  actorId?: string;
  actorRole?: string;
  note?: string;
}

export interface OrderRestaurant {
  _id: string;
  name: string;
  images?: { logo?: string };
  contactInfo?: { phone?: string; email?: string };
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  restaurantId: string | OrderRestaurant;
  groupOrderId?: string;
  driverId?: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  paymentMethod: string;
  paymentStatus: PaymentStatusType;
  codCollected?: boolean;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  specialInstructions?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderFromCartResponse {
  orders: Order[];
  groupOrderId: string;
}

export interface OrderReview {
  _id: string;
  customerId: string;
  restaurantId: string;
  orderId: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  helpfulVotes: number;
  unhelpfulVotes: number;
  reply?: { text: string; repliedAt: string };
  createdAt: string;
  updatedAt: string;
}

export interface OrderDriverRating {
  _id: string;
  driverId: string;
  customerId: string;
  orderId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  restaurantId: string;
  items: {
    menuItemId: string;
    quantity: number;
    variants?: { optionId?: string; name?: string }[];
    addons?: { optionId?: string; name?: string }[];
    specialInstructions?: string;
  }[];
  deliveryAddress: DeliveryAddress;
  paymentMethod: string;
  couponCode?: string;
  specialInstructions?: string;
}
