import type { Game, PrismaClient } from "../../generated/prisma";

const gameController = async function(prisma :  PrismaClient) : Promise<gameType> {
    return{
        create: async (body : CreateBody) => {
            const {mode} = body;
            const game = await prisma.game.create({
                data: {
                    type : mode,
                }
            })
            return game;
        },
        update: async (_id : number, body : UpdateBody) =>{
            const { time/*, gameWinner*/ } = body;
            const updatedGame = await prisma.game.update({
                where: {id: _id},
                data : {
                    endedAt: time,
                    // winner: gameWinner
                }
            })
            return updatedGame;
        },
        delete: async (_id : number) => {
            const deletedGame = await prisma.game.delete({
                where: {id: _id}
            })
            return deletedGame;
        }
    }
}

export default gameController

type CreateBody = { mode: string };
type UpdateBody = { time: Date; gameWinner: string };

export type gameType = {
  create(body: CreateBody): Promise<Game>;
  update(id: number, body: UpdateBody): Promise<Game>;
  delete(id: number): Promise<Game>;
};