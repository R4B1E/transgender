// import { RouteOptions } from '@fastify/websocket';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import Ajv from 'ajv'
// import { FastifyRequest } from 'fastify/types/request';
import { WebSocket } from 'ws';

const ajv = new Ajv();
type EventType = 'subscribe' | 'unsubscribe' | 'publish';

type PubData = unknown;

interface PubMessage { channel: string, data: PubData }

interface Pub_Sub_event { event: EventType; channel: string; data?: PubData, excludeSelf?: boolean }

// const topics: Channel = new Map();

function safeParse(msg: string): Pub_Sub_event | null {
    try {
        const parsed = JSON.parse(msg);
        if (!parsed) return null;
        return parsed as Pub_Sub_event;
    } catch {
        return null;
    }
}

async function sendMsg(socket: WebSocket, msg: PubMessage) {
    socket.send(JSON.stringify(msg));
}

// WebSocket message schema
const messageSchema = {
    type: 'object',
    properties: {
        event: {
            type: 'string', enum: [
                'subscribe',
                "unsubscribe",
                "publish"
            ]
        },
        channel: { type: 'string' },
        data: { type: 'object' },
    },
    required: ['event', 'channel'],
};

function cleanupSocket(socket: WebSocket, topics: any, subscriptionsBySocket: any) {
    console.log('client disconnected')
    const channels = subscriptionsBySocket.get(socket);
    if (channels) {
        for (const ch of Array.from(channels.values())) {
            const set = topics.get(ch);
            if (set) {
                set.delete(socket);
                if (set.size === 0) topics.delete(ch);
            }
        }
    }
    subscriptionsBySocket.delete(socket);
    try {
        socket.close(1000); // this needs to be fixed
    } catch { }
}

type Timer = ReturnType<typeof setInterval> | null;

const validate = ajv.compile(messageSchema);

const FastifyRoutes: FastifyPluginAsync = async function (fastify: FastifyInstance) {
    const realtime = fastify.realtime;
    let interval: Timer = null;
    fastify.get('/', { websocket: true }, (socket, req) => {
        fastify.log.info(`New client connected`);
        // socket.send('hello client !')
        (socket as any).isAlive = true;
        socket.on('pong', () => {
            // console.log('received pong frame');
            (socket as any).isAlive = true;
        })
        socket.on('message', (raw: Buffer | string) => {
            const text = typeof raw === 'string' ? raw : raw.toString('utf-8');
            if (text === "ping") {
                socket.send("pong");
                return;
            }
            const msg = safeParse(text);
            if (!validate(msg))
                return sendMsg(socket, { channel: "Error", data: 'Invalid Message Structure.' })

            const { event, channel, data } = msg;

            switch (event) {
                case 'subscribe': {
                    if (!realtime.topics.has(channel))
                        realtime.topics.set(channel, new Set());
                    realtime.topics.get(channel)!.add(socket);

                    if (!realtime.subscriptionsBySocket.has(socket))
                        realtime.subscriptionsBySocket.set(socket, new Set());
                    realtime.subscriptionsBySocket.get(socket)!.add(channel);
                    break;
                }

                case 'unsubscribe': {
                    realtime.topics.get(channel)?.delete(socket);
                    realtime.subscriptionsBySocket.get(socket)?.delete(channel);
                    break;
                }

                case 'publish': {
                    try {
                        const handlers = realtime.channelHandlers.get(msg.channel);
                        if (handlers) {
                            handlers.forEach((h) => {
                                try {
                                    h(msg.data);
                                } catch (err) {
                                    console.error("handler error", err);
                                }
                            });
                        }
                    } catch (err) {
                        console.error("invalid message", err, data);
                    }
                    break;
                }
                default: break;
            }

            socket.on('close', () => cleanupSocket(socket, realtime.topics, realtime.subscriptionsBySocket));

            socket.on('error', (err: any) => {
                console.error('socket error', err);
                cleanupSocket(socket, realtime.topics, realtime.subscriptionsBySocket);
            })

            interval = setInterval(() => {
                const clients = Array.from(realtime.subscriptionsBySocket.keys());
                // console.log(`size of clients ${clients.length}`)
                for (const client of clients) {
                    // console.log((client as any).isAlive);
                    if ((client as any).isAlive === false) {
                        cleanupSocket(client, realtime.topics,realtime.subscriptionsBySocket)
                        return;
                    }
                    // (client as any).isAlive = false;
                    try { client.ping(); } catch { }
                }
            }, 30_000)
        })

    })
    fastify.addHook('onClose', async () => {
        if (interval !== null) {
            fastify.log.info('clearing interval')
            clearInterval(interval);
        }
    })
}
export default FastifyRoutes