import { Router, type IRouter } from "express";
import { db, organizerRequestsTable, usersTable } from "@workspace/db";
import { eq, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/organizer-requests", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { status } = req.query as Record<string, string>;
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(organizerRequestsTable.status, status as any));
  // Players see only their own requests
  if (req.user!.role === "player") {
    conditions.push(eq(organizerRequestsTable.userId, req.user!.id));
  }

  const requests = await db
    .select({
      id: organizerRequestsTable.id,
      userId: organizerRequestsTable.userId,
      status: organizerRequestsTable.status,
      message: organizerRequestsTable.message,
      adminNote: organizerRequestsTable.adminNote,
      createdAt: organizerRequestsTable.createdAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(organizerRequestsTable)
    .innerJoin(usersTable, eq(organizerRequestsTable.userId, usersTable.id))
    .where(conditions.length ? conditions[0] : undefined)
    .orderBy(organizerRequestsTable.createdAt);

  res.json(requests.map((r) => ({ ...r, adminNote: r.adminNote ?? null })));
});

router.post("/organizer-requests", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { message } = req.body;
  if (!message || message.length < 10) {
    res.status(400).json({ error: "Message must be at least 10 characters" });
    return;
  }

  const [request] = await db
    .insert(organizerRequestsTable)
    .values({ userId: req.user!.id, message })
    .returning();

  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.user!.id));
  res.status(201).json({ ...request, adminNote: null, userName: user?.name ?? null, userEmail: user?.email ?? null });
});

router.get("/organizer-requests/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [request] = await db
    .select({
      id: organizerRequestsTable.id,
      userId: organizerRequestsTable.userId,
      status: organizerRequestsTable.status,
      message: organizerRequestsTable.message,
      adminNote: organizerRequestsTable.adminNote,
      createdAt: organizerRequestsTable.createdAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(organizerRequestsTable)
    .innerJoin(usersTable, eq(organizerRequestsTable.userId, usersTable.id))
    .where(eq(organizerRequestsTable.id, id));

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  res.json({ ...request, adminNote: request.adminNote ?? null });
});

router.patch("/organizer-requests/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status, adminNote } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    return;
  }

  const [updated] = await db
    .update(organizerRequestsTable)
    .set({ status, adminNote: adminNote ?? null })
    .where(eq(organizerRequestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  // Promote user to organizer if approved
  if (status === "approved") {
    await db.update(usersTable).set({ role: "organizer" }).where(eq(usersTable.id, updated.userId));
  }

  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, updated.userId));
  res.json({ ...updated, adminNote: updated.adminNote ?? null, userName: user?.name ?? null, userEmail: user?.email ?? null });
});

export default router;
