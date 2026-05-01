import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

router.get('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  
  const room = await prisma.chatRoom.findFirst({
    where: { courseOfferingId: parseInt(courseOfferingId) },
    include: {
      messages: {
        include: {
          sender: { select: { id: true, full_name: true } },
        },
        orderBy: { created_at: 'asc' },
        take: 100,
      },
    },
  });

  if (!room) {
    const newRoom = await prisma.chatRoom.create({
      data: {
        name: `Course Chat`,
        courseOfferingId: parseInt(courseOfferingId),
      },
      include: {
        messages: {
          include: {
            sender: { select: { id: true, full_name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });
    return res.json(newRoom);
  }

  res.json(room);
}));

router.post('/:courseOfferingId/messages', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { content } = req.body;
  const senderId = req.user.id;

  let room = await prisma.chatRoom.findFirst({
    where: { courseOfferingId: parseInt(courseOfferingId) },
  });

  if (!room) {
    room = await prisma.chatRoom.create({
      data: {
        name: `Course Chat`,
        courseOfferingId: parseInt(courseOfferingId),
      },
    });
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId: room.id,
      senderId,
      content,
    },
    include: {
      sender: { select: { id: true, full_name: true } },
    },
  });

  res.json(message);
}));

export default router;