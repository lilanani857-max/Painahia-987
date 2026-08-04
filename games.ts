import { Router, type IRouter } from "express";
import {
  db,
  gamesTable,
  usersTable,
  drawnNumbersTable,
  gamePlayersTable,
  winnersTable,
  cardsTable,
} from "@workspace/db";
import { eq, and, count, max, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth";
import { getColumn, validateBingo } from "../lib/bingo";
import type { Server as SocketServer } from "socket.io";

let io: SocketServer | undefined;
export function setIo(socketIo: SocketServer) {
  io = socketIo;
}

const router: IRouter = Router();

// Helper: enrich a game with counts
async function enrichGame(game: typeof gamesTable.$inferSelect) {
  const [playerCountResult] = await db
    .select({ c: count() })
    .from(gamePlayersTable)
    .where(eq(gamePlayersTable.gameId, game.id));
  const [drawnCountResult] = await db
    .select({ c: count() })
    .from(drawnNumbersTable)
    .where(eq(drawnNumbersTable.gameId, game.id));
  const [organizer] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, game.organizerId));

  return {
    ...game,
    cardPrice: Number(game.cardPrice),
    totalRevenue: null,
    playerCount: Number(playerCountResult.c),
    drawnCount: Number(drawnCountResult.c),
    organizerName: organizer?.name ?? null,
  };
}

router.get("/games", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { status, organizerId } = req.query as Record<string, string>;
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(gamesTable.status, status as any));
  if (organizerId) conditions.push(eq(gamesTable.organizerId, parseInt(organizerId, 10)));
  // Organizers can only see their own games (unless admin)
  if (req.user!.role === "organizer") {
    conditions.push(eq(gamesTable.organizerId, req.user!.id));
  }

  const games = await db
    .select()
    .from(gamesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(gamesTable.createdAt);

  const enriched = await Promise.all(games.map(enrichGame));
  res.json(enriched);
});

router.post("/games", requireAuth, requireRole("organizer", "admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const { name, cardPrice, maxCards, maxWinners, gameType, startTime } = req.body;
  if (!name || cardPrice == null || !maxCards || !maxWinners || !gameType) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [game] = await db
    .insert(gamesTable)
    .values({
      organizerId: req.user!.id,
      name,
      cardPrice: String(cardPrice),
      maxCards: parseInt(maxCards, 10),
      maxWinners: parseInt(maxWinners, 10),
      gameType,
      startTime: startTime ? new Date(startTime) : undefined,
    })
    .returning();

  const enriched = await enrichGame(game);
  res.status(201).json(enriched);
});

router.get("/games/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  const enriched = await enrichGame(game);
  res.json(enriched);
});

router.patch("/games/:id", requireAuth, requireRole("organizer", "admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  if (req.user!.role === "organizer" && game.organizerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { name, cardPrice, maxCards, maxWinners, gameType, status, startTime } = req.body;
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (cardPrice != null) updates.cardPrice = String(cardPrice);
  if (maxCards) updates.maxCards = parseInt(maxCards, 10);
  if (maxWinners) updates.maxWinners = parseInt(maxWinners, 10);
  if (gameType) updates.gameType = gameType;
  if (status) updates.status = status;
  if (startTime) updates.startTime = new Date(startTime);

  const [updated] = await db.update(gamesTable).set(updates as any).where(eq(gamesTable.id, id)).returning();
  const enriched = await enrichGame(updated);
  res.json(enriched);
});

router.delete("/games/:id", requireAuth, requireRole("organizer", "admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  if (req.user!.role === "organizer" && game.organizerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.update(gamesTable).set({ status: "cancelled" }).where(eq(gamesTable.id, id));
  res.sendStatus(204);
});

router.post("/games/:id/start", requireAuth, requireRole("organizer", "admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  if (req.user!.role === "organizer" && game.organizerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [updated] = await db
    .update(gamesTable)
    .set({ status: "active", startTime: new Date() })
    .where(eq(gamesTable.id, id))
    .returning();

  io?.to(`game:${id}`).emit("game:started", { gameId: id });
  const enriched = await enrichGame(updated);
  res.json(enriched);
});

router.post("/games/:id/draw", requireAuth, requireRole("organizer", "admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!game || game.status !== "active") {
    res.status(409).json({ error: "Game is not active" });
    return;
  }
  if (req.user!.role === "organizer" && game.organizerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const drawn = await db.select({ number: drawnNumbersTable.number }).from(drawnNumbersTable).where(eq(drawnNumbersTable.gameId, id));
  const drawnSet = new Set(drawn.map((d) => d.number));

  if (drawnSet.size >= 75) {
    res.status(409).json({ error: "All 75 numbers have been drawn" });
    return;
  }

  // Pick a random undrawn number
  const remaining = Array.from({ length: 75 }, (_, i) => i + 1).filter((n) => !drawnSet.has(n));
  const number = remaining[Math.floor(Math.random() * remaining.length)];
  const column = getColumn(number);
  const sequence = drawnSet.size + 1;

  const [drawnNum] = await db
    .insert(drawnNumbersTable)
    .values({ gameId: id, number, column, sequence })
    .returning();

  io?.to(`game:${id}`).emit("number:drawn", { gameId: id, number: drawnNum.number, column: drawnNum.column, sequence: drawnNum.sequence });

  res.json(drawnNum);
});

router.post("/games/:id/bingo", requireAuth, requireRole("player"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const gameId = parseInt(raw, 10);
  const { cardId } = req.body;
  if (!cardId) {
    res.status(400).json({ error: "cardId is required" });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
  if (!game || game.status !== "active") {
    res.status(400).json({ error: "Game is not active" });
    return;
  }

  const [card] = await db.select().from(cardsTable).where(and(eq(cardsTable.id, cardId), eq(cardsTable.userId, req.user!.id)));
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  // Get all drawn numbers
  const drawn = await db.select({ number: drawnNumbersTable.number }).from(drawnNumbersTable).where(eq(drawnNumbersTable.gameId, gameId));
  const drawnNums = drawn.map((d) => d.number);

  // Check existing winners
  const existingWinners = await db.select().from(winnersTable).where(eq(winnersTable.gameId, gameId));
  if (existingWinners.length >= game.maxWinners) {
    res.json({ valid: false, message: "Maximum winners already declared" });
    return;
  }

  const valid = validateBingo(card.grid as (number | null)[][], card.markedNumbers as number[], game.gameType);
  if (!valid) {
    res.json({ valid: false, message: "Pas encore Bingo !" });
    return;
  }

  const rank = existingWinners.length + 1;
  const [winner] = await db
    .insert(winnersTable)
    .values({ gameId, userId: req.user!.id, cardId, rank })
    .returning();

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.user!.id));
  io?.to(`game:${gameId}`).emit("bingo:declared", { gameId, userId: req.user!.id, userName: user?.name, rank });

  res.json({ valid: true, message: "BINGO ! Félicitations !", winner: { ...winner, userName: user?.name ?? null } });
});

router.post("/games/:id/close", requireAuth, requireRole("organizer", "admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [updated] = await db
    .update(gamesTable)
    .set({ status: "finished", endTime: new Date() })
    .where(eq(gamesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  io?.to(`game:${id}`).emit("game:closed", { gameId: id });
  const enriched = await enrichGame(updated);
  res.json(enriched);
});

router.get("/games/:id/drawn-numbers", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const nums = await db
    .select()
    .from(drawnNumbersTable)
    .where(eq(drawnNumbersTable.gameId, id))
    .orderBy(drawnNumbersTable.sequence);
  res.json(nums);
});

router.get("/games/:id/players", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const players = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      status: usersTable.status,
      avatar: usersTable.avatar,
      theme: usersTable.theme,
      createdAt: usersTable.createdAt,
    })
    .from(gamePlayersTable)
    .innerJoin(usersTable, eq(gamePlayersTable.userId, usersTable.id))
    .where(eq(gamePlayersTable.gameId, id));
  res.json(players);
});

router.post("/games/:id/players", requireAuth, requireRole("organizer", "admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const gameId = parseInt(raw, 10);
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  await db.insert(gamePlayersTable).values({ gameId, userId }).onConflictDoNothing();
  const [user] = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    role: usersTable.role, status: usersTable.status, avatar: usersTable.avatar,
    theme: usersTable.theme, createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, userId));
  res.json(user);
});

router.delete("/games/:id/players/:userId", requireAuth, requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const gameId = parseInt(raw, 10);
  const userId = parseInt(rawUserId, 10);
  await db.delete(gamePlayersTable).where(and(eq(gamePlayersTable.gameId, gameId), eq(gamePlayersTable.userId, userId)));
  res.sendStatus(204);
});

router.get("/games/:id/winners", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const winners = await db
    .select({
      id: winnersTable.id,
      gameId: winnersTable.gameId,
      userId: winnersTable.userId,
      cardId: winnersTable.cardId,
      rank: winnersTable.rank,
      prize: winnersTable.prize,
      declaredAt: winnersTable.declaredAt,
      userName: usersTable.name,
    })
    .from(winnersTable)
    .innerJoin(usersTable, eq(winnersTable.userId, usersTable.id))
    .where(eq(winnersTable.gameId, id))
    .orderBy(winnersTable.rank);
  res.json(winners.map((w) => ({ ...w, prize: w.prize ? Number(w.prize) : null })));
});

export default router;
