import BallPosition from "../domain/ball_position.ts"
import PaddlePosition from "../domain/paddle_position.ts"
import Circle from "./circle.ts"
import Rectangle from "./rectangle.ts"

function drawText(ctx : CanvasRenderingContext2D, text: number | string, x: number, y: number, fontSize: number, color: string) {
  ctx.font = `${fontSize}px "Press Start 2P", system-ui`;
  ctx.fillStyle = color;
//   ctx.scale(scaleX, scaleY);
  const textWidth = ctx.measureText(text.toString()).width;
  const textHeight = fontSize;
  ctx.fillText(`${text}`, (x - textWidth / 2) , (y + textHeight / 2));
//   ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function rgbHexToInt(hexColor: string){
    return [parseInt(hexColor.slice(1, 3), 16), // Red component
        parseInt(hexColor.slice(3, 5), 16),  // Green component
        parseInt(hexColor.slice(5, 7), 16) ]
}

function drawDAshedLine(ctx: CanvasRenderingContext2D, width: number, height: number, color: string){
    const margin = height * 0.01;
    const rectWidth = width * 0.005;
    const rectHeight = height * 0.02;
    for (let start = margin; start < width; start += margin)
    {
        const rectangle = new Rectangle((width / 2) - rectWidth, start, rectWidth, rectHeight, color);
        rectangle.draw(ctx);
        start += rectHeight;
    }
}

export default class Canvas {
    ball: Rectangle
    paddle1: Rectangle
    paddle2: Rectangle
    ctx: CanvasRenderingContext2D
    width: number
    height: number
    factorX: number
    factorY: number
    constructor(document: Document) {
        document.body.style.backgroundColor = 'black';
        const canvas = document.getElementById("canvas") as HTMLCanvasElement;
        this.ctx = canvas.getContext("2d")!;
        let aspect_ratio = 16 / 9
        this.width = canvas.width = innerWidth * 0.7;
        this.height = canvas.height = this.width / aspect_ratio;
        this.factorX = this.width / 1920;
        this.factorY = this.height / 1080;
        canvas.style.left = `${innerWidth / 2 - this.width / 2}px`;
        canvas.style.top = `${innerHeight / 2 - this.height / 2}px`;
        canvas.style.position = "absolute";
        this.ball = new Rectangle(this.width / 2, this.height / 2, 30 * this.factorX, 30 * this.factorX, "#53A3CC");
        let margin = 10 * this.factorX;
        let paddle_width = 30 * this.factorX;
        this.paddle1 = new Rectangle(margin, (4 * this.height / 10) * this.factorY, paddle_width, (2 * this.height / 10) * this.factorY, "#53A3CC");
        this.paddle2 = new Rectangle(this.width - margin - paddle_width, (4 * this.height / 10) * this.factorY, paddle_width, (2 * this.height / 10) * this.factorY, "#53A3CC");
    }
    draw(paddle1_position: PaddlePosition, paddle2_position: PaddlePosition, ball_position: BallPosition, player1_score: number, player2_score: number): void {
        const colorInt = rgbHexToInt("#171324");
        this.ctx.fillStyle = `rgb(${colorInt[0]} ${colorInt[1]} ${colorInt[2]} / 100%)`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ball.move(ball_position.y * this.factorY, ball_position.x * this.factorX);
        this.paddle1.move(paddle1_position.top * this.factorY);
        this.paddle2.move(paddle2_position.top * this.factorY);
        
        drawDAshedLine(this.ctx, this.width, this.height, "#1E526D");
        this.ball.draw(this.ctx);
        this.paddle1.draw(this.ctx);
        this.paddle2.draw(this.ctx);
        drawText(this.ctx, player1_score, this.width / 2 - this.width / 8, this.height / 8, 64 * this.factorX, "#1E526D");
        drawText(this.ctx, player2_score, this.width / 2 + this.width / 8, this.height / 8, 64 * this.factorX, "#1E526D");
        // Display score and other information
    }
    drawWinner(payload : any)
    {
        const {
            paddle_1_position,
            paddle_2_position,
            ball_position,
            player_1_score,
            player_2_score,
            gameWinner
        } = payload;

        const colorInt = rgbHexToInt("#171324");
        this.ctx.fillStyle = `rgb(${colorInt[0]} ${colorInt[1]} ${colorInt[2]} / 100%)`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ball.move(ball_position.y * this.factorY, ball_position.x * this.factorX);
        this.paddle1.move(paddle_1_position.top * this.factorY);
        this.paddle2.move(paddle_2_position.top * this.factorY);
        
        this.paddle1.draw(this.ctx);
        this.paddle2.draw(this.ctx);
        drawText(this.ctx, player_1_score, this.width / 2 - this.width / 8, this.height / 8, 64 * this.factorX, "#1E526D");
        drawText(this.ctx, player_2_score, this.width / 2 + this.width / 8, this.height / 8, 64 * this.factorX, "#1E526D");
        setTimeout(() =>
            {
                const isWinner = localStorage.getItem("myid") === gameWinner;
                const message = isWinner ? "VICTORY" : "DEFEAT";
                const color = isWinner ? "blue" : "red";
                drawText(this.ctx, message, this.width / 2, this.height / 2, 128 * this.factorX, color);
            }
            , 2_000
        )
    }
}