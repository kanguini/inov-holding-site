// Multer storage for uploaded files (CVs, logos, images) into ./uploads.
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

// CVs: documents only, 8 MB.
export const uploadCv = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|doc|docx)$/i.test(file.originalname);
    cb(ok ? null : new Error('invalid_file_type'), ok);
  },
});

// Images: logos / covers / sector photos, 5 MB.
export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error('invalid_file_type'), ok);
  },
});

// Parses multipart/form-data that carries only text fields (no files),
// e.g. the contact form which is submitted as FormData by the browser.
export const uploadNone = multer().none();

export function publicUrl(filename) {
  return `/uploads/${filename}`;
}
