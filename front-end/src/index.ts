import Realtime from "./realtime-client/client.ts";
import { MovePaddle } from "./game/move_paddle.ts";
import BallPosition from "./domain/ball_position.ts";
import PaddlePosition from "./domain/paddle_position.ts";
import Canvas from "./ui/canvas.ts";

// function drawScore() {
//   ctx.font = "16px Arial";
//   ctx.fillStyle = "#0095DD";
//   ctx.fillText(`Score: ${score}`, 8, 20);
// }

function calculate_move(key: KeyboardEvent["key"]) : MovePaddle
{
    switch (key)
    {
        case "ArrowUp":
            return MovePaddle.UP;
        case "ArrowDown":
            return MovePaddle.DOWN;
        default:
            return MovePaddle.NONE;
    }
}

async function matchmakingHandler(message : any){

}

let canvas = new Canvas(document);
const gameMode = "1v1";

let myGameRoomCode : string | null = null;
// let amIHost : boolean | null = null;
let clientId : string | null = localStorage.getItem("myid");
let gameId : string | null = localStorage.getItem("gameId");
let matchId : string | null = localStorage.getItem("matchId");
let amIHost : string | null = localStorage.getItem("amIHost");

let paddle_1_position : PaddlePosition;
let paddle_2_position : PaddlePosition;
let ball_position : BallPosition;
let player_1_score : number;
let player_2_score : number;

let realtime = Realtime('ws://localhost:7777');

realtime.onConnection((event) => {
    console.log(`my id is ${clientId}`);

    realtime.publish("game:join", {playerId : clientId, gameMode});
    realtime.subscribe(clientId + "-matchmaking", async(message) => 
    {
        const {gameId, matchId, round, players} = message;
        localStorage.setItem("gameId", gameId);
        localStorage.setItem("matchId", matchId);
        amIHost = clientId === players[0] ? "true" : "false";
        localStorage.setItem("amIHost", amIHost);
        if (amIHost === "true") {
            realtime.subscribe(`${matchId}-thread:ready`, async (msg) => {
                realtime.publish(matchId, {
                    amIHost,
                    playerId: clientId,
                    screen_width: canvas.width,
                    screen_height: canvas.height
                })
            })
            realtime.publish("PongGame", {
                matchId,
                gameId,
                players,
                gameMode
            })
        }
        else if (!amIHost) {
            realtime.subscribe(`${matchId}-thread:ready`, async (msg) => {
                realtime.publish(matchId, {
                    amIHost,
                    playerId: clientId,
                    screen_width: canvas.width,
                    screen_height: canvas.height
                })
            })
        }
        realtime.subscribe(`${matchId}-ready`, async (message) => {
            realtime.subscribe(`${matchId}-game:state`, (message) => {
                paddle_1_position = message.paddle_1_position;
                paddle_2_position = message.paddle_2_position;
                ball_position = message.ball_position;
                player_1_score = message.player1_score;
                player_2_score = message.player2_score;
                // console.log(`paddle1_position : ${paddle1_position}, paddle2_position : ${paddle2_position}, ball_position : ${ball_position}, player1_score : ${player1_score}, player2_score : ${player2_score}`);
                canvas.draw(paddle_1_position, paddle_2_position, ball_position, player_1_score, player_2_score);
            })
        })
    })
})

// window.requestAnimationFrame(update);

// function update() {
//     canvas.draw(paddle1_position, paddle2_position, ball_position, player1_score, player2_score);
//     window.requestAnimationFrame(update);
// }

// Listening on key events, the rest is self explnatory
window.addEventListener("keydown", (event) => {
    let move = calculate_move(event.key);
    if (move != MovePaddle.NONE) {
        realtime.publish(clientId + "pos", {
            keyPressed: move
        })
    }
}, false
);