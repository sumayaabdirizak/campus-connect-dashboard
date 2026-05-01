import { app } from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { assertEnv, env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import jwt from "jsonwebtoken";
import { setIo } from "./socket/hub.js";
import { loadUserAnnouncementScope } from "./utils/userAnnouncementScope.js";

assertEnv();

const port = Number(env.PORT);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
setIo(io);

function readCookieFromHeader(cookieHeader, key) {
  if (!cookieHeader) return null;
  const chunks = cookieHeader.split(";").map((entry) => entry.trim());
  for (const chunk of chunks) {
    const [name, ...rest] = chunk.split("=");
    if (name === key) return decodeURIComponent(rest.join("="));
  }
  return null;
}

io.use(async (socket, next) => {
  try {
    const headerAuth = socket.handshake.headers.authorization || "";
    const bearerToken = headerAuth.startsWith("Bearer ") ? headerAuth.slice(7) : null;
    const authToken = socket.handshake.auth?.token || null;
    const cookieToken = readCookieFromHeader(socket.handshake.headers.cookie, "auth_token");
    const token = bearerToken || authToken || cookieToken;
    if (!token) return next(new Error("Unauthorized"));

    const payload = jwt.verify(token, env.JWT_SECRET);
    const scope = await loadUserAnnouncementScope(prisma, Number(payload.sub));
    if (!scope) return next(new Error("Unauthorized"));

    socket.data.user = {
      id: scope.userId,
      role: scope.role,
      facultyIds: scope.facultyIds,
      departmentIds: scope.departmentIds,
      batchIds: scope.batchIds,
      sectionIds: scope.sectionIds,
    };
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
});

function handleConnection(client) {
  const user = client.data.user;
  client.join("global");

  const joinRoom = (prefix, value) => {
    if (value === undefined || value === null || !Number.isFinite(Number(value))) return;
    client.join(`${prefix}:${Number(value)}`);
  };

  for (const facultyId of user.facultyIds ?? []) joinRoom("faculty", facultyId);
  for (const departmentId of user.departmentIds ?? []) joinRoom("department", departmentId);
  for (const batchId of user.batchIds ?? []) joinRoom("batch", batchId);
  for (const sectionId of user.sectionIds ?? []) joinRoom("section", sectionId);
}

io.on("connection", (socket) => {
  const socketUser = socket.data.user;
  handleConnection(socket);

  console.log(
    `Socket connected: id=${socket.id} userId=${socketUser.id} role=${socketUser.role}`
  );

  socket.on("join_room", (courseOfferingId) => {
    socket.join(`course_${courseOfferingId}`);
    console.log(`Socket ${socket.id} joined course_${courseOfferingId}`);
  });

  socket.on("leave_room", (courseOfferingId) => {
    socket.leave(`course_${courseOfferingId}`);
  });

  socket.on("send_message", async (data) => {
    const { courseOfferingId, content, senderId } = data;

    try {
      let room = await prisma.chatRoom.findFirst({
        where: { courseOfferingId: parseInt(courseOfferingId) },
      });

      if (!room) {
        room = await prisma.chatRoom.create({
          data: {
            name: "Course Chat",
            courseOfferingId: parseInt(courseOfferingId),
          },
        });
      }

      const message = await prisma.chatMessage.create({
        data: {
          roomId: room.id,
          senderId: parseInt(senderId),
          content,
        },
        include: {
          sender: { select: { id: true, full_name: true } },
        },
      });

      io.to(`course_${courseOfferingId}`).emit("new_message", message);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(
      `Socket disconnected: id=${socket.id} userId=${socketUser.id} role=${socketUser.role}`
    );
  });
});

httpServer.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  console.log(`Socket.IO running on http://localhost:${port}`);
});

export { io, prisma };