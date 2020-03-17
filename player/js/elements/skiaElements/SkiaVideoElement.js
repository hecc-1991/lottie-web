function SkiaVideoElement(data, globalData, comp) {
    this.videoData = globalData.getVideoData(data.refId);
    this.video = globalData.videoLoader.getVideo(this.videoData);
    this.initElement(data, globalData, comp);
    this.currentProgress = -1;
}

extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaVideoElement);

SkiaVideoElement.prototype.initElement = SVGShapeElement.prototype.initElement;

SkiaVideoElement.prototype.createContent = function () {
}

SkiaVideoElement.prototype.prepareFrame = function (num) {


    if (this.currentProgress >= num) {
        console.log(`${this.videoData.id} seek 0 when looping`);
        this.video.videoReaderWorker.postMessage({
            type: 'seek',
            args: {
                timestamp: 0
            }
        });
    }

    this.currentProgress = num;

    this._mdf = false;
    this.prepareRenderableFrame(num);
    this.prepareProperties(num, this.isInRange);
    this.checkTransparency();
}

SkiaVideoElement.prototype.renderInnerContent = function (parentMatrix) {

    if (this.video.frame) {

        // 视频帧BGRA => skimage => skia绘制
        var frame = new Uint8Array(this.video.frame);
        let skImg = SKIA.CanvasKit().MakeImage(frame,
            this.videoData.w, this.videoData.h,
            SKIA.CanvasKit().AlphaType.Unpremul,
            SKIA.CanvasKit().ColorType.BGRA_8888);
        this.skcanvas.drawImage(skImg, 0, 0, null);
        skImg.delete();
        // 渲染完当前已有数据帧，发指令给 woker线程 去解码下一帧视频帧
        this.video.videoReaderWorker.postMessage({
            type: 'next',
            args: {
                time: -1
            }
        });
    }
}

SkiaVideoElement.prototype.destroy = function () {

}