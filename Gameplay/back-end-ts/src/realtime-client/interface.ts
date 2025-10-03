import type { WebSocket } from "@fastify/websocket";

type PubData = any; // refine later to concrete shapes
type MsgHandler = (data: PubData) => void;
type Channel = Map<string, Set<WebSocket>>;
interface PubMessage { channel: string, data: PubData }

async function sendMsg(socket: WebSocket, msg: PubMessage) {
    socket.send(JSON.stringify(msg));
}

export default class Realtime {
    subscriptionsBySocket: Map<WebSocket, Set<string>> = new Map();
    topics: Channel = new Map();
    channelHandlers = new Map<string, Set<MsgHandler>>();
    constructor() { }
    publish(channel: string, data: PubData) {
        const clients = this.topics.get(channel);
        if (!clients)
            return;

        for (let client of Array.from(clients.values())) {
            if (client.readyState !== WebSocket.OPEN) {
                clients.delete(client);
                this.subscriptionsBySocket.get(client)?.delete(channel);
                continue;
            }
            sendMsg(client, { channel, data });
        }
    }
    subscribe(channel: string, handler: MsgHandler) {
        if (!this.channelHandlers.has(channel)) this.channelHandlers.set(channel, new Set());
        this.channelHandlers.get(channel)!.add(handler);
    }
    unsubscribe(channel: string, handler?: MsgHandler) {
        const set = this.channelHandlers.get(channel);
        if (set && handler) {
            set.delete(handler);
            if (set.size === 0) {
                this.channelHandlers.delete(channel);
            }
        } else {
            this.channelHandlers.delete(channel);
        }
    }
}