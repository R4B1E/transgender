import Realtime from "./realtime-client/client.ts";
import { MovePaddle } from "./game/move_paddle.ts";
import Canvas from "./ui/canvas.ts";

let myReq : number;
let State : "onQueue" | "PreStart";
let gameStartCd = 5;

function calculate_move(key: KeyboardEvent["key"]): MovePaddle {
    switch (key) {
        case "ArrowUp":
            return MovePaddle.UP;
        case "ArrowDown":
            return MovePaddle.DOWN;
        default:
            return MovePaddle.NONE;
    }
}

function rgbHexToInt(hexColor: string){
    return [parseInt(hexColor.slice(1, 3), 16),
        parseInt(hexColor.slice(3, 5), 16), 
        parseInt(hexColor.slice(5, 7), 16) ]
}

async function gameCompleteHandler(message: any){
    const { champion } = message;
    // render the winner here
}

async function onQueue(){
    let ctx, factorX, factorY, fontSize;
    
    
    document.body.style.backgroundColor = 'black';
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    ctx = canvas.getContext("2d")!;
    let aspect_ratio = 16 / 9
    canvas.width = innerWidth * 0.7;
    canvas.height = canvas.width / aspect_ratio;
    factorX = canvas.width / 1920;
    fontSize = 32 * factorX;
    factorY = canvas.height / 1080;
    canvas.style.left = `${innerWidth / 2 - canvas.width / 2}px`;
    canvas.style.top = `${innerHeight / 2 - canvas.height / 2}px`;
    canvas.style.position = "absolute";

    const colorInt = rgbHexToInt("#171324");
    ctx.fillStyle = `rgb(${colorInt[0]} ${colorInt[1]} ${colorInt[2]} / 25%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px "Press Start 2P", system-ui`;

    switch (State)
    {
        case "onQueue":
            {
                const queueText = "In_Queue";
                ctx.fillStyle = "#1E526D";
                const textWidth = ctx.measureText(queueText).width;
                ctx.fillText(queueText, canvas.width / 2 - textWidth / 2, canvas.height / 2);
                break;
            }
        case "PreStart":
            {
                ctx.fillStyle = "#1E526D";
                const PreStartText = "Game Starts in";
                let textWidth = ctx.measureText(PreStartText).width;
                ctx.fillText(PreStartText, canvas.width / 2 - textWidth / 2, canvas.height / 2);
                const text = gameStartCd.toString();
                textWidth = ctx.measureText(text).width;
                ctx.fillText(text, canvas.width / 2 - textWidth / 2, canvas.height / 2 + fontSize + 20 );
                break;
            }
    }
    myReq = window.requestAnimationFrame(onQueue);
}

async function bracketUI(message: any){
    const { matches } = message;
    // check for the type of game before rendering
}

async function matchCompleteHandler(message: any){
    console.log(`received ${JSON.stringify(message)}`)
    canvas.drawWinner(message);
}

async function gameStateHandler(message: any) {
    let {
        paddle_1_position,
        paddle_2_position,
        ball_position,
        player_1_score,
        player_2_score
    } = message;
    console.log(`paddle1_position : ${paddle_1_position}, paddle2_position : ${paddle_2_position}, ball_position : ${ball_position}, player1_score : ${player_1_score}, player2_score : ${player_2_score}`);
    canvas.draw(paddle_1_position, paddle_2_position, ball_position, player_1_score, player_2_score);
}

let canvas = new Canvas(document);
const gameMode = "1v1";

let clientId: string | null = localStorage.getItem("myid");

let realtime = Realtime('ws://localhost:7777');

realtime.onConnection(() => {
    console.log(`my id is ${clientId}`);
    realtime.publish("game:join", { playerId: clientId, gameMode });
    State = "onQueue";
    myReq = window.requestAnimationFrame(onQueue);
    // add queue UI
    // game found UI
    realtime.subscribe(clientId + "-matchmaking", async (message) => {
        // added delay 5sec
        const { gameId, matchId, round, players } = message;
        const amIHost = clientId === players[0] ? "true" : "false";
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
        else if (amIHost === "false") {
            realtime.subscribe(`${matchId}-thread:ready`, async (msg) => {
                realtime.publish(matchId, {
                    amIHost,
                    playerId: clientId
                })
            })
        }
        realtime.subscribe(`${matchId}-ready`, async (message) => {
            State = "PreStart";

            if (message.playerId === clientId)
            {
                let intervalValue = setInterval(()=> {
                    console.log(gameStartCd);
                    if (gameStartCd === 0)
                        clearInterval(intervalValue);
                    else
                        gameStartCd--;
                }, 1_000);
                setTimeout(()=> cancelAnimationFrame(myReq), 5_000);
            }
            // starting game in [delay]
            console.log(`${matchId}-game:state`)
            realtime.subscribe(`${matchId}-game:state`, gameStateHandler);
            realtime.subscribe(`${gameId}-game:complete`, gameCompleteHandler);
            realtime.subscribe(`${matchId}-match:result`, matchCompleteHandler);
            realtime.subscribe(`${gameId}-nextRound`, bracketUI);
            // add callback and delay of 5sec
        });
    })
})

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

window.addEventListener("resize", () => {
    canvas = new Canvas(document);
})