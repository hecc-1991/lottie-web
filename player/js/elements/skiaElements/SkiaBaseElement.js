function SkiaBaseElement(){
}

SkiaBaseElement.prototype = {
    createElements: function(){},
    initRendererElement: function(){},
    createContainerElements: function(){
        this.skcanvas = this.globalData.skcanvas;
        this.renderableEffectsManager = new SkiaEffects(this);
    },
    createContent: function(){},
    setBlendMode: function(){
        var globalData = this.globalData;
        if(globalData.blendMode !== this.data.bm) {
            globalData.blendMode = this.data.bm;
            var blendModeValue = getBlendMode(this.data.bm);
            // 混合模式，功能待添加
            //globalData.canvasContext.globalCompositeOperation = blendModeValue;
            globalData.blendModeValue = blendModeValue;
        }
    },
    createRenderableComponents: function(){
        this.maskManager = new SkiaMaskElement(this.data, this);
    },
    hideElement: function(){
        if (!this.hidden && (!this.isInRange || this.isTransparent)) {
            this.hidden = true;
        }
    },
    showElement: function(){
        if (this.isInRange && !this.isTransparent){
            this.hidden = false;
            this._isFirstFrame = true;
            this.maskManager._isFirstFrame = true;
        }
    },
    renderFrame: function() {
        if (this.hidden || this.data.hd) {
            return;
        }
        this.renderTransform();
        this.renderRenderable();
        this.setBlendMode();
        var forceRealStack = this.data.ty === 0;
        this.globalData.renderer.save(forceRealStack);
        this.globalData.renderer.ctxTransform(this.finalTransform.mat.props);
        this.globalData.renderer.ctxOpacity(this.finalTransform.mProp.o.v);
        this.renderInnerContent();
        this.globalData.renderer.restore(forceRealStack);
        if(this.maskManager.hasMasks) {
            this.globalData.renderer.restore(true);
        }
        if (this._isFirstFrame) {
            this._isFirstFrame = false;
        }
    },
    destroy: function(){
        this.canvasContext = null;
        this.data = null;
        this.globalData = null;
        this.maskManager.destroy();
    },
    mHelper: new Matrix()
};
SkiaBaseElement.prototype.hide = SkiaBaseElement.prototype.hideElement;
SkiaBaseElement.prototype.show = SkiaBaseElement.prototype.showElement;
