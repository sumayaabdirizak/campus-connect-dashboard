import { Router } from 'express';
import {
  requireCourseOfferingRead,
  requireCoursePostRead,
} from '../../../middleware/courseOfferingRbac.js';
import { uploadRateLimit } from '../../../middleware/perUserRateLimit.js';
import { upload } from '../../../controllers/courses/course-feed/helpers.js';
import { listPosts, createPost, editPost, deletePost } from '../../../controllers/courses/course-feed/posts.handler.js';
import { uploadAttachments, deleteAttachment } from '../../../controllers/courses/course-feed/attachments.handler.js';
import { toggleReaction } from '../../../controllers/courses/course-feed/reactions.handler.js';
import { createReply, editReply, deleteReply } from '../../../controllers/courses/course-feed/replies.handler.js';

const router = Router();

router.get('/:courseOfferingId', requireCourseOfferingRead(), listPosts);
router.post('/:courseOfferingId', requireCourseOfferingRead(), createPost);
router.patch('/post/:postId', requireCoursePostRead(), editPost);
router.delete('/post/:postId', requireCoursePostRead(), deletePost);

router.post(
  '/post/:postId/attachments',
  uploadRateLimit,
  requireCoursePostRead(),
  upload.array('files', 10),
  uploadAttachments
);
router.delete('/attachments/:attachmentId', requireCoursePostRead(), deleteAttachment);

router.post('/post/:postId/reactions', requireCoursePostRead(), toggleReaction);

router.post('/post/:postId/replies', requireCoursePostRead(), createReply);
router.patch('/replies/:replyId', requireCoursePostRead(), editReply);
router.delete('/replies/:replyId', requireCoursePostRead(), deleteReply);

export default router;
