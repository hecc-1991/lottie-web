function SkiaCompElement(data, globalData, comp) {
    this.completeLayers = false;
    this.layers = data.layers;
    this.pendingElements = [];
    this.elements = createSizedArray(this.layers.length);
    this.initElement(data, globalData, comp);
    this.tm = data.tm ? PropertyFactory.getProp(this,data.tm,0,globalData.frameRate, this) : {_placeholder:true};
}

extendPrototype([SkiaCanvasRenderer, ICompElement, SkiaBaseElement], SkiaCompElement);

SkiaCompElement.prototype.renderInnerContent = function() {
    var CK = SKIA.CanvasKit();
    const path =new CK.SkPath();
    path.moveTo(0,0);
    path.lineTo(this.data.w,0);
    path.lineTo(this.data.w, this.data.h);
    path.lineTo(0, this.data.h);
    path.lineTo(0,0);
    this.skcanvas.clipPath(path,SKIA.CanvasKit().ClipOp.Intersect,true);
    var i,len = this.layers.length;
    for( i = len - 1; i >= 0; i -= 1 ){
        if(this.completeLayers || this.elements[i]){
            this.elements[i].renderFrame();
        }
    }
};

SkiaCompElement.prototype.destroy = function(){
    var i,len = this.layers.length;
    for( i = len - 1; i >= 0; i -= 1 ){
        if(this.elements[i]) {
            this.elements[i].destroy();
        }
    }
    this.layers = null;
    this.elements = null;
};