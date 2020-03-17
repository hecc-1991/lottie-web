function SkiaVideoElement(data, globalData, comp) {
    this.videoData = globalData.getVideoData(data.refId);
    this.video = globalData.videoLoader.getVideo(this.videoData);
    this.initElement(data, globalData, comp);
}

extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaVideoElement);

SkiaVideoElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaVideoElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;

SkiaVideoElement.prototype.createContent = function () {
    /* var req = {
        type: 'next',
        args: {
            time: -1
        }
    }
    this.video.videoReaderWorker.postMessage(req); */
}

SkiaVideoElement.prototype.renderInnerContent = function (parentMatrix) {
    console.log('render video');
    if (this.video.frame) {
        console.log(this.video);

        // 视频帧brga => skimage => skia绘制
        var frame = new Uint8Array(this.video.frame);
        let skImg = SKIA.CanvasKit().MakeImage(frame,
            this.videoData.w, this.videoData.h,
            SKIA.CanvasKit().AlphaType.Unpremul,
            SKIA.CanvasKit().ColorType.BGRA_8888);
        this.skcanvas.drawImage(skImg, 0, 0, null);

        var req = {
            type: 'next',
            args: {
                time: -1
            }
        }
        this.video.videoReaderWorker.postMessage(req);
    }
}

SkiaVideoElement.prototype.destroy = function () {

}