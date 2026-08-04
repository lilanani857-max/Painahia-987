/**
 * Seed script: creates demo users and a sample game for PA'INA 987
 * Run with: pnpm --filter @workspace/scripts run seed
 */
import { db, usersTable, gamesTable, gamePlayersTable, cardsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding PA'INA 987 demo data...");

  // --- Admin ---
  const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@paina987.pf"));
  if (!existingAdmin) {
    const hash = await bcrypt.hash("Admin1234!", 12);
    await db.insert(usersTable).values({
      name: "Administrateur",
      email: "admin@paina987.pf",
      passwordHash: hash,
      role: "admin",
      status: "active",
    });
    console.log("  Created admin: admin@paina987.pf / Admin1234!");
  }

  // --- Organizer ---
  const [existingOrg] = await db.select().from(usersTable).where(eq(usersTable.email, "orga@paina987.pf"));
  let organizer = existingOrg;
  if (!existingOrg) {
    const hash = await bcrypt.hash("Orga1234!", 12);
    const [org] = await db.insert(usersTable).values({
      name: "Maeva Tetuanui",
      email: "orga@paina987.pf",
      passwordHash: hash,
      role: "organizer",
      status: "active",
    }).returning();
    organizer = org;
    console.log("  Created organizer: orga@paina987.pf / Orga1234!");
  }

  // --- Players ---
  const players = [
    { name: "Hina Paraita", email: "hina@paina987.pf" },
    { name: "Teiki Tefaafana", email: "teiki@paina987.pf" },
    { name: "Nona Hitihiti", email: "nona@paina987.pf" },
  ];
  const playerIds: number[] = [];
  for (const p of players) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, p.email));
    if (!existing) {
      const hash = await bcrypt.hash("Player1234!", 12);
      const [player] = await db.insert(usersTable).values({
        name: p.name,
        email: p.email,
        passwordHash: hash,
        role: "player",
        status: "active",
      }).returning();
      playerIds.push(player.id);
      console.log(`  Created player: ${p.email} / Player1234!`);
    } else {
      playerIds.push(existing.id);
    }
  }

  // --- Demo Game ---
  if (organizer) {
    const [existingGame] = await db.select().from(gamesTable).where(eq(gamesTable.name, "Soirée Bingo Lagon 🌊"));
    if (!existingGame) {
      const [game] = await db.insert(gamesTable).values({
        organizerId: organizer.id,
        name: "Soirée Bingo Lagon 🌊",
        status: "pending",
        cardPrice: "500",
        maxCards: 50,
        maxWinners: 3,
        gameType: "classic",
      }).returning();
      console.log("  Created demo game:", game.name);

      // Add players to game
      for (const uid of playerIds) {
        await db.insert(gamePlayersTable).values({ gameId: game.id, userId: uid }).onConflictDoNothing();
      }
      console.log("  Added players to game");
    }
  }

  console.log("\nSeed complete!");
  console.log("\nDemo accounts:");
  console.log("  Admin:      admin@paina987.pf / Admin1234!");
  console.log("  Organizer:  orga@paina987.pf  / Orga1234!");
  console.log("  Player:     hina@paina987.pf  / Player1234!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
