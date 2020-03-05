function SkiaCanvasRenderer(animationItem, canvasKit, config) {
    this.canvasKit = canvasKit;
    this.animationItem = animationItem;
    this.renderConfig = {
        clearCanvas: (config && config.clearCanvas !== undefined) ? config.clearCanvas : true,
        context: (config && config.context) || null,
        progressiveLoad: (config && config.progressiveLoad) || false,
        preserveAspectRatio: (config && config.preserveAspectRatio) || 'xMidYMid meet',
        imagePreserveAspectRatio: (config && config.imagePreserveAspectRatio) || 'xMidYMid slice',
        className: (config && config.className) || '',
        id: (config && config.id) || '',
    };
    this.renderConfig.dpr = (config && config.dpr) || 1;
    if (this.animationItem.wrapper) {
        this.renderConfig.dpr = (config && config.dpr) || window.devicePixelRatio || 1;
    }
    this.renderedFrame = -1;
    this.globalData = {
        frameNum: -1,
        _mdf: false,
        renderConfig: this.renderConfig,
        currentGlobalAlpha: -1
    };
    this.contextData = new CVContextData();
    this.elements = [];
    this.pendingElements = [];
    this.transformMat = new Matrix();
    this.completeLayers = false;
    this.rendererType = 'skiacanvas';
}
extendPrototype([BaseRenderer], SkiaCanvasRenderer);

SkiaCanvasRenderer.prototype.createShape = function (data) {
    return new CVShapeElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createText = function (data) {
    return new CVTextElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createImage = function (data) {
    return new CVImageElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createComp = function (data) {
    return new CVCompElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createSolid = function (data) {
    return new CVSolidElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createNull = SVGRenderer.prototype.createNull;

/* 
替换绘图的当前转换矩阵
a	c	e
b	d	f
0	0	1
a	水平缩放绘图。
b	水平倾斜绘图。
c	垂直倾斜绘图。
d	垂直缩放绘图。
e	水平移动绘图。
f	垂直移动绘图。
 */
SkiaCanvasRenderer.prototype.transform = function (a, b, c, d, e, f) {
    const mat33 = [
        a, c, e,
        b, d, f,
        0, 0, 1];
    this.skcanvas.concat(mat33);
};

// 检查数字数组是否有效
SkiaCanvasRenderer.prototype.checkNumer = function (arr) {
    for (var b = 0; b < arr.length; b++)
        if (void 0 !== arr[b] && !Number.isFinite(arr[b]))
            return false;
    return true;
}

// 将当前转换重置为单位矩阵。
SkiaCanvasRenderer.prototype.resetTransform = function () {
    let mat = this.skcanvas.getTotalMatrix();
    mat = this.canvasKit.SkMatrix.invert(mat);
    this.skcanvas.concat(mat);
};

/* 
将当前转换重置为单位矩阵。然后运行 transform()。
a	c	e
b	d	f
0	0	1
a	水平缩放绘图。
b	水平倾斜绘图。
c	垂直倾斜绘图。
d	垂直缩放绘图。
e	水平移动绘图。
f	垂直移动绘图。
 */
SkiaCanvasRenderer.prototype.setTransform = function (a, b, c, d, e, f) {
    this.checkNumer(arguments) && (
        this.resetTransform(),
        this.transform(a, b, c, d, e, f));
};

SkiaCanvasRenderer.prototype.ctxTransform = function (props) {
    if (props[0] === 1 && props[1] === 0 && props[4] === 0 && props[5] === 1 && props[12] === 0 && props[13] === 0) {
        return;
    }
    if (!this.renderConfig.clearCanvas) {
        this.transform(props[0], props[1], props[4], props[5], props[12], props[13]);
        return;
    }
    this.transformMat.cloneFromProps(props);
    var cProps = this.contextData.cTr.props;
    this.transformMat.transform(cProps[0], cProps[1], cProps[2], cProps[3], cProps[4], cProps[5], cProps[6], cProps[7], cProps[8], cProps[9], cProps[10], cProps[11], cProps[12], cProps[13], cProps[14], cProps[15]);
    //this.contextData.cTr.transform(props[0],props[1],props[2],props[3],props[4],props[5],props[6],props[7],props[8],props[9],props[10],props[11],props[12],props[13],props[14],props[15]);
    this.contextData.cTr.cloneFromProps(this.transformMat.props);
    var trProps = this.contextData.cTr.props;
    this.setTransform(trProps[0], trProps[1], trProps[4], trProps[5], trProps[12], trProps[13]);
};

SkiaCanvasRenderer.prototype.ctxOpacity = function (op) {
    /*if(op === 1){
        return;
    }*/
    if (!this.renderConfig.clearCanvas) {
        //this.canvasContext.globalAlpha *= op < 0 ? 0 : op;
        this.globalData.currentGlobalAlpha = this.contextData.cO;
        return;
    }
    this.contextData.cO *= op < 0 ? 0 : op;
    if (this.globalData.currentGlobalAlpha !== this.contextData.cO) {
        //this.canvasContext.globalAlpha = this.contextData.cO;
        this.globalData.currentGlobalAlpha = this.contextData.cO;
    }
};

SkiaCanvasRenderer.prototype.reset = function () {
    if (!this.renderConfig.clearCanvas) {
        this.skcanvas.restore();
        return;
    }
    this.contextData.reset();
};

SkiaCanvasRenderer.prototype.save = function (actionFlag) {
    if (!this.renderConfig.clearCanvas) {
        this.skcanvas.save();
        return;
    }
    if (actionFlag) {
        this.skcanvas.save();
    }
    var props = this.contextData.cTr.props;
    if (this.contextData._length <= this.contextData.cArrPos) {
        this.contextData.duplicate();
    }
    var i, arr = this.contextData.saved[this.contextData.cArrPos];
    for (i = 0; i < 16; i += 1) {
        arr[i] = props[i];
    }
    this.contextData.savedOp[this.contextData.cArrPos] = this.contextData.cO;
    this.contextData.cArrPos += 1;
};

SkiaCanvasRenderer.prototype.restore = function (actionFlag) {
    if (!this.renderConfig.clearCanvas) {
        this.skcanvas.restore();
        return;
    }
    if (actionFlag) {
        this.skcanvas.restore();
        this.globalData.blendMode = 'source-over';
    }
    this.contextData.cArrPos -= 1;
    var popped = this.contextData.saved[this.contextData.cArrPos];
    var i, arr = this.contextData.cTr.props;
    for (i = 0; i < 16; i += 1) {
        arr[i] = popped[i];
    }
    this.setTransform(popped[0], popped[1], popped[4], popped[5], popped[12], popped[13]);
    popped = this.contextData.savedOp[this.contextData.cArrPos];
    this.contextData.cO = popped;
    if (this.globalData.currentGlobalAlpha !== popped) {
        //this.canvasContext.globalAlpha = popped;
        this.globalData.currentGlobalAlpha = popped;
    }
};

SkiaCanvasRenderer.prototype.configAnimation = function (animData) {
    if (this.animationItem.wrapper) {
        this.animationItem.container = createTag('canvas');
        this.animationItem.container.style.width = '100%';
        this.animationItem.container.style.height = '100%';
        //this.animationItem.container.style.transform = 'translate3d(0,0,0)';
        //this.animationItem.container.style.webkitTransform = 'translate3d(0,0,0)';
        this.animationItem.container.style.transformOrigin = this.animationItem.container.style.mozTransformOrigin = this.animationItem.container.style.webkitTransformOrigin = this.animationItem.container.style['-webkit-transform'] = "0px 0px 0px";
        this.animationItem.wrapper.appendChild(this.animationItem.container);
        if (this.renderConfig.className) {
            this.animationItem.container.setAttribute('class', this.renderConfig.className);
        }
        if (this.renderConfig.id) {
            this.animationItem.container.setAttribute('id', this.renderConfig.id);
        } else {
            this.animationItem.container.setAttribute('id', 'skia');
        }

        this.surface = this.canvasKit.MakeCanvasSurface(this.animationItem.container.id);
        if (!(this.surface)) {
            throw 'Could not make surface';
        }
        this.skcanvas = this.surface.getCanvas();

    } else {
        //this.canvasContext = this.renderConfig.context;
    }
    this.data = animData;
    this.layers = animData.layers;
    this.transformCanvas = {
        w: animData.w,
        h: animData.h,
        sx: 0,
        sy: 0,
        tx: 0,
        ty: 0
    };
    this.setupGlobalData(animData, document.body);
    this.globalData.skcanvas = this.skcanvas;
    this.globalData.renderer = this;
    this.globalData.isDashed = false;
    this.globalData.progressiveLoad = this.renderConfig.progressiveLoad;
    this.globalData.transformCanvas = this.transformCanvas;
    this.elements = createSizedArray(animData.layers.length);

    this.updateContainerSize();
};

SkiaCanvasRenderer.prototype.updateContainerSize = function () {
    this.reset();
    var elementWidth, elementHeight;
    if (this.animationItem.wrapper && this.animationItem.container) {
        elementWidth = this.animationItem.wrapper.offsetWidth;
        elementHeight = this.animationItem.wrapper.offsetHeight;
        this.animationItem.container.setAttribute('width', elementWidth * this.renderConfig.dpr);
        this.animationItem.container.setAttribute('height', elementHeight * this.renderConfig.dpr);
    } else {
        elementWidth = this.surface.width * this.renderConfig.dpr;
        elementHeight = this.surface.height * this.renderConfig.dpr;
    }
    var elementRel, animationRel;
    if (this.renderConfig.preserveAspectRatio.indexOf('meet') !== -1 || this.renderConfig.preserveAspectRatio.indexOf('slice') !== -1) {
        var par = this.renderConfig.preserveAspectRatio.split(' ');
        var fillType = par[1] || 'meet';
        var pos = par[0] || 'xMidYMid';
        var xPos = pos.substr(0, 4);
        var yPos = pos.substr(4);
        elementRel = elementWidth / elementHeight;
        animationRel = this.transformCanvas.w / this.transformCanvas.h;
        if (animationRel > elementRel && fillType === 'meet' || animationRel < elementRel && fillType === 'slice') {
            this.transformCanvas.sx = elementWidth / (this.transformCanvas.w / this.renderConfig.dpr);
            this.transformCanvas.sy = elementWidth / (this.transformCanvas.w / this.renderConfig.dpr);
        } else {
            this.transformCanvas.sx = elementHeight / (this.transformCanvas.h / this.renderConfig.dpr);
            this.transformCanvas.sy = elementHeight / (this.transformCanvas.h / this.renderConfig.dpr);
        }

        if (xPos === 'xMid' && ((animationRel < elementRel && fillType === 'meet') || (animationRel > elementRel && fillType === 'slice'))) {
            this.transformCanvas.tx = (elementWidth - this.transformCanvas.w * (elementHeight / this.transformCanvas.h)) / 2 * this.renderConfig.dpr;
        } else if (xPos === 'xMax' && ((animationRel < elementRel && fillType === 'meet') || (animationRel > elementRel && fillType === 'slice'))) {
            this.transformCanvas.tx = (elementWidth - this.transformCanvas.w * (elementHeight / this.transformCanvas.h)) * this.renderConfig.dpr;
        } else {
            this.transformCanvas.tx = 0;
        }
        if (yPos === 'YMid' && ((animationRel > elementRel && fillType === 'meet') || (animationRel < elementRel && fillType === 'slice'))) {
            this.transformCanvas.ty = ((elementHeight - this.transformCanvas.h * (elementWidth / this.transformCanvas.w)) / 2) * this.renderConfig.dpr;
        } else if (yPos === 'YMax' && ((animationRel > elementRel && fillType === 'meet') || (animationRel < elementRel && fillType === 'slice'))) {
            this.transformCanvas.ty = ((elementHeight - this.transformCanvas.h * (elementWidth / this.transformCanvas.w))) * this.renderConfig.dpr;
        } else {
            this.transformCanvas.ty = 0;
        }

    } else if (this.renderConfig.preserveAspectRatio == 'none') {
        this.transformCanvas.sx = elementWidth / (this.transformCanvas.w / this.renderConfig.dpr);
        this.transformCanvas.sy = elementHeight / (this.transformCanvas.h / this.renderConfig.dpr);
        this.transformCanvas.tx = 0;
        this.transformCanvas.ty = 0;
    } else {
        this.transformCanvas.sx = this.renderConfig.dpr;
        this.transformCanvas.sy = this.renderConfig.dpr;
        this.transformCanvas.tx = 0;
        this.transformCanvas.ty = 0;
    }
    this.transformCanvas.props = [this.transformCanvas.sx, 0, 0, 0, 0, this.transformCanvas.sy, 0, 0, 0, 0, 1, 0, this.transformCanvas.tx, this.transformCanvas.ty, 0, 1];
    /*var i, len = this.elements.length;
    for(i=0;i<len;i+=1){
        if(this.elements[i] && this.elements[i].data.ty === 0){
            this.elements[i].resize(this.globalData.transformCanvas);
        }
    }*/
    this.ctxTransform(this.transformCanvas.props);

    this.skcanvas.clipRect(this.canvasKit.XYWHRect(30, 30, 200, 200), this.canvasKit.ClipOp.Intersect, true);

    this.renderFrame(this.renderedFrame, true);
};

SkiaCanvasRenderer.prototype.destroy = function () {
    if (this.renderConfig.clearCanvas) {
        this.animationItem.wrapper.innerHTML = '';
    }
    var i, len = this.layers ? this.layers.length : 0;
    for (i = len - 1; i >= 0; i -= 1) {
        if (this.elements[i]) {
            this.elements[i].destroy();
        }
    }
    this.elements.length = 0;
    this.globalData.skcanvas = null;
    this.animationItem.container = null;
    this.destroyed = true;
};

// 在给定的矩形内清除指定的像素
SkiaCanvasRenderer.prototype.clearRect = function (x, y, width, height) {
    const paint = new this.canvasKit.SkPaint();
    paint.setStyle(this.canvasKit.PaintStyle.Fill);
    paint.setBlendMode(this.canvasKit.BlendMode.Clear);
    this.skcanvas.drawRect(this.canvasKit.XYWHRect(x, y, width, height), paint);
}

SkiaCanvasRenderer.prototype.renderFrame = function (num, forceRender) {
    if ((this.renderedFrame === num && this.renderConfig.clearCanvas === true && !forceRender) || this.destroyed || num === -1) {
        return;
    }
    this.renderedFrame = num;
    this.globalData.frameNum = num - this.animationItem._isFirstFrame;
    this.globalData.frameId += 1;
    this.globalData._mdf = !this.renderConfig.clearCanvas || forceRender;
    this.globalData.projectInterface.currentFrame = num;

    // console.log('--------');
    // console.log('NEW: ',num);
    var i, len = this.layers.length;
    if (!this.completeLayers) {
        this.checkLayers(num);
    }

    for (i = 0; i < len; i++) {
        if (this.completeLayers || this.elements[i]) {
            this.elements[i].prepareFrame(num - this.layers[i].st);
        }
    }
    if (this.globalData._mdf) {
        if (this.renderConfig.clearCanvas === true) {
            this.clearRect(0, 0, this.transformCanvas.w, this.transformCanvas.h);
        } else {
            this.save();
        }
        for (i = len - 1; i >= 0; i -= 1) {
            if (this.completeLayers || this.elements[i]) {
                this.elements[i].renderFrame();
            }
        }
        if (this.renderConfig.clearCanvas !== true) {
            this.restore();
        }
    }
};

SkiaCanvasRenderer.prototype.buildItem = function (pos) {
    var elements = this.elements;
    if (elements[pos] || this.layers[pos].ty == 99) {
        return;
    }
    var element = this.createItem(this.layers[pos], this, this.globalData);
    elements[pos] = element;
    element.initExpressions();
    /*if(this.layers[pos].ty === 0){
        element.resize(this.globalData.transformCanvas);
    }*/
};

SkiaCanvasRenderer.prototype.checkPendingElements = function () {
    while (this.pendingElements.length) {
        var element = this.pendingElements.pop();
        element.checkParenting();
    }
};

SkiaCanvasRenderer.prototype.hide = function () {
    this.animationItem.container.style.display = 'none';
};

SkiaCanvasRenderer.prototype.show = function () {
    this.animationItem.container.style.display = 'block';
};
