export type TicketType =
  | "order_issue"
  | "refund_request"
  | "account_issue"
  | "restaurant_complaint"
  | "driver_complaint"
  | "general";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_on_user"
  | "resolved"
  | "closed";

export interface TicketMessage {
  senderId:
    | string
    | { _id: string; firstName: string; lastName: string; email?: string };
  senderRole: string;
  message: string;
  attachments: string[];
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  ticketNumber?: string;
  userId:
    | string
    | { _id: string; firstName: string; lastName: string; email: string };
  orderId?:
    | string
    | { _id: string; orderNumber: string; status: string };
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  messages: TicketMessage[];
  assignedTo?:
    | string
    | { _id: string; firstName: string; lastName: string };
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListResponse {
  tickets: SupportTicket[];
  count: number;
}

export interface TicketAdminListResponse {
  tickets: SupportTicket[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

export interface CreateTicketPayload {
  type: TicketType;
  priority?: TicketPriority;
  subject: string;
  message: string;
  orderId?: string;
}

export interface AddMessagePayload {
  message: string;
  attachments?: string[];
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  resolution?: string;
}

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  order_issue: "Order Issue",
  refund_request: "Refund Request",
  account_issue: "Account Issue",
  restaurant_complaint: "Restaurant Complaint",
  driver_complaint: "Driver Complaint",
  general: "General Inquiry",
};

export const TICKET_TYPE_ICONS: Record<TicketType, string> = {
  order_issue: "Package",
  refund_request: "CreditCard",
  account_issue: "User",
  restaurant_complaint: "Store",
  driver_complaint: "Bike",
  general: "HelpCircle",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_user: "Waiting on You",
  resolved: "Resolved",
  closed: "Closed",
};
