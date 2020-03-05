function SkiaSolidElement(data, globalData, comp) {
    this.initElement(data,globalData,comp);
}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaSolidElement);

SkiaSolidElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaSolidElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;


SkiaSolidElement.prototype.renderInnerContent = function() {
    

    //skia solid render
    // 待完善
    // ctx.fillStyle = this.data.sc;
    const paint = new this.canvasKitSkPaint();
    paint.setStyle(CanvasKit.PaintStyle.Fill);
    this.skcanvas.drawRect(this.canvasKit.XYWHRect(0, 0, this.data.sw, this.data.sh), paint);
};