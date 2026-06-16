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

/** Fine-grained courier progress within the delivery leg (mirrors backend). */
export type DeliveryStage =
  | 'heading_to_store'
  | 'at_store'
  | 'picked_up'
  | 'heading_to_customer'
  | 'arrived';

/** The two order-scoped chat channels. */
export type MessageChannel = 'customer_driver' | 'customer_vendor';

export interface OrderMessage {
  _id: string;
  orderId: string;
  channel: MessageChannel;
  text: string;
  attachments: string[];
  senderRole: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  readBy: string[];
  createdAt: string;
  /** Client-only flag for optimistic messages awaiting server confirmation. */
  pending?: boolean;
}

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
  address?: {
    street?: string;
    area?: string;
    district?: string;
    coordinates?: { lat?: number; lng?: number };
  };
  location?: { type?: string; coordinates?: [number, number] };
}

/** Assigned rider details surfaced on the live tracking page. */
export interface OrderLiveDriver {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface OrderLiveDriverProfile {
  vehicleType?: string;
  vehicleNumber?: string;
  rating?: { average: number; count: number };
  currentLocation?: { latitude: number; longitude: number };
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
  deliveryStage?: DeliveryStage;
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
  etaMinutes?: number;
  etaUpdatedAt?: string;
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
