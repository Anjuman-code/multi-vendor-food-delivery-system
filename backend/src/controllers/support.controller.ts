/**
 * Support ticket controller — customers create/view tickets;
 * support agents manage and resolve them.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import SupportTicket, { TicketStatus } from "../models/SupportTicket";
import { createAuditLog } from "../utils/audit.util";
import { successResponse } from "../utils/response.util";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import type { AuthRequest } from "../types";
import type {
  CreateTicketInput,
  AddMessageInput,
  UpdateTicketInput,
} from "../validations/support.validation";
import { UserRole } from "../config/constants";

// ── Customer Endpoints ───────────────────────────────────────────

/** POST /api/support/tickets — Customer creates a ticket */
export const createTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const data = req.body as CreateTicketInput;

    const ticket = await SupportTicket.create({
      userId: authReq.user._id,
      type: data.type,
      priority: data.priority || "medium",
      status: TicketStatus.OPEN,
      subject: data.subject,
      messages: [
        {
          senderId: authReq.user._id,
          senderRole: authReq.user.role,
          message: data.message,
          attachments: [],
          createdAt: new Date(),
        },
      ],
      orderId: data.orderId ? new mongoose.Types.ObjectId(data.orderId) : undefined,
    });

    successResponse(res, { ticket }, "Ticket created", 201);
  } catch (error) {
    next(error);
  }
};

/** GET /api/support/tickets — Customer lists their tickets */
export const getMyTickets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const tickets = await SupportTicket.find({ userId: authReq.user._id })
      .sort("-createdAt");

    successResponse(res, { tickets, count: tickets.length });
  } catch (error) {
    next(error);
  }
};

/** GET /api/support/tickets/:ticketId — Customer views a ticket */
export const getMyTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      userId: authReq.user._id,
    });
    if (!ticket) throw new NotFoundError("Ticket not found");

    successResponse(res, { ticket });
  } catch (error) {
    next(error);
  }
};

/** POST /api/support/tickets/:ticketId/messages — Customer adds a reply */
export const addMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { message, attachments } = req.body as AddMessageInput;

    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      userId: authReq.user._id,
    });
    if (!ticket) throw new NotFoundError("Ticket not found");

    if (ticket.status === TicketStatus.CLOSED) {
      throw new ValidationError("Cannot reply to a closed ticket");
    }

    ticket.messages.push({
      senderId: authReq.user._id,
      senderRole: authReq.user.role,
      message,
      attachments: attachments || [],
      createdAt: new Date(),
    });

    // Move back to open if waiting on user
    if (ticket.status === TicketStatus.WAITING_ON_USER) {
      ticket.status = TicketStatus.OPEN;
    }

    await ticket.save();

    successResponse(res, { ticket }, "Reply added");
  } catch (error) {
    next(error);
  }
};

// ── Admin / Support Agent Endpoints ──────────────────────────────

/** GET /api/admin/tickets — Admin lists all tickets */
export const listAllTickets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tickets = await SupportTicket.find(filter)
      .populate("userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName")
      .sort("-createdAt");

    successResponse(res, { tickets, count: tickets.length });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/tickets/:ticketId — Admin views a ticket */
export const getTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const ticket = await SupportTicket.findById(req.params.ticketId)
      .populate("userId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName");
    if (!ticket) throw new NotFoundError("Ticket not found");

    successResponse(res, { ticket });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/tickets/:ticketId — Admin updates status/priority/assignment */
export const updateTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const updates = req.body as UpdateTicketInput;

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) throw new NotFoundError("Ticket not found");

    const changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }> = [];

    if (updates.status && updates.status !== ticket.status) {
      changes.push({ field: "status", oldValue: ticket.status, newValue: updates.status });
      ticket.status = updates.status;
    }
    if (updates.priority && updates.priority !== ticket.priority) {
      changes.push({ field: "priority", oldValue: ticket.priority, newValue: updates.priority });
      ticket.priority = updates.priority;
    }
    if (updates.assignedTo !== undefined) {
      changes.push({
        field: "assignedTo",
        oldValue: ticket.assignedTo?.toString(),
        newValue: updates.assignedTo,
      });
      ticket.assignedTo = updates.assignedTo
        ? new mongoose.Types.ObjectId(updates.assignedTo)
        : undefined;
    }
    if (updates.resolution !== undefined) {
      changes.push({ field: "resolution", newValue: updates.resolution });
      ticket.resolution = updates.resolution;
    }

    await ticket.save();

    if (changes.length > 0) {
      await createAuditLog({
        actorId: authReq.user._id,
        actorRole: authReq.user.role,
        action: "ticket.updated",
        resourceType: "SupportTicket",
        resourceId: ticket._id,
        changes,
      });
    }

    successResponse(res, { ticket }, "Ticket updated");
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/tickets/:ticketId/messages — Admin replies to a ticket */
export const adminAddMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    if (
      authReq.user.role !== UserRole.ADMIN &&
      authReq.user.role !== UserRole.SUPPORT
    ) {
      throw new AuthorizationError("Only support agents can reply");
    }

    const { message, attachments } = req.body as AddMessageInput;

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) throw new NotFoundError("Ticket not found");

    if (ticket.status === TicketStatus.CLOSED) {
      throw new ValidationError("Cannot reply to a closed ticket");
    }

    ticket.messages.push({
      senderId: authReq.user._id,
      senderRole: authReq.user.role,
      message,
      attachments: attachments || [],
      createdAt: new Date(),
    });

    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }

    if (!ticket.assignedTo) {
      ticket.assignedTo = authReq.user._id;
    }

    await ticket.save();

    successResponse(res, { ticket }, "Reply added");
  } catch (error) {
    next(error);
  }
};
