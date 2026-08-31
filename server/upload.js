// Multer storage for uploaded files (CVs, logos, images) into ./uploads.
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Where uploaded files live. By default this is <repo>/uploads, but that path
// is inside the git-deployed tree and gets wiped on every deploy. Set UPLOAD_DIR
// (an absolute path OUTSIDE the deployed repo, e.g. a sibling of public_html) in
// production so uploaded images/CVs persist across deploys.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads');
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
    // SVG excluído de propósito: um SVG servido inline em /uploads executaria
    // script (XSS armazenado). Só formatos raster.
    const ok = /\.(png|jpg|jpeg|webp|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error('invalid_file_type'), ok);
  },
});

// Parses multipart/form-data that carries only text fields (no files),
// e.g. the contact form which is submitted as FormData by the browser.
export const uploadNone = multer().none();

export function publicUrl(filename) {
  return `/uploads/${filename}`;
}
