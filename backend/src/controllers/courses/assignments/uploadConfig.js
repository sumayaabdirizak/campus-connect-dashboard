import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  ASSIGNMENT_ATTACHMENT_EXTENSIONS,
  validateDocumentName,
} from '../../../utils/validateDocumentName.js';

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

function assignmentFileFilter(_req, file, cb) {
  const result = validateDocumentName(file.originalname, {
    allowedExtensions: ASSIGNMENT_ATTACHMENT_EXTENSIONS,
  });
  if (!result.ok) {
    cb(new Error(result.message));
    return;
  }
  cb(null, true);
}

export const assignmentUpload = multer({
  storage: diskStorage(ASSIGNMENT_UPLOAD_DIR),
  limits: { fileSize: ASSIGNMENT_FILE_LIMIT },
  fileFilter: assignmentFileFilter,
});

export const submissionUpload = multer({
  storage: diskStorage(SUBMISSION_UPLOAD_DIR),
  limits: { fileSize: ASSIGNMENT_FILE_LIMIT },
});
