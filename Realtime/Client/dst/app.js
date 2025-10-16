var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
/** @brief Function closure that connects to the
 * Realtime server and returns set of methods that allows
 * communication with the server
 *
 *  @param serverUrl The Realtime Server Url
 *  @param reconnect Reconnection to the server if an error occurs (true, false)
 *  @param reconnectMaxDelayMs the amount of time to take before proceeding the reconnection
 *  @param heartbeatIntervalMs Ping/Pong packets delay in Ms
 *  @return a set of methods allowing pub/sub communication with the server
 */
function Realtime(serverUrl, options) {
    var _a, _b;
    var ws = null;
    var channelHandlers = new Map();
    var subscribed = new Set();
    var heartbeatTimer = [null, null];
    var reconnectAttempt = 0;
    var lastPongTime = Date.now();
    var heartbeatIntervalMs = (_a = options === null || options === void 0 ? void 0 : options.heartbeatIntervalMs) !== null && _a !== void 0 ? _a : 20000;
    var PingIntervalMs = heartbeatIntervalMs;
    var PongTimeoutMs = heartbeatIntervalMs + 5000;
    var reconnectMaxDelayMs = (_b = options === null || options === void 0 ? void 0 : options.reconnectMaxDelayMs) !== null && _b !== void 0 ? _b : 30000;
    function connect() {
        ws = new WebSocket(serverUrl);
        ws.addEventListener("open", function () {
            console.log('connection established');
            reconnectAttempt = 0;
            subscribed.forEach(function (ch) {
                send({ event: "subscribe", channel: ch });
            });
            startHeartbeat();
        });
        ws.addEventListener("message", function (ev) {
            if (ev.data === "pong") {
                lastPongTime = Date.now();
            }
            else {
                try {
                    var obj_1 = JSON.parse(ev.data);
                    var handlers = channelHandlers.get(obj_1.channel);
                    if (handlers) {
                        handlers.forEach(function (h) {
                            try {
                                h(obj_1.data);
                            }
                            catch (err) {
                                console.error("handler error", err);
                            }
                        });
                    }
                }
                catch (err) {
                    console.error("invalid message", err, ev.data);
                }
            }
        });
        ws.addEventListener("close", function (e) {
            // might break here
            stopHeartbeat();
            if ((options === null || options === void 0 ? void 0 : options.reconnect) !== false && e.code !== 1000)
                scheduleReconnect();
        });
        ws.addEventListener("error", function (e) {
            console.warn("ws error", e);
        });
    }
    function scheduleReconnect() {
        reconnectAttempt++;
        var delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt), reconnectMaxDelayMs);
        setTimeout(function () {
            connect();
        }, delay);
    }
    function startHeartbeat() {
        stopHeartbeat();
        heartbeatTimer[0] = setInterval(function () {
            if (ws && ws.readyState === WebSocket.OPEN)
                ws.send("ping");
        }, PingIntervalMs);
        heartbeatTimer[1] = setInterval(function () {
            if (Date.now() - lastPongTime > PongTimeoutMs) {
                console.warn('No pong received in time, reconnecting...');
                if (ws)
                    ws.close();
            }
        }, PongTimeoutMs);
    }
    function stopHeartbeat() {
        for (var i = 0; i < heartbeatTimer.length; i++) {
            var t = heartbeatTimer[i];
            if (t !== null) {
                clearInterval(t);
                heartbeatTimer[i] = null;
            }
        }
    }
    function send(obj) {
        if (!ws)
            throw new Error("Not connected");
        if (ws.readyState !== WebSocket.OPEN) {
            console.warn("ws not open; message dropped", obj);
            return;
        }
        ws.send(JSON.stringify(obj));
    }
    /** @brief function wrapper around open event
    * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/open_event)
    *
    *  @param cb callback when the connection with a Websocket is opened
    */
    function onConnection(cb) {
        if (!ws)
            connect();
        if (!ws)
            throw new Error("Failed to create socket");
        ws.addEventListener("open", cb);
    }
    /** @brief function notifying the Realtime server
     * that client is interested in messages published in a [channel]
    *
    *  @param channel the channel name that the client is wishing to get messages from
    *  @param handler function handler for the event
    */
    function subscribe(channel, handler) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!channelHandlers.has(channel))
                    channelHandlers.set(channel, new Set());
                channelHandlers.get(channel).add(handler);
                if (!subscribed.has(channel)) {
                    subscribed.add(channel);
                    send({ event: "subscribe", channel: channel });
                }
                return [2 /*return*/, function () { return unsubscribe(channel, handler); }];
            });
        });
    }
    /** @brief function notifying the Realtime server
     * that client is no longer interested in messages published in a [channel]
     * if [handler] function is not provided ; Or that client wants to remove a handler
     * function from its list of handlers
    *
    *  @param channel the channel name that the client is wishing to get messages from
    *  @param handler? function handler for the event
    */
    function unsubscribe(channel, handler) {
        var set = channelHandlers.get(channel);
        if (set && handler) {
            set.delete(handler);
            if (set.size === 0) {
                channelHandlers.delete(channel);
                subscribed.delete(channel);
                send({ event: "unsubscribe", channel: channel });
            }
        }
        else {
            channelHandlers.delete(channel);
            subscribed.delete(channel);
            send({ event: "unsubscribe", channel: channel });
        }
    }
    /** @brief Publishes a message into the channel
    *
    *  @param channel the channel name that the client is wishing to get messages from channel
    *  @param handler function handler for the event
    */
    function publish(channel, data, excludeSelf) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                send({ event: "publish", channel: channel, data: data, excludeSelf: excludeSelf });
                return [2 /*return*/];
            });
        });
    }
    /** @brief CleanUp of the socket object and other utilities wrapped
     *  inside the closure function, use it when you're done with the websocket connection
    *
    *  @param reason the message to send to the server along with the 1000 code
    * [WebSocket Reference](https://websocket.org/reference/close-codes/)
    */
    function destructor(reason) {
        stopHeartbeat();
        if (ws)
            ws.close(1000, reason);
        ws = null;
    }
    connect();
    return { onConnection: onConnection, destructor: destructor, subscribe: subscribe, unsubscribe: unsubscribe, publish: publish };
}
export default Realtime;
//# sourceMappingURL=app.js.map