import fs from 'fs';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireQuizManage } from '../../../middleware/courseOfferingRbac.js';
import { uploadRateLimit } from '../../../middleware/perUserRateLimit.js';
import { commitUploadedFile, deleteStoredObject } from '../../../storage/objectStorage.js';
import { isUploadedOfflineQuiz } from './helpers.js';
import { quizPaperUpload } from './uploadConfig.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:quizId/paper-file',
    uploadRateLimit,
    requireQuizManage(),
    quizPaperUpload.single('file'),
    asyncHandler(async (req, res) => {
      const quiz = req.quiz;
      if (!isUploadedOfflineQuiz(quiz)) {
        if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
        return res.status(400).json({
          message: 'Paper upload is only for offline quizzes using an uploaded document.',
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const uploadedById = req.user.id ?? req.user.sub;
      const hostBase = `${req.protocol}://${req.get('host')}`;

      let committed;
      try {
        committed = await commitUploadedFile({
          prefix: 'quiz-papers',
          filename: file.filename,
          localPath: file.path,
          contentType: file.mimetype,
          hostBase,
        });
      } catch (err) {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
        console.error('quiz paper storage commit failed', err);
        return res.status(500).json({ message: 'Failed to store quiz file' });
      }

      const existing = await prisma.quizPaperFile.findUnique({
        where: { quizId: quiz.id },
      });
      if (existing?.url) {
        try {
          const key = existing.url.split('/uploads/')[1];
          if (key) await deleteStoredObject(key);
        } catch { /* ignore */ }
      }

      const paperFile = await prisma.quizPaperFile.upsert({
        where: { quizId: quiz.id },
        create: {
          quizId: quiz.id,
          name: file.originalname,
          url: committed.url,
          size: file.size,
          mimeType: file.mimetype,
          uploadedById,
        },
        update: {
          name: file.originalname,
          url: committed.url,
          size: file.size,
          mimeType: file.mimetype,
          uploadedById,
        },
      });

      res.status(existing ? 200 : 201).json(paperFile);
    }),
  );

  router.delete(
    '/:quizId/paper-file',
    requireQuizManage(),
    asyncHandler(async (req, res) => {
      const quiz = req.quiz;
      const existing = await prisma.quizPaperFile.findUnique({
        where: { quizId: quiz.id },
      });
      if (!existing) {
        return res.status(404).json({ message: 'No quiz file on this quiz' });
      }
      try {
        const key = existing.url.split('/uploads/')[1];
        if (key) await deleteStoredObject(key);
      } catch { /* ignore */ }
      await prisma.quizPaperFile.delete({ where: { quizId: quiz.id } });
      res.json({ success: true });
    }),
  );
}
