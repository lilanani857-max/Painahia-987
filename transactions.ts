import { Router, type IRouter } from "express";
import { db, transactionsTable, usersTable, gamesTable } from "@workspace/db";
import { eq, and, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/transactions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { userId, gameId, type } = req.query as Record<string, string>;
  const conditions: SQL[] = [];

  if (req.user!.role !== "admin") {
    conditions.push(eq(transactionsTable.userId, req.user!.id));
  } else if (userId) {
    conditions.push(eq(transactionsTable.userId, parseInt(userId, 10)));
  }
  if (gameId) conditions.push(eq(transactionsTable.gameId, parseInt(gameId, 10)));
  if (type) conditions.push(eq(transactionsTable.type, type as any));

  const txns = await db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      gameId: transactionsTable.gameId,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      status: transactionsTable.status,
      createdAt: transactionsTable.createdAt,
      userName: usersTable.name,
    })
    .from(transactionsTable)
    .innerJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(transactionsTable.createdAt);

  res.json(txns.map((t) => ({ ...t, amount: Number(t.amount), gameName: null })));
});

router.post("/transactions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { gameId, type, amount } = req.body;
  if (!type || amount == null) {
    res.status(400).json({ error: "type and amount are required" });
    return;
  }

  const [txn] = await db
    .insert(transactionsTable)
    .values({
      userId: req.user!.id,
      gameId: gameId ?? null,
      type,
      amount: String(amount),
      status: "completed",
    })
    .returning();

  res.status(201).json({ ...txn, amount: Number(txn.amount), userName: req.user!.name, gameName: null });
});

export default router;
