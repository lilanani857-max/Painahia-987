import { Router, type IRouter } from "express";
import { db, chatMessagesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth";
import type { Server as SocketServer } from "socket.io";

let io: SocketServer | undefined;
export function setIo(socketIo: SocketServer) {
  io = socketIo;
}

const router: IRouter = Router();

router.get("/games/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const gameId = parseInt(raw, 10);

  const messages = await db
    .select({
      id: chatMessagesTable.id,
      gameId: chatMessagesTable.gameId,
      userId: chatMessagesTable.userId,
      message: chatMessagesTable.message,
      createdAt: chatMessagesTable.createdAt,
      userName: usersTable.name,
      userAvatar: usersTable.avatar,
    })
    .from(chatMessagesTable)
    .innerJoin(usersTable, eq(chatMessagesTable.userId, usersTable.id))
    .where(eq(chatMessagesTable.gameId, gameId))
    .orderBy(chatMessagesTable.createdAt);

  res.json(messages.map((m) => ({ ...m, userAvatar: m.userAvatar ?? null })));
});

router.post("/games/:id/messages", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const gameId = parseInt(raw, 10);
  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }

  const [saved] = await db
    .insert(chatMessagesTable)
    .values({ gameId, userId: req.user!.id, message: message.trim() })
    .returning();

  const [user] = await db.select({ name: usersTable.name, avatar: usersTable.avatar }).from(usersTable).where(eq(usersTable.id, req.user!.id));
  const full = {
    ...saved,
    userName: user?.name ?? "Anonymous",
    userAvatar: user?.avatar ?? null,
  };

  io?.to(`game:${gameId}`).emit("chat:message", full);
  res.status(201).json(full);
});

export default router;
