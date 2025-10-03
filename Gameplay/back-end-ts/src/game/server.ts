import { Worker, isMainThread, threadId } from "worker_threads";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import path from "path";

interface GameRoom {
    gameOn: boolean,
    roomName: string
}

function generateNewGameThread(
    hostRoomCode: string,
    hostClientId: string,
    canvas_width: number,
    canvas_height: number,
    activeGameRooms: Map<string, GameRoom>,
    fastify: FastifyInstance
) {
    if (isMainThread) {
        const workerFile = fastify.config.NODE_ENV === 'production'
            ? 'worker.js'
            : 'worker.import.js';

        const worker = new Worker(path.resolve(__dirname, workerFile), {
            workerData: {
                hostRoomCode: hostRoomCode,
                hostClientId: hostClientId,
                canvas_width: canvas_width,
                canvas_height: canvas_height,
                realtime: fastify.realtime
            },
        });
        console.log(`CREATING NEW THREAD WITH ID ${threadId}`);
        worker.on("error", (error) => {
            console.log(`WORKER EXITED DUE TO AN ERROR ${error.message}`);
        });
        worker.on("message", (msg) => {
            if (msg.roomName && !msg.resetEntry) {
                activeGameRooms.set(msg.roomName, {
                    roomName: msg.roomName,
                    gameOn: msg.gameOn,
                })
            } else if (msg.roomName && msg.resetEntry) {
                activeGameRooms.delete(msg.roomName);
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
    let realtime = fastify.realtime;
        realtime.subscribe('PongGame', (message : any) => {
            if (activeGameRooms.get(message.roomCode) === undefined)
                generateNewGameThread(
                    message.roomCode,
                    message.clientId,
                    message.width,
                    message.height,
                    activeGameRooms,
                    fastify
                );
        })
    /* fastify.addHook('onClose', () => {
        realtime.destructor("pong server is going off, stay tuned :p");
    })
    TODO : Need to change this part of code     
    */
}

export default PongServerPlugin