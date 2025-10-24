export default class Rectangle{
    x : number
    y : number
    width : number
    height : number
    color: string
    constructor(x : number, y : number, width: number, height: number, color: string){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }
    move(y : number, height: number | null, x: number | null = null){
        this.y = y;
        this.x = x ?? this.x;
        this.height = height?? this.height;
    }
    draw(ctx: CanvasRenderingContext2D){
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height)
    }
}