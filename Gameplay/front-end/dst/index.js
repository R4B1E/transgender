import Realtime from "./realtime-client/client.js";
import { MovePaddle } from "./game/move_paddle.js";
import Canvas from "./ui/canvas.js";
function calculate_move(key) {
    switch (key) {
        case "ArrowUp":
            return MovePaddle.UP;
        case "ArrowDown":
            return MovePaddle.DOWN;
        default:
            return MovePaddle.NONE;
    }
}
let canvas = new Canvas(document);
let myGameRoomCode = null;
let amIHost = null;
let clientId = localStorage.getItem("myid");
let paddle_1_position;
let paddle_2_position;
let ball_position;
let player_1_score;
let player_2_score;
let realtime = Realtime('ws://localhost:8080');
realtime.onConnection((event) => {
    console.log(`my id is ${clientId}`);
    realtime.publish("StartGame", { id: clientId, mode: "Multiplayer" });
    realtime.subscribe(clientId + "-Matchmaking", async (message) => {
        console.log(message.roomId);
        amIHost = message.hostId === clientId;
        myGameRoomCode = message.roomId.toString();
        if (amIHost) {
            realtime.subscribe(myGameRoomCode + "thread-ready", async (msg) => {
                realtime.publish(myGameRoomCode, {
                    isHost: amIHost,
                    clientId: clientId
                });
            });
            console.log('sending payload cause i am the host !');
            realtime.publish("PongGame", {
                roomCode: myGameRoomCode,
                isHost: amIHost,
                width: canvas.width,
                height: canvas.height,
                clientId: clientId
            });
        }
        else if (!amIHost) {
            realtime.subscribe(myGameRoomCode + "thread-ready", async (msg) => {
                realtime.publish(myGameRoomCode, {
                    isHost: amIHost,
                    clientId: clientId
                });
            });
        }
        realtime.subscribe(myGameRoomCode + "game-state", (message) => {
            paddle_1_position = message.paddle_1_position;
            paddle_2_position = message.paddle_2_position;
            ball_position = message.ball_position;
            player_1_score = message.player1_score;
            player_2_score = message.player2_score;
            // console.log(`paddle1_position : ${paddle1_position}, paddle2_position : ${paddle2_position}, ball_position : ${ball_position}, player1_score : ${player1_score}, player2_score : ${player2_score}`);
            canvas.draw(paddle_1_position, paddle_2_position, ball_position, player_1_score, player_2_score);
        });
    });
});
// window.requestAnimationFrame(update);
// function update() {
//     canvas.draw(paddle1_position, paddle2_position, ball_position, player1_score, player2_score);
//     window.requestAnimationFrame(update);
// }
// Listening on key events, the rest is self explnatory
window.addEventListener("keydown", (event) => {
    let move = calculate_move(event.key);
    console.log(move);
    if (move != MovePaddle.NONE) {
        realtime.publish(clientId + "pos", {
            keyPressed: move
        });
    }
}, false);
//# sourceMappingURL=index.js.map