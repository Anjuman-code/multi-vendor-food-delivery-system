// Order types

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variants?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
  specialInstructions?: string;
  itemTotal: number;
}

export interface DeliveryAddress {
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: { latitude: number; longitude: number };
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type PaymentStatusType = "pending" | "paid" | "failed" | "refunded";

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
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
  driverId?: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  paymentMethod: string;
  paymentStatus: PaymentStatusType;
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

export interface CreateOrderPayload {
  restaurantId: string;
  items: {
    menuItemId: string;
    quantity: number;
    variants?: { name: string; price: number }[];
    addons?: { name: string; price: number }[];
    specialInstructions?: string;
  }[];
  deliveryAddress: DeliveryAddress;
  paymentMethod: string;
  couponCode?: string;
  specialInstructions?: string;
}
