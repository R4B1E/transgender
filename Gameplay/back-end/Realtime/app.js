module.exports =  function Realtime(serverUrl, options) {
    let ws = null;
    const channelHandlers = new Map();
    const subscribed = new Set();
    let heartbeatTimer = [null, null];
    let reconnectAttempt = 0;
    let lastPongTime = Date.now();
    const heartbeatIntervalMs = options?.heartbeatIntervalMs ?? 20_000;
    const PingIntervalMs = heartbeatIntervalMs;
    const PongTimeoutMs = heartbeatIntervalMs + 5_000;
    const reconnectMaxDelayMs = options?.reconnectMaxDelayMs ?? 30_000;

    function connect() {
        ws = new WebSocket(serverUrl);
        ws.addEventListener("open", () => {
            console.log('connection established')
            reconnectAttempt = 0;
            subscribed.forEach(ch => {
                send({ event: "subscribe", channel: ch });
            });
            startHeartbeat();
        });

        ws.addEventListener("message", (ev) => {
            if (ev.data === "pong") {
                lastPongTime = Date.now();
            }
            else {
                try {
                    const obj = JSON.parse(ev.data);
                    const handlers = channelHandlers.get(obj.channel);
                    if (handlers) {
                        handlers.forEach(h => {
                            try { h(obj.data); } catch (err) { console.error("handler error", err); }
                        });
                    }
                } catch (err) {
                    console.error("invalid message", err, ev.data);
                }
            }
        });
        ws.addEventListener("close", (e) => {
            // might break here
            stopHeartbeat();
            if (options?.reconnect !== false && e.code !== 1000) scheduleReconnect();
        });
        ws.addEventListener("error", (e) => {
            console.warn("ws error", e);
        });
    }

    function scheduleReconnect() {
        reconnectAttempt++;
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt), reconnectMaxDelayMs);
        setTimeout(() => {
            connect();
        }, delay);
    }

    function startHeartbeat() {
        stopHeartbeat();
        heartbeatTimer[0] = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, PingIntervalMs);
        heartbeatTimer[1] = setInterval(() => {
            if (Date.now() - lastPongTime > PongTimeoutMs) {
                console.warn('No pong received in time, reconnecting...');
                if (ws) ws.close();
            }
        }, PongTimeoutMs)
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
    function send(obj) {
        if (!ws) throw new Error("Not connected");
        if (ws.readyState !== WebSocket.OPEN) {
            console.warn("ws not open; message dropped", obj);
            return;
        }
        ws.send(JSON.stringify(obj))
    }

    /** @brief function wrapper around open event 
    * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/open_event)
    *
    *  @param cb callback when the connection with a Websocket is opened
    */
    function onConnection(cb) {
        if (!ws) connect();
        if (!ws) throw new Error("Failed to create socket");
        ws.addEventListener("open", cb);
    }

    /** @brief function notifying the Realtime server 
     * that client is interested in messages published in a [channel]
    *
    *  @param channel the channel name that the client is wishing to get messages from
    *  @param handler function handler for the event
    */
    async function subscribe(channel, handler) {
        if (!channelHandlers.has(channel)) channelHandlers.set(channel, new Set());
        channelHandlers.get(channel).add(handler);
        if (!subscribed.has(channel)) {
            subscribed.add(channel);
            send({ event: "subscribe", channel });
        }
        return () => unsubscribe(channel, handler);
    }

    /** @brief function notifying the Realtime server 
     * that client is no longer interested in messages published in a [channel]
     * if [handler] function is not provided ; Or that client wants to remove a handler
     * function from its list of handlers
    *
    *  @param channel the channel name that the client is wishing to get messages from
    *  @param handler? function handler for the event
    */
    function unsubscribe(channel, handler ) {
        const set = channelHandlers.get(channel);
        if (set && handler) {
            set.delete(handler);
            if (set.size === 0) {
                channelHandlers.delete(channel);
                subscribed.delete(channel);
                send({ event: "unsubscribe", channel });
            }
        } else {
            channelHandlers.delete(channel);
            subscribed.delete(channel);
            send({ event: "unsubscribe", channel });
        }
    }

    /** @brief Publishes a message into the channel
    *
    *  @param channel the channel name that the client is wishing to get messages from channel
    *  @param handler function handler for the event
    */
    async function publish(channel ,data , excludeSelf) {
        send({ event: "publish", channel, data, excludeSelf });
    }

    /** @brief CleanUp of the socket object and other utilities wrapped
     *  inside the closure function, use it when you're done with the websocket connection
    *
    *  @param reason the message to send to the server along with the 1000 code
    * [WebSocket Reference](https://websocket.org/reference/close-codes/)
    */
    function destructor(reason) {
        stopHeartbeat();
        if (ws) ws.close(1000, reason);
        ws = null;
    }

    connect();

    return { onConnection, destructor, subscribe, unsubscribe, publish };
}
// this needs to go somewhere