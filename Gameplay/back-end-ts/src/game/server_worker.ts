import { workerData, parentPort } from "worker_threads";
import Paddle from "./physics/paddle";
import PongGame from "./physics/pong_game";
import { MovePaddle } from "./physics/move_paddle";
import Realtime from "../realtime-client/app";

const CANVAS_HEIGHT = workerData ? workerData.canvas_height : 0;
const CANVAS_WIDTH = workerData ? workerData.canvas_width : 0;
const GAME_TICKER_MS = 1_000 / 60;

let players: Map<string, Paddle> = new Map();
let playerChannels: Map<string, string> = new Map();
let gameOn = false;
let roomCode = workerData ? workerData.hostRoomCode : 0;
let gameTickerOn = true;

let game: PongGame = new PongGame(CANVAS_WIDTH, CANVAS_HEIGHT);
let player_1_score: number = 0;
let player_2_score: number = 0;
let player_1_move: MovePaddle = MovePaddle.NONE;
let player_2_move: MovePaddle = MovePaddle.NONE;


const realtime = Realtime('ws://localhost:8080', {reconnect: true});

function startGameDataTicker() {
    let tickInterval = setInterval(async () => {
        if (!gameTickerOn)
            clearInterval(tickInterval)
        else {
            let [paddle_1_position, paddle_2_position, ball_position, player_won] = game.update(player_1_move, player_2_move);
            player_1_move = player_2_move = MovePaddle.NONE;
            if (player_won == 1) {
                player_1_score += 1
                game = new PongGame(CANVAS_WIDTH, CANVAS_HEIGHT);
            }
            else if (player_won == 2) {
                player_2_score += 1
                game = new PongGame(CANVAS_WIDTH, CANVAS_HEIGHT);
            }
            realtime.publish(roomCode + "game-state", {
                paddle_1_position,
                paddle_2_position,
                ball_position,
                player_1_score,
                player_2_score
            }, true)
        }
    }, GAME_TICKER_MS)
}

function subscribeToPlayerInput(channelInstance: string, playerId: string, player1: boolean) {
    realtime.subscribe(channelInstance, async (msg: any /* to be replaced */) => {
        const move = /* MovePaddle[msg.keyPressed as keyof typeof MovePaddle] */msg.keyPressed;
        if (player1)
            player_1_move = move;
        else
            player_2_move = move;
    })
}

realtime.onConnection(async () => {
    let newPlayerId;
    realtime.subscribe(roomCode, async (player: any /* To be replaced */) => {
        newPlayerId = player.clientId;
        if (!players.get(newPlayerId)) {
            console.log(`new player joined the game ${newPlayerId}`);
            parentPort!.postMessage(
                {
                    roomName: roomCode,
                    gameOn: gameOn
                }
            )
            playerChannels.set(newPlayerId, newPlayerId + "pos");
            startGameDataTicker();
            subscribeToPlayerInput(playerChannels.get(newPlayerId)!, newPlayerId, player.isHost);
        }
    })
    realtime.publish(roomCode + "thread-ready", {
        start: true,
    }, true);
})