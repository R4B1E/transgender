import { workerData, parentPort } from "worker_threads";
import PongGame from "./physics/pong_game";
import { MovePaddle } from "./physics/move_paddle";
import Realtime from "../realtime-client/app";

const GAME_TICKER_MS = 1_000 / 60;

let playerChannels: Map<string, string> = new Map();
let gameOn = true;
let matchId = workerData.matchId;
let players: string[] = workerData.players;
let Winner: string;

let game: PongGame = new PongGame();
let player_1_score: number = 0;
let player_2_score: number = 0;
let player_1_move: MovePaddle = MovePaddle.NONE;
let player_2_move: MovePaddle = MovePaddle.NONE;
let tickInterval: NodeJS.Timeout | null;

function killWorkerThread(winner: string, payload: any) {
    parentPort?.postMessage({
        gameWinner: winner,
        payload
    });
    for (const f in playerChannels)
        realtime.unsubscribe(playerChannels.get(f) as string);
    if (tickInterval)
        clearInterval(tickInterval);
    process.exit(0);
}

const realtime = Realtime('ws://realtime:' + workerData.realtime_port, { reconnect: true });

function startGameDataTicker() {
    tickInterval = setInterval(async () => {
        switch (gameOn) {
            case true:
                {
                    let [paddle_1_position, paddle_2_position, ball_position, player_won] = game.update(player_1_move, player_2_move);
                    player_1_move = player_2_move = MovePaddle.NONE;

                    if (player_won == 1) {
                        player_1_score += 1;
                        if (player_1_score == 1) {
                            gameOn = false;
                            Winner = players[0];
                        }
                        game = new PongGame();
                    }

                    else if (player_won == 2) {
                        player_2_score += 1;
                        if (player_2_score == 1) {
                            gameOn = false;
                            Winner = players[1];
                        }
                        game = new PongGame();
                    }
                    
                    const payload =
                    {
                        paddle_1_position,
                        paddle_2_position,
                        ball_position,
                        player_1_score,
                        player_2_score
                    }
                    realtime.publish(matchId + "-game:state", payload, true);
                    break;
                }
            case false:
                {
                    let [paddle_1_position, paddle_2_position, ball_position] = game.getStats();

                    const payload = {
                        paddle_1_position,
                        paddle_2_position,
                        ball_position,
                        player_1_score,
                        player_2_score
                    }

                    killWorkerThread(Winner, payload);
                    break;
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
        const { playerId, amIHost } = player;
        playerChannels.set(playerId, playerId + "pos");
        // delay by one RTT ~ estimated to be 1sec
        realtime.publish(`${matchId}-ready`, { playerId }, true);
        setTimeout(() => {
            startGameDataTicker();
            subscribeToPlayerInput(playerChannels.get(playerId)!, playerId, amIHost);
        }, 5000);

        realtime.subscribe(`${playerId}-disconnect`, async (msg) => {
            Winner = players.filter((p) => (p != playerId))[0];
            gameOn = false;
        })
    })
    realtime.publish(`${matchId}-thread:ready`, {
        start: true
    }, true);
})