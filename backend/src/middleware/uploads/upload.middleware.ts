import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, RequestHandler } from "express";
import { v2 as cloudinary } from "cloudinary";

const UPLOAD_ROOT = path.resolve(__dirname, "../../../uploads");
const PROFILE_DIR = path.join(UPLOAD_ROOT, "profiles");
const COVER_DIR = path.join(UPLOAD_ROOT, "covers");

[PROFILE_DIR, COVER_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const isCloudinaryConfigured = (): boolean =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

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

export const uploadProfilePhoto: RequestHandler = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("profilePhoto");

export const uploadCoverPhoto: RequestHandler = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("coverPhoto");

export const uploadImageToCloud = async (
  filePath: string,
  type: "profiles" | "covers",
  userId: string,
): Promise<string | null> => {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  const folderRoot = process.env.CLOUDINARY_FOLDER || "food-delivery";
  const baseName = path.parse(filePath).name;

  const result = await cloudinary.uploader.upload(filePath, {
    folder: `${folderRoot}/${type}`,
    public_id: `${type}-${userId}-${Date.now()}-${baseName}`,
    resource_type: "image",
    overwrite: true,
  });

  return result.secure_url;
};

export const removeLocalFile = (filePath: string | undefined): void => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
};

const extractCloudinaryPublicId = (url: string): string | null => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match?.[1] ?? null;
};

export const removeOldFile = (fileUrl: string | undefined): void => {
  if (!fileUrl) return;
  try {
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      if (fileUrl.includes("res.cloudinary.com") && isCloudinaryConfigured()) {
        const publicId = extractCloudinaryPublicId(fileUrl);
        if (publicId) {
          void cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
          });
        }
      }
      return;
    }

    const relativePath = fileUrl.replace(/^\//, "");
    const fullPath = path.resolve(__dirname, "../../..", relativePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {}
};
