
function SkiaMaskElement(data,element){
    this.data = data;
    this.element = element;
    this.masksProperties = this.data.masksProperties || [];
    this.viewData = createSizedArray(this.masksProperties.length);
    var i, len = this.masksProperties.length, hasMasks = false;
    for (i = 0; i < len; i++) {
        if(this.masksProperties[i].mode !== 'n'){
            hasMasks = true;
        }
        this.viewData[i] = ShapePropertyFactory.getShapeProp(this.element,this.masksProperties[i],3);
    }
    this.hasMasks = hasMasks;
    if(hasMasks) {
        this.element.addRenderableComponent(this);
    }
}

SkiaMaskElement.prototype.renderFrame = function () {
    if(!this.hasMasks){
        return;
    }
    var transform = this.element.finalTransform.mat;
    var i, len = this.masksProperties.length;
    var pt,pts,data;
    var CK = SKIA.CanvasKit();
    const path = new CK.SkPath();
    for (i = 0; i < len; i++) {
        if(this.masksProperties[i].mode !== 'n'){
            if (this.masksProperties[i].inv) {
                path.moveTo(0, 0);
                path.lineTo(this.element.globalData.compSize.w, 0);
                path.lineTo(this.element.globalData.compSize.w, this.element.globalData.compSize.h);
                path.lineTo(0, this.element.globalData.compSize.h);
                path.lineTo(0, 0);
            }
            data = this.viewData[i].v;
            pt = transform.applyToPointArray(data.v[0][0],data.v[0][1],0);
            path.moveTo(pt[0], pt[1]);
            var j, jLen = data._length;
            for (j = 1; j < jLen; j++) {
                pts = transform.applyToTriplePoints(data.o[j - 1], data.i[j], data.v[j]);
                path.cubicTo(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
            }
            pts = transform.applyToTriplePoints(data.o[j - 1], data.i[0], data.v[0]);
            path.cubicTo(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
        }
    }
    this.element.globalData.renderer.save(true);
    this.skcanvas.clipPath(path,SKIA.CanvasKit().ClipOp.Intersect,true);
    path.delete();
};

SkiaMaskElement.prototype.getMaskProperty = MaskElement.prototype.getMaskProperty;

SkiaMaskElement.prototype.destroy = function(){
    this.element = null;
};