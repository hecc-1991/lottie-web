function SkiaTextElement(data, globalData, comp) {
    this.textSpans = [];
    this.yOffset = 0;
    this.fillColorAnim = false;
    this.strokeColorAnim = false;
    this.strokeWidthAnim = false;
    this.stroke = false;
    this.fill = false;
    this.justifyOffset = 0;
    this.currentRender = null;
    this.renderType = 'canvas';
    this.values = {
        fill: 'rgba(0,0,0,0)',
        stroke: 'rgba(0,0,0,0)',
        sWidth: 0,
        fValue: ''
    };

    this.initElement(data, globalData, comp);

    //  获取字体
    var documentData = this.textProperty.currentData;
    var fontData = globalData.getFontData(documentData.f);
    var font = globalData.fontLoader.getFont(fontData);

    var CK = SKIA.CanvasKit();
    this.textFont = new CK.SkFont(font);
    this.textFont.setSize(documentData.s);

    this.textPaint = new CK.SkPaint();
    this.textPaint.setColor(ColorUtil.parseArray(documentData.fc));
}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement, ITextElement], SkiaTextElement);

SkiaTextElement.prototype.buildNewText = function () {

    return;
};

SkiaTextElement.prototype.renderInnerContent = function () {

    var documentData = this.textProperty.currentData;

    var text = documentData.t;
    var textLines = text.split(/[\r\n]/);
    const lineHight = documentData.lh;
    for (let i = 0; i < textLines.length; i++) {
        this.skcanvas.drawText(textLines[i], 0, i*lineHight, this.textPaint, this.textFont);
    }

    return;
};

SkiaTextElement.prototype.destroy = function () {
    this.textPaint.delete();
    this.textFont.delete();
};