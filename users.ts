import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { role, status, search } = req.query as Record<string, string>;
  const conditions: SQL[] = [];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (status) conditions.push(eq(usersTable.status, status as any));
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));

  const users = await db
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
    .from(usersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(usersTable.createdAt);

  res.json(users);
});

router.get("/users/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  // Non-admins can only see their own profile
  if (req.user!.role !== "admin" && req.user!.id !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [user] = await db
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
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.patch("/users/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  // Only admin can change role/status; users can update their own name/avatar/theme
  if (req.user!.role !== "admin" && req.user!.id !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { name, email, role, status, avatar, theme } = req.body;
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (avatar !== undefined) updates.avatar = avatar;
  if (theme !== undefined) updates.theme = theme;
  if (req.user!.role === "admin") {
    if (role) updates.role = role;
    if (status) updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates as any)
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      status: usersTable.status,
      avatar: usersTable.avatar,
      theme: usersTable.theme,
      createdAt: usersTable.createdAt,
    });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(updated);
});

router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
