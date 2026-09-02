import fs from 'fs';
import path from 'path';
import multer from 'multer';

const QUIZ_PAPER_UPLOAD_DIR = './uploads/quiz-papers';
export const QUIZ_PAPER_FILE_LIMIT = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

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

export const quizPaperUpload = multer({
  storage: diskStorage(QUIZ_PAPER_UPLOAD_DIR),
  limits: { fileSize: QUIZ_PAPER_FILE_LIMIT },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF and Word documents are allowed'));
  },
});
