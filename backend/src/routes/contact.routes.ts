import { Router } from "express";
import { submitContactForm } from "../controllers/contact.controller";
import { rateLimit } from "express-rate-limit";

const router = Router();

const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many contact submissions. Please try again later.",
  },
});

router.post("/contact", contactRateLimit, submitContactForm);

export default router;
