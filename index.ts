import { Router, type IRouter } from "express";
import type { Server as SocketServer } from "socket.io";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import gamesRouter, { setIo as setGamesIo } from "./games";
import cardsRouter from "./cards";
import chatRouter, { setIo as setChatIo } from "./chat";
import organizerRequestsRouter from "./organizer_requests";
import transactionsRouter from "./transactions";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(gamesRouter);
router.use(cardsRouter);
router.use(chatRouter);
router.use(organizerRequestsRouter);
router.use(transactionsRouter);
router.use(statsRouter);

export function initSocketIo(io: SocketServer) {
  setGamesIo(io);
  setChatIo(io);
}

export default router;
