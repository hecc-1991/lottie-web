function SkiaVideoElement(data,globalData,comp) {
    this.videoData = globalData.getVideoData(data.refId);
    this.video = globalData.videoLoader.getVideo(this.videoData);
    this.initElement(data,globalData,comp);
}

extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement],SkiaVideoElement);

SkiaVideoElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaVideoElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;

SkiaVideoElement.prototype.createContent = function () {
    
}

SkiaVideoElement.prototype.renderInnerContent = function (parentMatrix) {
    
}

SkiaVideoElement.prototype.destroy = function () {
    
}