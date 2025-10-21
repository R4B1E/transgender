import type { gameType } from "../controllers/gameController"
import type { roomType } from "../controllers/roomController"
import type { playerType } from "../controllers/playerController";
import type { PrismaClient } from "../../generated/prisma"

declare module 'fastify' {
  interface FastifyInstance {
    game: gameType,
    room: roomType,
    player: playerType,
    prisma: PrismaClient,
    config: { // this should be the same as the confKey in options
      // specify your typing here
      PORT: number,
      NODE_ENV: string,
      REALTIME_PORT: number
    };
  }
}