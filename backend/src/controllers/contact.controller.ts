/**
 * Contact form controller – handles public contact submissions
 * by creating support tickets.
 */
import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import SupportTicket, { TicketStatus, TicketPriority } from "../models/SupportTicket";
import type { AuthRequest } from "../types";
import { successResponse } from "../utils/response.util";
import { ValidationError } from "../utils/errors";

export const submitContactForm = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      throw new ValidationError("Name, email, subject, and message are required");
    }

    if (subject.length < 5) {
      throw new ValidationError("Subject must be at least 5 characters");
    }

    if (message.length < 20) {
      throw new ValidationError("Message must be at least 20 characters");
    }

    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const ticket = await SupportTicket.create({
      userId: userId || new mongoose.Types.ObjectId(),
      type: "general",
      priority: TicketPriority.LOW,
      status: TicketStatus.OPEN,
      subject: `[Contact Form] ${subject}`,
      messages: [
        {
          senderId: userId || new mongoose.Types.ObjectId(),
          senderRole: userId ? "customer" : "anonymous",
          message: `Name: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ""}\n\n${message}`,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    successResponse(
      res,
      { ticketId: ticket._id },
      "Your message has been received. We'll get back to you within 24 hours.",
      201,
    );
  } catch (error) {
    next(error);
  }
};
