/**
 * Multer upload middleware — stores profile and cover photos
 * on the local filesystem under `backend/uploads/`.
 *
 * Files are served statically via Express at `/uploads/…`.
 */
import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// ── Upload directories ─────────────────────────────────────────
const UPLOAD_ROOT = path.resolve(__dirname, "../../../uploads");
const PROFILE_DIR = path.join(UPLOAD_ROOT, "profiles");
const COVER_DIR = path.join(UPLOAD_ROOT, "covers");

// Ensure directories exist
[PROFILE_DIR, COVER_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Storage config ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    const dir = file.fieldname === "coverPhoto" ? COVER_DIR : PROFILE_DIR;
    cb(null, dir);
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const userId = req.user?._id?.toString() ?? "unknown";
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = file.fieldname === "coverPhoto" ? "cover" : "profile";
    cb(null, `${prefix}-${userId}-${Date.now()}${ext}`);
  },
});

// ── File filter ────────────────────────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
  }
};

// ── Export multer instances ────────────────────────────────────
export const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("profilePhoto");

export const uploadCoverPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("coverPhoto");

/** Helper: remove an old file by its full URL path (no-op if missing). */
export const removeOldFile = (fileUrl: string | undefined): void => {
  if (!fileUrl) return;
  try {
    // fileUrl is stored like "/uploads/profiles/profile-xxx.jpg"
    const relativePath = fileUrl.replace(/^\//, "");
    const fullPath = path.resolve(__dirname, "../../..", relativePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // Swallow – file removal is best-effort
  }
};
