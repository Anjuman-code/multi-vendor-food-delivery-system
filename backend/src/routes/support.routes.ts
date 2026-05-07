import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { UserRole } from "../config/constants";
import {
  createTicket,
  getMyTickets,
  getMyTicket,
  addMessage,
  listAllTickets,
  getTicket,
  updateTicket,
  adminAddMessage,
} from "../controllers/support.controller";
import {
  createTicketSchema,
  addMessageSchema,
  updateTicketSchema,
} from "../validations/support.validation";

const router = Router();

// Customer routes
router.use("/support/tickets", authenticate);
router.post("/support/tickets", validate(createTicketSchema), createTicket);
router.get("/support/tickets", getMyTickets);
router.get("/support/tickets/:ticketId", getMyTicket);
router.post(
  "/support/tickets/:ticketId/messages",
  validate(addMessageSchema),
  addMessage,
);

// Admin / Support agent routes
router.use(
  "/admin/tickets",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
);
router.get("/admin/tickets", listAllTickets);
router.get("/admin/tickets/:ticketId", getTicket);
router.patch(
  "/admin/tickets/:ticketId",
  validate(updateTicketSchema),
  updateTicket,
);
router.post(
  "/admin/tickets/:ticketId/messages",
  validate(addMessageSchema),
  adminAddMessage,
);

export default router;
