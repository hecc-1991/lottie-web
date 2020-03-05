function SkiaSolidElement(data, globalData, comp) {
    this.initElement(data,globalData,comp);
}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaSolidElement);

SkiaSolidElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaSolidElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;


SkiaSolidElement.prototype.renderInnerContent = function() {

    //skia solid render
    const paint = new this.canvasKit.SkPaint();
    paint.setColor(ColorUtil.parseColor(this.canvasKit,this.data.sc));
    paint.setStyle(this.canvasKit.PaintStyle.Fill);
    paint.setAntiAlias(true);
    this.skcanvas.drawRect(this.canvasKit.XYWHRect(0, 0, this.data.sw, this.data.sh), paint);
};