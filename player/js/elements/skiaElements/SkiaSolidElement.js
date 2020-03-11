function SkiaSolidElement(data, globalData, comp) {
    this.initElement(data, globalData, comp);

    var CK = SKIA.CanvasKit();
    this.paint = new CK.SkPaint();

}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaSolidElement);

SkiaSolidElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaSolidElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;


SkiaSolidElement.prototype.renderInnerContent = function () {

    //skia solid render
    this.paint.setColor(ColorUtil.parseColor(this.data.sc));
    this.paint.setStyle(SKIA.CanvasKit().PaintStyle.Fill);
    this.paint.setAntiAlias(true);
    this.skcanvas.drawRect(SKIA.CanvasKit().XYWHRect(0, 0, this.data.sw, this.data.sh), this.paint);
};

SkiaSolidElement.prototype.destroy = function () {
    this.paint.delete();
};