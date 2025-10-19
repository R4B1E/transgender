import { Worker, isMainThread, threadId } from "worker_threads";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import Realtime from "../realtime-client/app";
import path from "path";

interface GameRoom {
    gameOn: boolean,
    roomName: string
}

function generateNewGameThread(
    matchId : string,
    gameId : string,
    players : [string],
    activeGameRooms: Map<string, GameRoom>,
    config: any,
    realtime: any,
    mode: string
) {
    if (isMainThread) {
        const workerFile = config.NODE_ENV === 'production'
            ? 'worker.js'
            : 'worker.import.js';

        const worker = new Worker(path.resolve(__dirname, workerFile), {
            workerData: {
                matchId: matchId,
                players: players,
                gameId: gameId,
                realtime_port: config.REALTIME_PORT.toString()
            },
        });
        console.log(`CREATING NEW THREAD WITH ID ${threadId}`);
        worker.on("error", (error) => {
            console.log(`WORKER EXITED DUE TO AN ERROR ${error.message}`);
        });
        worker.on("message", (msg) => {
            if (msg.roomName ) {
                activeGameRooms.set(msg.roomName, {
                    roomName: msg.roomName,
                    gameOn: msg.gameOn,
                })
            } else if (msg.gameWinner) {
                activeGameRooms.delete(msg.roomName);
                const payload = {
                    gameWinner: msg.gameWinner,
                    gameId: gameId,
                    matchId: matchId,
                    mode: mode
                }
                realtime.publish('match:result', payload, true);
            }
        });
        worker.on("exit", (code) => {
            console.log(`WORKER EXITED WITH THREAD ID ${threadId}`);
            if (code !== 0) {
                console.log(`WORKER EXITED DUE TO AN ERROR WITH CODE ${code}`);
            }
        });
    }
}


const PongServerPlugin: FastifyPluginAsync = async function (fastify: FastifyInstance) {
    let activeGameRooms: Map<string, GameRoom> = new Map();
    let realtime = Realtime('ws://realtime:' + fastify.config.REALTIME_PORT.toString(), {reconnect: true});
    realtime.onConnection(async () => {
        realtime.subscribe('PongGame', (message : any) => {
            const {matchId, gameId, players, gameMode} = message;
            console.log('new player joined the game')
            if (!activeGameRooms.has(matchId))
                generateNewGameThread(
                    matchId,
                    gameId,
                    players,
                    activeGameRooms,
                    fastify.config,
                    realtime,
                    gameMode
                );
        })
    })
    /* fastify.addHook('onClose', () => {
        realtime.destructor("pong server is going off, stay tuned :p");
    })
    TODO : Need to change this part of code     
    */
}

export default PongServerPlugin