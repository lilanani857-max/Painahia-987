import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  gamesTable,
  transactionsTable,
  cardsTable,
  winnersTable,
  organizerRequestsTable,
} from "@workspace/db";
import { eq, count, sum, and } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/admin/dashboard", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const [{ totalOrganizers }] = await db
    .select({ totalOrganizers: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "organizer"));

  const [{ totalPlayers }] = await db
    .select({ totalPlayers: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "player"));

  const [{ activeGames }] = await db
    .select({ activeGames: count() })
    .from(gamesTable)
    .where(eq(gamesTable.status, "active"));

  const [{ totalGamesAllTime }] = await db
    .select({ totalGamesAllTime: count() })
    .from(gamesTable);

  const [revenueRow] = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "card_purchase"));

  const [{ pendingRequests }] = await db
    .select({ pendingRequests: count() })
    .from(organizerRequestsTable)
    .where(eq(organizerRequestsTable.status, "pending"));

  res.json({
    totalOrganizers: Number(totalOrganizers),
    totalPlayers: Number(totalPlayers),
    activeGames: Number(activeGames),
    totalGamesAllTime: Number(totalGamesAllTime),
    totalRevenue: Number(revenueRow?.total ?? 0),
    pendingRequests: Number(pendingRequests),
    revenueThisMonth: Number(revenueRow?.total ?? 0),
    newUsersThisWeek: 0,
  });
});

router.get("/admin/revenue-chart", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      revenue: Math.floor(Math.random() * 50000) + 10000,
      games: Math.floor(Math.random() * 20) + 5,
      players: Math.floor(Math.random() * 200) + 50,
      cards: Math.floor(Math.random() * 400) + 100,
    });
  }
  res.json(months);
});

router.get("/admin/top-stats", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const organizers = await db
    .select({ userId: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
    .from(usersTable)
    .where(eq(usersTable.role, "organizer"))
    .limit(5);

  const players = await db
    .select({ userId: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
    .from(usersTable)
    .where(eq(usersTable.role, "player"))
    .limit(5);

  res.json({
    topOrganizers: organizers.map((o) => ({
      userId: o.userId,
      name: o.name,
      avatar: o.avatar ?? null,
      totalGames: Math.floor(Math.random() * 50) + 1,
      totalRevenue: Math.floor(Math.random() * 100000),
      totalPlayers: Math.floor(Math.random() * 500) + 10,
    })),
    topWinners: players.map((w) => ({
      userId: w.userId,
      name: w.name,
      avatar: w.avatar ?? null,
      totalWins: Math.floor(Math.random() * 20) + 1,
      totalPrize: Math.floor(Math.random() * 50000),
    })),
  });
});

router.get("/organizer/dashboard", requireAuth, requireRole("organizer", "admin"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const myGames = await db.select().from(gamesTable).where(eq(gamesTable.organizerId, req.user!.id));
  const activeGame = myGames.find((g) => g.status === "active");

  const [earningsRow] = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, req.user!.id), eq(transactionsTable.type, "commission")));

  res.json({
    todayGames: myGames.filter((g) => g.createdAt >= today).length,
    totalPlayers: 0,
    totalEarnings: Number(earningsRow?.total ?? 0),
    activeGame: activeGame?.id ?? null,
    recentGames: myGames.slice(-5).map((g) => ({
      ...g,
      cardPrice: Number(g.cardPrice),
      totalRevenue: null,
      playerCount: 0,
      drawnCount: 0,
      organizerName: null,
    })),
    earningsThisMonth: Number(earningsRow?.total ?? 0),
    totalGamesAllTime: myGames.length,
  });
});

router.get("/player/dashboard", requireAuth, requireRole("player"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const myCards = await db.select().from(cardsTable).where(eq(cardsTable.userId, req.user!.id));
  const myWins = await db
    .select({ prize: winnersTable.prize })
    .from(winnersTable)
    .where(eq(winnersTable.userId, req.user!.id));
  const totalWinnings = myWins.reduce((acc, w) => acc + Number(w.prize ?? 0), 0);

  const activeGames = await db.select().from(gamesTable).where(eq(gamesTable.status, "active"));

  res.json({
    activeGames: activeGames.length,
    totalCards: myCards.length,
    totalWinnings,
    totalWins: myWins.length,
    recentGames: activeGames.slice(0, 5).map((g) => ({
      ...g,
      cardPrice: Number(g.cardPrice),
      totalRevenue: null,
      playerCount: 0,
      drawnCount: 0,
      organizerName: null,
    })),
    myCards: myCards.slice(0, 6).map((c) => ({
      ...c,
      price: c.price ? Number(c.price) : null,
      userName: null,
    })),
  });
});

export default router;
