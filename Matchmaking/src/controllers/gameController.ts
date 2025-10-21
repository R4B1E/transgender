import type { Game, PrismaClient, Room } from "../../generated/prisma";

const gameController = async function(prisma :  PrismaClient) : Promise<gameType> {
    return{
        create: async (id: string, body : CreateBody) => {
            const {mode} = body;
            const game = await prisma.game.create({
                data: {
                    id,
                    type : mode
                }
            })
            return game;
        },
        update: async (_id : string, body : UpdateBody) =>{
            console.log(`updating game with id ${_id}`)
            const { gameWinner } = body;
            console.log(`${gameWinner} is the winner !`);
            const updatedGame = await prisma.game.update({
                where: {id: _id},
                data : {
                    Winner: gameWinner
                }
            })
            return updatedGame;
        },
        delete: async (_id : string) => {
            const deletedGame = await prisma.game.delete({
                where: {id: _id}
            })
            return deletedGame;
        },
        get: async (gameId: string | null, playerId: string | null, includeRooms: boolean) => {
            let Games : Game[] = [];
            if (gameId != null)
            {
                const g = await prisma.game.findFirstOrThrow({
                    where: {
                        id: gameId}, include: {
                            rooms: {
                                include: {
                                    players: {
                                        include : {
                                            player: true
                                        }
                                    }
                                }
                            }
                        }
                    });
                Games.push(g);
            }
            else if(playerId != null) {
                Games = await prisma.game.findMany({
                    where : {
                        players: {
                            some: {
                                playerId
                            }
                        }
                    },
                    include : {
                        rooms: includeRooms
                    }
                })
                if (Games.length === 0)
                    throw Error();
            }
            return Games;
        }
    }
}

export default gameController

type CreateBody = { mode: string };
type UpdateBody = { gameWinner: string };

export type gameWithRoom = Game & {rooms: Room[]};

export type gameType = {
  create(gameId: string, body: CreateBody): Promise<Game>;
  update(id: string, body: UpdateBody): Promise<Game>;
  delete(id: string): Promise<Game>;
  get(gameId: string | null, playerId: string | null, includeRooms: boolean) : Promise<Game[] | gameWithRoom[]>;
};