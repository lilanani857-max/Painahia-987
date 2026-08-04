import { Router, type IRouter } from "express";
import { db, cardsTable, usersTable, gamesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth";
import { generateBingoGrid } from "../lib/bingo";

const router: IRouter = Router();

router.get("/games/:id/cards", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const gameId = parseInt(raw, 10);

  let cards;
  if (req.user!.role === "player") {
    // Players see only their cards
    cards = await db
      .select({
        id: cardsTable.id, gameId: cardsTable.gameId, userId: cardsTable.userId,
        grid: cardsTable.grid, markedNumbers: cardsTable.markedNumbers,
        qrCode: cardsTable.qrCode, price: cardsTable.price, createdAt: cardsTable.createdAt,
        userName: usersTable.name,
      })
      .from(cardsTable)
      .innerJoin(usersTable, eq(cardsTable.userId, usersTable.id))
      .where(and(eq(cardsTable.gameId, gameId), eq(cardsTable.userId, req.user!.id)));
  } else {
    cards = await db
      .select({
        id: cardsTable.id, gameId: cardsTable.gameId, userId: cardsTable.userId,
        grid: cardsTable.grid, markedNumbers: cardsTable.markedNumbers,
        qrCode: cardsTable.qrCode, price: cardsTable.price, createdAt: cardsTable.createdAt,
        userName: usersTable.name,
      })
      .from(cardsTable)
      .innerJoin(usersTable, eq(cardsTable.userId, usersTable.id))
      .where(eq(cardsTable.gameId, gameId));
  }

  res.json(cards.map((c) => ({ ...c, price: c.price ? Number(c.price) : null })));
});

router.post("/games/:id/cards", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const gameId = parseInt(raw, 10);
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const grid = generateBingoGrid();
  const [card] = await db
    .insert(cardsTable)
    .values({ gameId, userId, grid, markedNumbers: [], price: game.cardPrice })
    .returning();

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...card, price: card.price ? Number(card.price) : null, userName: user?.name ?? null });
});

router.get("/cards/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [card] = await db
    .select({
      id: cardsTable.id, gameId: cardsTable.gameId, userId: cardsTable.userId,
      grid: cardsTable.grid, markedNumbers: cardsTable.markedNumbers,
      qrCode: cardsTable.qrCode, price: cardsTable.price, createdAt: cardsTable.createdAt,
      userName: usersTable.name,
    })
    .from(cardsTable)
    .innerJoin(usersTable, eq(cardsTable.userId, usersTable.id))
    .where(eq(cardsTable.id, id));

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  if (req.user!.role === "player" && card.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json({ ...card, price: card.price ? Number(card.price) : null });
});

router.patch("/cards/:id/mark", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { markedNumbers } = req.body;

  if (!Array.isArray(markedNumbers)) {
    res.status(400).json({ error: "markedNumbers must be an array" });
    return;
  }

  const [card] = await db.select().from(cardsTable).where(eq(cardsTable.id, id));
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  if (req.user!.role === "player" && card.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [updated] = await db
    .update(cardsTable)
    .set({ markedNumbers })
    .where(eq(cardsTable.id, id))
    .returning();

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.userId));
  res.json({ ...updated, price: updated.price ? Number(updated.price) : null, userName: user?.name ?? null });
});

export default router;
