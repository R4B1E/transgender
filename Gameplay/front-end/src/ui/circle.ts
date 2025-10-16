export default class Circle{
    x : number
    y : number
    r : number
    color : string
    constructor(x: number, y : number, r : number, color: string)
    {
        this.color = color
        this.x = x;
        this.y = y;
        this.r = r;
    }
    move(x : number, y : number) : void{
        this.x = x;
        this.y = y;
    }
    draw(ctx: CanvasRenderingContext2D)
    {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}