import PaddlePosition from "../domain/paddle_position";

export default class Paddle {
    screen_width : number
    screen_height : number
    top : number
    width : number
    height : number
    x : number
    constructor(screen__width: number, screen_height: number, player1: boolean)
    {
        this.screen_width = screen__width;
        this.screen_height = screen_height;
        this.width = 30;
        this.height = 2 * screen_height / 10;
        this.top = 4 * screen_height / 10;
        
        if (player1)
            this.x = 10;
        else
            this.x = this.screen_width - this.width - 10;
    }
    move_up() : void{
        this.top = Math.max(0, this.top - 20);
    }
    move_down() : void{
        this.top = Math.min(this.screen_height - this.height, this.top + 20);
    }
    get_position() : PaddlePosition{
        return new PaddlePosition(this.x, this.top, this.width, this.height);
    }
}