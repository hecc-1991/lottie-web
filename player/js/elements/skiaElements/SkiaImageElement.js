function SkiaImageElement(data, globalData, comp){
    this.assetData = globalData.getAssetData(data.refId);
    this.img = globalData.imageLoader.getImage(this.assetData);
    this.initElement(data,globalData,comp);
}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaImageElement);

SkiaImageElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaImageElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;

SkiaImageElement.prototype.createContent = function(){

    // 输入输出图片尺寸换算
    if (this.img.width && (this.assetData.w !== this.img.width || this.assetData.h !== this.img.height)) {

        const w = this.assetData.w;
        const h = this.assetData.h;
        var imgW = this.img.width;
        var imgH = this.img.height;
        var imgRel = imgW / imgH;
        var canvasRel = this.assetData.w/this.assetData.h;
        var widthCrop, heightCrop;
        var par = this.assetData.pr || this.globalData.renderConfig.imagePreserveAspectRatio;
        if((imgRel > canvasRel && par === 'xMidYMid slice') || (imgRel < canvasRel && par !== 'xMidYMid slice')) {
            heightCrop = imgH;
            widthCrop = heightCrop*canvasRel;
        } else {
            widthCrop = imgW;
            heightCrop = widthCrop/canvasRel;
        }
        this.srcRect = SKIA.CanvasKit().XYWHRect((imgW-widthCrop)/2,(imgH-heightCrop)/2,widthCrop,heightCrop);
        this.dstRect = SKIA.CanvasKit().XYWHRect(0,0,this.assetData.w,this.assetData.h);
    }

};

SkiaImageElement.prototype.renderInnerContent = function(parentMatrix){
    // 图片二进制数据 => skimage => skia绘制
    let skImg = SKIA.CanvasKit().MakeImageFromEncoded(this.img);

    if (this.srcRect && this.dstRect) {
        this.skcanvas.drawImageRect(skImg,srcRect,dstRect,null,false);
    }else{
        this.skcanvas.drawImage(skImg,0,0,null);
    }
};

SkiaImageElement.prototype.destroy = function(){
    this.img = null;
};