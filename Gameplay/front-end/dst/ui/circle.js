export default class Circle {
    x;
    y;
    r;
    color;
    constructor(x, y, r, color) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.r = r;
    }
    move(x, y) {
        this.x = x;
        this.y = y;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}
//# sourceMappingURL=circle.js.map