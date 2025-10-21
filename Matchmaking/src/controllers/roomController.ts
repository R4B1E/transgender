const roomController = async (prisma: PrismaClient): Promise<roomType> => {
  return {
    create: async (opts: CreateBody) => {

      const gameId = opts.gameId
      const roomId = opts.matchId

      const result = await prisma.$transaction(async (tx) => {

        // Create the Room (linked to Game)
        const room = await tx.room.create({
          data: {
            id: roomId,
            gameId: gameId,
            round: opts.round
          }
        })

        const playerIds = opts.players.map(p => (p.id));

        // Insert missing Player rows
        const existingPlayers = await tx.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true }
        })
        const existingPlayerIdSet = new Set(existingPlayers.map(p => p.id))
        const playersToCreate = opts.players
          .filter(p => !existingPlayerIdSet.has(p.id))
          .map(p => ({ id: p.id }))

        if (playersToCreate.length > 0) {
          await tx.player.createMany({
            data: playersToCreate
          })
        }

        const existingPlayerOnRoom = await tx.playerOnRoom.findMany({
          where: {
            roomId,
            playerId: { in: playerIds }
          },
          select: { playerId: true }
        })
        const existingPlayerOnRoomSet = new Set(existingPlayerOnRoom.map(r => r.playerId))
        const playerOnRoomToCreate = playerIds
          .filter(pid => !existingPlayerOnRoomSet.has(pid))
          .map(pid => ({ playerId: pid, roomId }))

        if (playerOnRoomToCreate.length > 0) {
          await tx.playerOnRoom.createMany({
            data: playerOnRoomToCreate
          })
        }

        // Insert missing PlayerOnGame join rows
        const existingPlayerOnGame = await tx.playerOnGame.findMany({
          where: {
            gameId,
            playerId: { in: playerIds }
          },
          select: { playerId: true }
        })
        const existingPlayerOnGameSet = new Set(existingPlayerOnGame.map(r => r.playerId))
        const playerOnGameToCreate = playerIds
          .filter(pid => !existingPlayerOnGameSet.has(pid))
          .map(pid => ({ playerId: pid, gameId }))

        if (playerOnGameToCreate.length > 0) {
          await tx.playerOnGame.createMany({
            data: playerOnGameToCreate
          })
        }

        return room;
      })
      return result;
    },

    update: async (id: string, body: UpdateBody) => {
      const { duration, gameWinner } = body;

      console.log(`game winner ${gameWinner}`);
      const data: Prisma.RoomUpdateInput = { duration, Winner: gameWinner };

      const updatedRoom = await prisma.room.update({
        where: { id },
        data,
      });

      return updatedRoom;
    },

    delete: async (id: string) => {
      const deleted = await prisma.room.delete({ where: { id } });
      return deleted;
    },
  };
};

export default roomController;

import type {
  PrismaClient,
  Room,
  Prisma
} from "../../generated/prisma";

type CreateBody =
  { players: Prisma.PlayerCreateManyInput[]; gameId: string, matchId: string, round: number };

type UpdateBody = { duration?: number; gameWinner: string };

export type roomType = {
  create(body: CreateBody): Promise<Room>;
  update(matchId: string, body: UpdateBody): Promise<Room>;
  delete(id: string): Promise<Room>;
};