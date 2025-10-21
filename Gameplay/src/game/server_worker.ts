import { workerData, parentPort } from "worker_threads";
import PongGame from "./physics/pong_game";
import { MovePaddle } from "./physics/move_paddle";
import Realtime from "../realtime-client/app";

const GAME_TICKER_MS = 1_000 / 60;

let playerChannels: Map<string, string> = new Map();
let gameOn = false;
let matchId = workerData.matchId;
let gameTickerOn = true;
let players = workerData.players;

let game: PongGame ;
let player_1_score: number = 0;
let player_2_score: number = 0;
let player_1_move: MovePaddle = MovePaddle.NONE;
let player_2_move: MovePaddle = MovePaddle.NONE;
let tickInterval : NodeJS.Timeout | null;

function killWorkerThread(winner: string){
    parentPort?.postMessage({
        gameWinner: winner,
    });
    for (const f in playerChannels)
        realtime.unsubscribe(playerChannels.get(f) as string);
    if (tickInterval)
        clearInterval(tickInterval);
    process.exit(0);
}

const realtime = Realtime('ws://realtime:' + workerData.realtime_port, {reconnect: true});

function startGameDataTicker(screen_width : number, screen_height : number) {
    tickInterval = setInterval(async () => {
        if (!gameTickerOn)
            clearInterval(tickInterval!)
        else {
            let [paddle_1_position, paddle_2_position, ball_position, player_won] = game.update(player_1_move, player_2_move);
            player_1_move = player_2_move = MovePaddle.NONE;
            if (player_won == 1) {
                player_1_score += 1;
                if (player_1_score == 10)
                    killWorkerThread(players[0]);
                game = new PongGame(screen_width, screen_height);
            }
            else if (player_won == 2) {
                player_2_score += 1;
                if (player_2_score == 5)
                    killWorkerThread(players[1]);
                game = new PongGame(screen_width, screen_height);
            }
            else {
                console.log('publishing game state ');
                realtime.publish(matchId + "-game:state", {
                    paddle_1_position,
                    paddle_2_position,
                    ball_position,
                    player_1_score,
                    player_2_score
                }, true)
            }
        }
    }, GAME_TICKER_MS)
}

function subscribeToPlayerInput(channelInstance: string, playerId: string, player1: string) {
    realtime.subscribe(channelInstance, async (msg: any /* to be replaced */) => {
        const move = /* MovePaddle[msg.keyPressed as keyof typeof MovePaddle] */msg.keyPressed;
        if (player1 === "true")
            player_1_move = move;
        else
            player_2_move = move;
    })
}

realtime.onConnection(async () => {
    realtime.subscribe(matchId, async (player: any /* To be replaced */) => {
        const { screen_width, screen_height, playerId, amIHost} = player;
        if (!playerChannels.has(playerId)) {
            console.log(`new player joined the game ${playerId}`);
            parentPort!.postMessage(
                {
                    roomName: matchId,
                    gameOn: gameOn
                }
            )
            playerChannels.set(playerId, playerId + "pos");
            game = new PongGame(screen_width, screen_height);
            // delay by one RTT ~ estimated to be 1sec
            realtime.publish(`${matchId}-ready`, {delay: 6000}, true);
            setTimeout(() => {
                startGameDataTicker(screen_width, screen_height);
                subscribeToPlayerInput(playerChannels.get(playerId)!, playerId, amIHost);    
            }, 5000);
        }
    })
    realtime.publish(`${matchId}-thread:ready`, {
        start: true
    }, true);
})