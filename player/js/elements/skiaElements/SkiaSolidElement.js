function SkiaSolidElement(data, globalData, comp) {
    this.initElement(data,globalData,comp);
    this.paint = new this.canvasKit.SkPaint();
}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaSolidElement);

SkiaSolidElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaSolidElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;


SkiaSolidElement.prototype.renderInnerContent = function() {

    //skia solid render
    this.paint.setColor(ColorUtil.parseColor(this.canvasKit,this.data.sc));
    this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
    this.paint.setAntiAlias(true);
    this.skcanvas.drawRect(this.canvasKit.XYWHRect(0, 0, this.data.sw, this.data.sh),  this.paint);
};

SkiaSolidElement.prototype.destroy = function () {
    this.paint.delete();
};