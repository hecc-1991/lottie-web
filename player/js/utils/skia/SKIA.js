/**
 * skia ==> CanvasKit 单例持有类，方便全局使用
 */
var SKIA = (function () {

    /**
     * 设置上下文环境
     * @param {} canvasKit 
     */
    function setCanvasKit(canvasKit){
        this.canvasKit = canvasKit;
    }

    /**
     * 获取上下文环境
     */
    function CanvasKit() {
        return this.canvasKit;
    }

    return {
        setCanvasKit : setCanvasKit,
        CanvasKit: CanvasKit
    };
}());