import { Router } from 'express';
import {
  requireCourseOfferingRead,
  requireChatMessageRead,
} from '../../../middleware/courseOfferingRbac.js';
import { uploadRateLimit } from '../../../middleware/perUserRateLimit.js';
import { upload } from '../../../controllers/courses/chat/helpers.js';
import {
  getChatRoomMessages,
  createMessage,
  editMessage,
  deleteMessage,
} from '../../../controllers/courses/chat/messages.handler.js';
import { uploadAttachments } from '../../../controllers/courses/chat/attachments.handler.js';

const router = Router();

router.get('/:courseOfferingId', requireCourseOfferingRead(), getChatRoomMessages);
router.post('/:courseOfferingId/messages', requireCourseOfferingRead(), createMessage);
router.patch('/messages/:messageId', requireChatMessageRead(), editMessage);
router.delete('/messages/:messageId', requireChatMessageRead(), deleteMessage);

router.post(
  '/messages/:messageId/attachments',
  uploadRateLimit,
  requireChatMessageRead(),
  upload.array('files', 5),
  uploadAttachments
);

export default router;
