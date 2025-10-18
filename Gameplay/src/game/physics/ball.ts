import BallPosition from "../domain/ball_position"
import PaddlePosition from "../domain/paddle_position"

function toRadians(angle: number) : number{
    return angle * (Math.PI / 180);
}

export default class Ball{
    screen_width: number
    screen_height: number
    max_angle: number
    x: number
    y: number
    r: number = 20
    ball_velocity_module: number
    dx: number
    dy: number
    dv: number
    constructor(screen_width: number, screen_height: number) {
        this.screen_width = screen_width;
        this.screen_height = screen_height;
        this.max_angle = 60
        this.x = screen_width / 2
        this.y = screen_height / 2
        this.ball_velocity_module = 5
        this.dx = Math.round(Math.random() * (this.ball_velocity_module - this.ball_velocity_module / 2) + this.ball_velocity_module / 2);
        this.dy = Math.sqrt(this.ball_velocity_module ** 2 - this.dx ** 2);
        this.dv = 0.1
    }
    get_position() : BallPosition
    {
        return new BallPosition(this.x, this.y);
    }
    is_paddle_colliding(paddle_pos: PaddlePosition) : boolean
    {
        if ((paddle_pos.top < this.y) && (this.y < paddle_pos.top + paddle_pos.height))
        {
            if ((paddle_pos.x < this.x) && (paddle_pos.x + paddle_pos.width > this.x))
                return true
        }
        return false
    }
    update(paddle_1_pos: PaddlePosition, paddle_2_pos: PaddlePosition) : BallPosition{
        this.x += this.dx
        this.y += this.dy
        if (this.y < 0 || this.y > this.screen_height)
            this.dy = -this.dy
        if (this.is_paddle_colliding(paddle_1_pos))
            this._calculate_paddle_hit(paddle_1_pos)
        if (this.is_paddle_colliding(paddle_2_pos))
        {
            this._calculate_paddle_hit(paddle_2_pos)
            this.dx = -this.dx
        }
        return this.get_position()
    }
    _calculate_paddle_hit(paddle_pos: PaddlePosition) : void
    {
        let paddle_middle_point = paddle_pos.top + paddle_pos.height / 2
        let relative_position = ((this.y - paddle_middle_point) / (paddle_pos.height / 2))
        let relative_angle = relative_position * this.max_angle
        this.ball_velocity_module += this.dv
        this.dx = this.ball_velocity_module * Math.cos(toRadians(relative_angle))
        this.dy = this.ball_velocity_module * Math.sin(toRadians(relative_angle))
    }
}