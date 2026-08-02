import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { prisma } from '../../../db/prisma.js';
import { uploadExtensionFilter } from '../resources.js';

export const MESSAGE_PAGE_SIZE = 50;
export const CHAT_UPLOAD_DIR = './uploads/chat';
export const CHAT_FILE_LIMIT = 50 * 1024 * 1024; // 50 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(CHAT_UPLOAD_DIR)) fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
    cb(null, CHAT_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: CHAT_FILE_LIMIT },
  fileFilter: uploadExtensionFilter,
});

export const senderSelect = { select: { id: true, full_name: true } };
export const replySelect = {
  select: {
    id: true,
    content: true,
    senderId: true,
    sender: senderSelect,
  },
};
export const messageInclude = {
  sender: senderSelect,
  replyTo: replySelect,
  attachments: true,
  mentions: { select: { userId: true } },
};

export async function ensureRoom(courseOfferingId) {
  const existing = await prisma.chatRoom.findFirst({
    where: { courseOfferingId },
  });
  if (existing) return existing;
  return prisma.chatRoom.create({
    data: { name: 'Course Chat', courseOfferingId },
  });
}

export async function resolveMentions(content, courseOfferingId, senderId) {
  const matches = Array.from(content.matchAll(/@([a-z0-9][\w.\-]{0,40})/gi)).map((m) =>
    m[1].toLowerCase()
  );
  if (matches.length === 0) return [];
  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      section: {
        include: {
          studentRegistrations: { include: { student: { select: { id: true, full_name: true } } } },
        },
      },
      teacher: { select: { id: true, full_name: true } },
    },
  });
  if (!offering) return [];
  const candidates = [
    ...(offering.section?.studentRegistrations.map((r) => r.student) ?? []),
    ...(offering.teacher ? [offering.teacher] : []),
  ];
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  const found = new Set();
  for (const token of matches) {
    const hit = candidates.find((u) => slug(u.full_name) === token);
    if (hit && hit.id !== senderId) found.add(hit.id);
  }
  return Array.from(found);
}
