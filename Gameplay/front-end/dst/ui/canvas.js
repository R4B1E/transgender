import Circle from "./circle.js";
import Rectangle from "./rectangle.js";
export default class Canvas {
    ball;
    paddle1;
    paddle2;
    ctx;
    width;
    height;
    constructor(document) {
        document.body.style.backgroundColor = 'black';
        const canvas = document.getElementById("canvas");
        this.ctx = canvas.getContext("2d");
        this.width = canvas.width = innerWidth * 0.7;
        this.height = canvas.height = innerHeight * 0.8;
        canvas.style.left = `${innerWidth / 2 - this.width / 2}px`;
        canvas.style.top = `${innerHeight / 2 - this.height / 2}px`;
        canvas.style.position = "absolute";
        this.ball = new Circle(this.width / 2, this.height / 2, 20, "black");
        this.paddle1 = new Rectangle(10, 4 * this.height / 10, 20, 2 * this.height / 10, "blue");
        this.paddle2 = new Rectangle(this.width - 30, 4 * this.height / 10, 20, 2 * this.height / 10, "red");
    }
    draw(paddle1_position, paddle2_position, ball_position, player1_score, player2_score) {
        this.ctx.fillStyle = "rgb(255 255 255 / 25%)";
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ball.move(ball_position.x, ball_position.y);
        this.paddle1.move(paddle1_position.top, paddle1_position.height);
        this.paddle2.move(paddle2_position.top, paddle2_position.height);
        this.ball.draw(this.ctx);
        this.paddle1.draw(this.ctx);
        this.paddle2.draw(this.ctx);
        // Display score and other information
    }
}
//# sourceMappingURL=canvas.js.map