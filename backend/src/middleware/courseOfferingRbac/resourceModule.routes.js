import {
  fetchOfferingWithScope,
  canAccessOfferingRead,
  canManageOfferingContent,
} from "../../utils/courseOfferingAccess.js";

async function loadResourceById(req) {
  const { prisma } = await import("../../db/prisma.js");
  const id = parseInt(req.params.resourceId, 10);
  if (!Number.isInteger(id)) return null;
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { id: true, courseOfferingId: true },
  });
  if (!resource?.courseOfferingId) return null;
  const offering = await fetchOfferingWithScope(resource.courseOfferingId);
  if (!offering) return null;
  req.resourceRecord = resource;
  req.courseOffering = offering;
  return { resource, offering };
}

async function loadModuleById(req) {
  const { prisma } = await import("../../db/prisma.js");
  const id = parseInt(req.params.moduleId, 10);
  if (!Number.isInteger(id)) return null;
  const courseModule = await prisma.courseModule.findUnique({
    where: { id },
    select: { id: true, courseOfferingId: true },
  });
  if (!courseModule?.courseOfferingId) return null;
  const offering = await fetchOfferingWithScope(courseModule.courseOfferingId);
  if (!offering) return null;
  req.courseModuleRecord = courseModule;
  req.courseOffering = offering;
  return { courseModule, offering };
}

export function requireResourceManage() {
  return async (req, res, next) => {
    const loaded = await loadResourceById(req);
    if (!loaded) return res.status(404).json({ message: "Resource not found" });
    if (!(await canManageOfferingContent(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export function requireResourceRead() {
  return async (req, res, next) => {
    const loaded = await loadResourceById(req);
    if (!loaded) return res.status(404).json({ message: "Resource not found" });
    if (!(await canAccessOfferingRead(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export function requireModuleManage() {
  return async (req, res, next) => {
    const loaded = await loadModuleById(req);
    if (!loaded) return res.status(404).json({ message: "Module not found" });
    if (!(await canManageOfferingContent(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export function requireResourceReorderManage() {
  return async (req, res, next) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return next();
    const { prisma } = await import("../../db/prisma.js");
    const firstId = Number(items[0]?.id);
    if (!Number.isInteger(firstId)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const first = await prisma.resource.findUnique({
      where: { id: firstId },
      select: { courseOfferingId: true },
    });
    if (!first?.courseOfferingId) return res.status(404).json({ message: "Resource not found" });
    const offering = await fetchOfferingWithScope(first.courseOfferingId);
    if (!offering || !(await canManageOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.courseOffering = offering;
    next();
  };
}

export function requireModuleReorderManage() {
  return async (req, res, next) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return next();
    const { prisma } = await import("../../db/prisma.js");
    const firstId = Number(items[0]?.id);
    if (!Number.isInteger(firstId)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const first = await prisma.courseModule.findUnique({
      where: { id: firstId },
      select: { courseOfferingId: true },
    });
    if (!first?.courseOfferingId) return res.status(404).json({ message: "Module not found" });
    const offering = await fetchOfferingWithScope(first.courseOfferingId);
    if (!offering || !(await canManageOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.courseOffering = offering;
    next();
  };
}
