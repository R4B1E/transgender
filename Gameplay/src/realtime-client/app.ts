type Channel = string;
type PubData = any;
type EventType = 'subscribe' | 'unsubscribe' | 'publish' | 'ping';

interface PubSubEvent {
  event: EventType;
  channel: Channel;
  data?: PubData;
  excludeSelf?: boolean;
}

type Timer = ReturnType<typeof setInterval> | null;
type MsgHandler = (data: PubData) => void;

function Realtime(
  serverUrl: string,
  options?: { reconnect?: boolean; reconnectMaxDelayMs?: number; heartbeatIntervalMs?: number }
) {
  let ws: WebSocket | null = null;
  const channelHandlers = new Map<Channel, Set<MsgHandler>>();
  const subscribed = new Set<Channel>();
  let heartbeatTimer: [Timer, Timer] = [null, null];
  let reconnectAttempt = 0;
  let lastPongTime = Date.now();
  const heartbeatIntervalMs = options?.heartbeatIntervalMs ?? 20_000;
  const PingIntervalMs = heartbeatIntervalMs;
  const PongTimeoutMs = heartbeatIntervalMs + 5_000;
  const reconnectMaxDelayMs = options?.reconnectMaxDelayMs ?? 30_000;

  function connect() {
    ws = new WebSocket(serverUrl);

    ws.addEventListener("open", () => {
      console.log("connection established");
      reconnectAttempt = 0;
      subscribed.forEach((ch) => send({ event: "subscribe", channel: ch }));
      startHeartbeat();
    });

    ws.addEventListener("message", (ev: MessageEvent) => {
      const data = ev.data;
      if (data === "pong") {
        lastPongTime = Date.now();
        return;
      }
      try {
        const obj = JSON.parse(String(data)) as PubSubEvent;
        const handlers = channelHandlers.get(obj.channel);
        if (handlers) {
          handlers.forEach((h) => {
            try {
              h(obj.data);
            } catch (err) {
              console.error("handler error", err);
            }
          });
        }
      } catch (err) {
        console.error("invalid message", err, data);
      }
    });

    ws.addEventListener("close", (e: CloseEvent) => {
      console.log(`connection closed with code ${e.code}`);
      stopHeartbeat();
      if (options?.reconnect !== false && e.code !== 1000) scheduleReconnect();
    });

    ws.addEventListener("error", (e: Event) => {
      console.warn("ws error", e);
    });
  }

  function scheduleReconnect() {
    reconnectAttempt++;
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt), reconnectMaxDelayMs);
    setTimeout(connect, delay);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer[0] = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, PingIntervalMs);
    heartbeatTimer[1] = setInterval(() => {
      if (Date.now() - lastPongTime > PongTimeoutMs) {
        console.warn("No pong received in time, reconnecting...");
        if (ws) ws.close();
      }
    }, PongTimeoutMs);
  }

  function stopHeartbeat() {
    for (let i = 0; i < heartbeatTimer.length; i++) {
      const t = heartbeatTimer[i];
      if (t !== null) {
        clearInterval(t);
        heartbeatTimer[i] = null;
      }
    }
  }

  function send(obj: PubSubEvent) {
    if (!ws) throw new Error("Not connected");
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn("ws not open; message dropped", obj);
      return;
    }
    ws.send(JSON.stringify(obj));
  }

  function onConnection(cb: (ev: Event) => void) {
    if (!ws) connect();
    if (!ws) throw new Error("Failed to create socket");
    ws.addEventListener("open", cb);
  }

  function subscribe(channel: Channel, handler: MsgHandler): () => void {
    if (!channelHandlers.has(channel)) channelHandlers.set(channel, new Set());
    channelHandlers.get(channel)!.add(handler);
    if (!subscribed.has(channel)) {
      subscribed.add(channel);
      send({ event: "subscribe", channel });
    }
    return () => unsubscribe(channel, handler);
  }

  function unsubscribe(channel: Channel, handler?: MsgHandler) {
    const set = channelHandlers.get(channel);
    if (set && handler) {
      set.delete(handler);
      if (set.size === 0) {
        channelHandlers.delete(channel);
        subscribed.delete(channel);
      }
    } else {
      channelHandlers.delete(channel);
      subscribed.delete(channel);
    }
  }

  function publish(channel: Channel, data: PubData, excludeSelf = false) {
    send({ event: "publish", channel, data, excludeSelf });
  }

  function destructor(reason?: string) {
    stopHeartbeat();
    if (ws) ws.close(1000, reason);
    ws = null;
  }

  connect();

  return { onConnection, destructor, subscribe, unsubscribe, publish };
}

export default Realtime;