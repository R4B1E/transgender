import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import Realtime from "../Realtime/app"
import type { Game, /*Room,*/ Prisma, Room } from "../../generated/prisma";

const Matchmaking: FastifyPluginAsync = async function (fastify: FastifyInstance, opts) {
    const Modes: Map<string, number> = new Map([["Tournament", 8], ["Multiplayer", 2]]);
    const realtime = Realtime('ws://localhost:8080', { reconnect: true });
    let PlayerPerRoom: Map<string, Room> = new Map();
    let PlayersinRoom : Prisma.PlayerCreateInput[] | undefined = undefined;

    let Queue: Map<string, Prisma.PlayerCreateInput[]> = new Map();
    realtime.onConnection((ev) => {
        realtime.subscribe('StartGame', async (message) => {
        const { mode, id } = message;
        if (PlayerPerRoom.get(id) === undefined)
        {
            console.log(`new player joined the queue ${id}`)
            if (!Queue.has(mode))
                Queue.set(mode, new Array());
            Queue.get(mode)?.push({ id } as Prisma.PlayerCreateInput);
            if (Queue.get(mode)?.length === Modes.get(mode)) {
                const game: Game = await fastify.game.create({ mode });
                const players = Queue.get(mode);
                for (let index = 0; index < players!.length; index += 2) {
                    PlayersinRoom = players?.splice(0, 2);
                    const Host = PlayersinRoom![Math.floor(Math.random() * PlayersinRoom!.length)].id;
                    const room: Room = await fastify.room.create({ gameId: game.id, players: PlayersinRoom , Host});
                    for (const player of PlayersinRoom!)
                    {
                        PlayerPerRoom.set(player.id, room);
                        realtime.publish(`${player.id}-Matchmaking`, {roomId: room.id, hostId: Host}, true);
                        console.log(`sending roomid to room ${player.id}-Matchmaking`)
                    }
                }
                Queue.get(mode)?.splice(0, Modes.get(mode));
            }
        }
        else
        {
            console.log(`Player ${id} is already in game`)
            realtime.publish(`${id}-Matchmaking`, {roomId: PlayerPerRoom.get(id)?.id, hostId: PlayerPerRoom.get(id)?.Host}, true);
        }
        })
    })
    fastify.addHook('onClose', async() => {
        realtime.destructor();
    })
}

export default Matchmaking