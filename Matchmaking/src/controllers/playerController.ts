const playerController = async (prisma: PrismaClient) : Promise<playerType> => {
    return {
        read: async(id: string) => {
            const player = await prisma.player.findFirstOrThrow({
                where: { id }
            });

            return player;
        },
        createOne: async(id : string) => {
            const player = await prisma.player.create({
                data: {id}
            })
            return player;
        },
        createMany: async(players) => {
            const createdPlayers = await prisma.player.createManyAndReturn({
                data: players
            })
            
            return createdPlayers;
        }
    }
}

export default playerController;

export type playerType = {
    read(id: string): Promise<Player>;
    createOne(playerId: string) : Promise<Player>,
    createMany(players: [{id: string}]) : Promise<Player[]>
}

import type {
    PrismaClient,
    Player
} from '../../generated/prisma'