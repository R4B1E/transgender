export default class Rectangle {
    x;
    y;
    width;
    height;
    color;
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }
    move(y, height) {
        this.y = y;
        this.height = height;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
//# sourceMappingURL=rectangle.js.map