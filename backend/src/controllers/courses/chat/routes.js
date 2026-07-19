import { Router } from 'express';
import {
  requireCourseOfferingRead,
  requireChatMessageRead,
} from '../../../middleware/courseOfferingRbac.js';
import { uploadRateLimit } from '../../../middleware/perUserRateLimit.js';
import { upload } from './helpers.js';
import {
  getChatRoomMessages,
  createMessage,
  editMessage,
  deleteMessage,
} from './messages.handler.js';
import { uploadAttachments } from './attachments.handler.js';

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
