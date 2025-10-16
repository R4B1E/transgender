const roomController = async (prisma: PrismaClient): Promise<roomType> => {
  return {
    create: async (body: CreateBody) => {
      const { gameId } = body;

      const data: Prisma.RoomCreateInput = {
        game: { connect: { id: gameId } } as Prisma.GameCreateNestedOneWithoutRoomsInput,
      };

      if ("players" in body && Array.isArray(body.players) && body.players.length > 0) {
          data.players = {
            create: body.players as Prisma.PlayerCreateInput[],
          } as Prisma.PlayerCreateNestedManyWithoutRoomInput;
          data.Host = body.Host;
      }

      const createdRoom = await prisma.room.create({ data });
      return createdRoom;
    },

    update: async (id: number, body: UpdateBody) => {
      const { time, gameWinner } = body;

      const data: Prisma.RoomUpdateInput = {};
      if (time !== undefined) data.endedAt = time as Date | null;

      if (gameWinner !== undefined) {
        // data.Winner = gameWinner as number | null; 
      }

      const updatedRoom = await prisma.room.update({
        where: { id },
        data,
      });

      return updatedRoom;
    },

    delete: async (id: number) => {
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
  { players?: Prisma.PlayerCreateInput[]; gameId: number ; Host: string};

type UpdateBody = { time?: Date; gameWinner?: number | null };

export type roomType = {
  create(body: CreateBody): Promise<Room>;
  update(id: number, body: UpdateBody): Promise<Room>;
  delete(id: number): Promise<Room>;
};