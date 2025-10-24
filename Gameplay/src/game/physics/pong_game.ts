import PaddlePosition from "../domain/paddle_position"
import type BallPosition from "../domain/ball_position"
import Ball from "./ball"
import Paddle from "./paddle"
import { MovePaddle } from "./move_paddle"

type MixedList = (number | PaddlePosition | BallPosition)[];

export default class PongGame {
    screen_width : number = 1920
    screen_height : number = 1080
    ball : Ball
    paddle1 : Paddle
    paddle2 : Paddle
    constructor()
    {
        this.ball = new Ball(this.screen_width, this.screen_height)
        this.paddle1 = new Paddle(this.screen_width, this.screen_height, true);
        this.paddle2 = new Paddle(this.screen_width, this.screen_height, false);
    }
    update(player_1_move: MovePaddle, player_2_move: MovePaddle) : MixedList
    {
        if (player_1_move == MovePaddle.UP)
            this.paddle1.move_up();
        if (player_1_move == MovePaddle.DOWN)
            this.paddle1.move_down();
        if (player_2_move == MovePaddle.UP)
            this.paddle2.move_up();
        if (player_2_move == MovePaddle.DOWN)
            this.paddle2.move_down();

        let paddle_1_position = this.paddle1.get_position();
        let paddle_2_position = this.paddle2.get_position();

        let ball_position = this.ball.update(paddle_1_position, paddle_2_position);
        return [paddle_1_position, paddle_2_position, ball_position, this.is_point_for_player(ball_position)]
    }
    is_point_for_player(ball_position : BallPosition): number{
        if (ball_position.x < 0)
            return 2;
        if (ball_position.x > this.screen_width)
            return 1;
        return 0;
    }
    getStats()
    {
        return [this.paddle1.get_position(), this.paddle2.get_position(), this.ball.get_position()];
    }
}