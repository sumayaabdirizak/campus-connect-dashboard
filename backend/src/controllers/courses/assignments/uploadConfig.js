import fs from 'fs';
import path from 'path';
import multer from 'multer';

const ASSIGNMENT_UPLOAD_DIR = './uploads/assignments';
const SUBMISSION_UPLOAD_DIR = './uploads/submissions';
export const ASSIGNMENT_FILE_LIMIT = 25 * 1024 * 1024;

function diskStorage(dir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
}

export const assignmentUpload = multer({
  storage: diskStorage(ASSIGNMENT_UPLOAD_DIR),
  limits: { fileSize: ASSIGNMENT_FILE_LIMIT },
});

export const submissionUpload = multer({
  storage: diskStorage(SUBMISSION_UPLOAD_DIR),
  limits: { fileSize: ASSIGNMENT_FILE_LIMIT },
});
