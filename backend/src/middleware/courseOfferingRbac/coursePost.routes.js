import { canAccessOfferingRead } from "../../utils/courseOfferingAccess.js";

async function loadCoursePostBySomeId(req) {
  const { prisma } = await import("../../db/prisma.js");
  let postId = null;
  if (req.params.postId) {
    postId = parseInt(req.params.postId, 10);
  } else if (req.params.replyId) {
    const reply = await prisma.coursePostReply.findUnique({
      where: { id: parseInt(req.params.replyId, 10) },
      select: { postId: true },
    });
    postId = reply?.postId ?? null;
  } else if (req.params.attachmentId) {
    const att = await prisma.coursePostAttachment.findUnique({
      where: { id: parseInt(req.params.attachmentId, 10) },
      select: { postId: true },
    });
    postId = att?.postId ?? null;
  }
  if (!Number.isInteger(postId)) return null;
  const post = await prisma.coursePost.findUnique({
    where: { id: postId },
    include: { courseOffering: { include: { course: { select: { id: true, code: true } } } } },
  });
  if (!post) return null;
  req.coursePost = post;
  req.courseOffering = post.courseOffering;
  return post;
}

export function requireCoursePostRead() {
  return async (req, res, next) => {
    const post = await loadCoursePostBySomeId(req);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!(await canAccessOfferingRead(req.user, post.courseOffering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
