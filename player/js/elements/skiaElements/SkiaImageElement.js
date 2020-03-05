function SkiaImageElement(data, globalData, comp){
    this.assetData = globalData.getAssetData(data.refId);
    this.img = globalData.imageLoader.getImage(this.assetData);
    this.initElement(data,globalData,comp);
}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaImageElement);

SkiaImageElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaImageElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;

SkiaImageElement.prototype.createContent = function(){

    if (this.img.width && (this.assetData.w !== this.img.width || this.assetData.h !== this.img.height)) {

        // skia img render
        const w = this.assetData.w;
        const h = this.assetData.h;
        let canvas = this.canvasKit.MakeCanvas(w,h);
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
        canvas.drawImage(this.img,(imgW-widthCrop)/2,(imgH-heightCrop)/2,widthCrop,heightCrop,0,0,this.assetData.w,this.assetData.h);
        this.img.src = canvas.toDataURL();
    }

};

SkiaImageElement.prototype.renderInnerContent = function(parentMatrix){
    this.skcanvas.drawImage(this.img,0,0,null);
};

SkiaImageElement.prototype.destroy = function(){
    this.img = null;
};