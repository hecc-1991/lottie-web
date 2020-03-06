function SkiaShapeElement(data, globalData, comp) {
    this.shapes = [];
    this.shapesData = data.shapes;
    this.stylesList = [];
    this.itemsData = [];
    this.prevViewData = [];
    this.shapeModifiers = [];
    this.processedElements = [];

    this.transformsManager = new ShapeTransformManager();
    this.initElement(data, globalData, comp);

    this.curPath = new this.canvasKit.SkPath();
    this.strokePaint = new this.canvasKit.SkPaint();
    this.fillPaint = new this.canvasKit.SkPaint();

    this._globalAlpha = 1;
    this._currentTransform = this.canvasKit.SkMatrix.identity();

    this._shadowColor = this.canvasKit.TRANSPARENT;
    this._shadowOffsetX = 0;
    this._shadowOffsetY = 0;

}

extendPrototype([BaseElement, TransformElement, SkiaBaseElement, IShapeElement, HierarchyElement, FrameElement, RenderableElement], SkiaShapeElement);

SkiaShapeElement.prototype.initElement = RenderableDOMElement.prototype.initElement;

SkiaShapeElement.prototype.transformHelper = { opacity: 1, _opMdf: false };

SkiaShapeElement.prototype.dashResetter = [];

SkiaShapeElement.prototype.createContent = function () {
    this.searchShapes(this.shapesData, this.itemsData, this.prevViewData, true, []);
};

SkiaShapeElement.prototype.createStyleElement = function (data, transforms) {
    var styleElem = {
        data: data,
        type: data.ty,
        preTransforms: this.transformsManager.addTransformSequence(transforms),
        transforms: [],
        elements: [],
        closed: data.hd === true
    };
    var elementData = {};
    if (data.ty == 'fl' || data.ty == 'st') {
        elementData.c = PropertyFactory.getProp(this, data.c, 1, 255, this);
        if (!elementData.c.k) {
            styleElem.co = 'rgb(' + bm_floor(elementData.c.v[0]) + ',' + bm_floor(elementData.c.v[1]) + ',' + bm_floor(elementData.c.v[2]) + ')';
        }
    } else if (data.ty === 'gf' || data.ty === 'gs') {
        elementData.s = PropertyFactory.getProp(this, data.s, 1, null, this);
        elementData.e = PropertyFactory.getProp(this, data.e, 1, null, this);
        elementData.h = PropertyFactory.getProp(this, data.h || { k: 0 }, 0, 0.01, this);
        elementData.a = PropertyFactory.getProp(this, data.a || { k: 0 }, 0, degToRads, this);
        elementData.g = new GradientProperty(this, data.g, this);
    }
    elementData.o = PropertyFactory.getProp(this, data.o, 0, 0.01, this);
    if (data.ty == 'st' || data.ty == 'gs') {
        styleElem.lc = this.lcEnum[data.lc] || 'round';
        styleElem.lj = this.ljEnum[data.lj] || 'round';
        if (data.lj == 1) {
            styleElem.ml = data.ml;
        }
        elementData.w = PropertyFactory.getProp(this, data.w, 0, null, this);
        if (!elementData.w.k) {
            styleElem.wi = elementData.w.v;
        }
        if (data.d) {
            var d = new DashProperty(this, data.d, 'canvas', this);
            elementData.d = d;
            if (!elementData.d.k) {
                styleElem.da = elementData.d.dashArray;
                styleElem.do = elementData.d.dashoffset[0];
            }
        }
    } else {
        styleElem.r = data.r === 2 ? 'evenodd' : 'nonzero';
    }
    this.stylesList.push(styleElem);
    elementData.style = styleElem;
    return elementData;
};

SkiaShapeElement.prototype.createGroupElement = function (data) {
    var elementData = {
        it: [],
        prevViewData: []
    };
    return elementData;
};

SkiaShapeElement.prototype.createTransformElement = function (data) {
    var elementData = {
        transform: {
            opacity: 1,
            _opMdf: false,
            key: this.transformsManager.getNewKey(),
            op: PropertyFactory.getProp(this, data.o, 0, 0.01, this),
            mProps: TransformPropertyFactory.getTransformProperty(this, data, this)
        }
    };
    return elementData;
};

SkiaShapeElement.prototype.createShapeElement = function (data) {
    var elementData = new CVShapeData(this, data, this.stylesList, this.transformsManager);

    this.shapes.push(elementData);
    this.addShapeToModifiers(elementData);
    return elementData;
};

SkiaShapeElement.prototype.reloadShapes = function () {
    this._isFirstFrame = true;
    var i, len = this.itemsData.length;
    for (i = 0; i < len; i += 1) {
        this.prevViewData[i] = this.itemsData[i];
    }
    this.searchShapes(this.shapesData, this.itemsData, this.prevViewData, true, []);
    len = this.dynamicProperties.length;
    for (i = 0; i < len; i += 1) {
        this.dynamicProperties[i].getValue();
    }
    this.renderModifiers();
    this.transformsManager.processSequences(this._isFirstFrame);
};

SkiaShapeElement.prototype.addTransformToStyleList = function (transform) {
    var i, len = this.stylesList.length;
    for (i = 0; i < len; i += 1) {
        if (!this.stylesList[i].closed) {
            this.stylesList[i].transforms.push(transform);
        }
    }
}

SkiaShapeElement.prototype.removeTransformFromStyleList = function () {
    var i, len = this.stylesList.length;
    for (i = 0; i < len; i += 1) {
        if (!this.stylesList[i].closed) {
            this.stylesList[i].transforms.pop();
        }
    }
}

SkiaShapeElement.prototype.closeStyles = function (styles) {
    var i, len = styles.length, j, jLen;
    for (i = 0; i < len; i += 1) {
        styles[i].closed = true;
    }
}

SkiaShapeElement.prototype.searchShapes = function (arr, itemsData, prevViewData, shouldRender, transforms) {
    var i, len = arr.length - 1;
    var j, jLen;
    var ownStyles = [], ownModifiers = [], processedPos, modifier, currentTransform;
    var ownTransforms = [].concat(transforms);
    for (i = len; i >= 0; i -= 1) {
        processedPos = this.searchProcessedElement(arr[i]);
        if (!processedPos) {
            arr[i]._shouldRender = shouldRender;
        } else {
            itemsData[i] = prevViewData[processedPos - 1];
        }
        if (arr[i].ty == 'fl' || arr[i].ty == 'st' || arr[i].ty == 'gf' || arr[i].ty == 'gs') {
            if (!processedPos) {
                itemsData[i] = this.createStyleElement(arr[i], ownTransforms);
            } else {
                itemsData[i].style.closed = false;
            }

            ownStyles.push(itemsData[i].style);
        } else if (arr[i].ty == 'gr') {
            if (!processedPos) {
                itemsData[i] = this.createGroupElement(arr[i]);
            } else {
                jLen = itemsData[i].it.length;
                for (j = 0; j < jLen; j += 1) {
                    itemsData[i].prevViewData[j] = itemsData[i].it[j];
                }
            }
            this.searchShapes(arr[i].it, itemsData[i].it, itemsData[i].prevViewData, shouldRender, ownTransforms);
        } else if (arr[i].ty == 'tr') {
            if (!processedPos) {
                currentTransform = this.createTransformElement(arr[i]);
                itemsData[i] = currentTransform;
            }
            ownTransforms.push(itemsData[i]);
            this.addTransformToStyleList(itemsData[i]);
        } else if (arr[i].ty == 'sh' || arr[i].ty == 'rc' || arr[i].ty == 'el' || arr[i].ty == 'sr') {
            if (!processedPos) {
                itemsData[i] = this.createShapeElement(arr[i]);
            }

        } else if (arr[i].ty == 'tm' || arr[i].ty == 'rd') {
            if (!processedPos) {
                modifier = ShapeModifiers.getModifier(arr[i].ty);
                modifier.init(this, arr[i]);
                itemsData[i] = modifier;
                this.shapeModifiers.push(modifier);
            } else {
                modifier = itemsData[i];
                modifier.closed = false;
            }
            ownModifiers.push(modifier);
        } else if (arr[i].ty == 'rp') {
            if (!processedPos) {
                modifier = ShapeModifiers.getModifier(arr[i].ty);
                itemsData[i] = modifier;
                modifier.init(this, arr, i, itemsData);
                this.shapeModifiers.push(modifier);
                shouldRender = false;
            } else {
                modifier = itemsData[i];
                modifier.closed = true;
            }
            ownModifiers.push(modifier);
        }
        this.addProcessedElement(arr[i], i + 1);
    }
    this.removeTransformFromStyleList();
    this.closeStyles(ownStyles);
    len = ownModifiers.length;
    for (i = 0; i < len; i += 1) {
        ownModifiers[i].closed = true;
    }
};

SkiaShapeElement.prototype.renderInnerContent = function () {
    this.transformHelper.opacity = 1;
    this.transformHelper._opMdf = false;
    this.renderModifiers();
    this.transformsManager.processSequences(this._isFirstFrame);
    this.renderShape(this.transformHelper, this.shapesData, this.itemsData, true);
};

SkiaShapeElement.prototype.renderShapeTransform = function (parentTransform, groupTransform) {
    var props, groupMatrix;
    if (parentTransform._opMdf || groupTransform.op._mdf || this._isFirstFrame) {
        groupTransform.opacity = parentTransform.opacity;
        groupTransform.opacity *= groupTransform.op.v;
        groupTransform._opMdf = true;
    }
};


/**
 * 创建画笔
 */
SkiaShapeElement.prototype.setStrokeStyle = function (strokeStyle, paint) {
    (!paint) && (paint = this.strokePaint);
    paint.setStyle(this.canvasKi.PaintStyle.Stroke);
    if (typeof strokeStyle === 'string') {
        var ss = ColorUtil.parseColor(this.canvasKit, fillStyle);
        var alphaColor = this.canvasKit.multiplyByAlpha(ss, this._globalAlpha);
        paint.setColor(alphaColor);
    } else if (strokeStyle._getShader) {
        // It's probably an effect.
        var shader = strokeStyle._getShader(this._currentTransform);
        paint.setColor(this.canvasKit.Color(0, 0, 0, this._globalAlpha));
        paint.setShader(shader);
    }
}

/**
 * 设置画笔宽
 */
SkiaShapeElement.prototype.setStrokeWidth = function (width, paint) {
    if (width <= 0 || !width) {
        // Spec says to ignore NaN/Inf/0/negative values
        return;
    }

    (!paint) && (paint = this.strokePaint);
    paint.setStrokeWidth(width);
}

/**
 * 设置画笔末端样式
 */
SkiaShapeElement.prototype.setStrokeCap = function (cap, paint) {
    (!paint) && (paint = this.strokePaint);
    switch (cap) {
        case 'butt':
            paint.setStrokeCap(this.canvasKit.StrokeCap.Butt);
            return;
        case 'round':
            paint.setStrokeCap(this.canvasKit.StrokeCap.Round);
            return;
        case 'square':
            paint.setStrokeCap(this.canvasKit.StrokeCap.Square);
            return;
    }
}

/**
 * 设置画笔转角
 */
SkiaShapeElement.prototype.setStrokeJoin = function (join, paint) {
    (!paint) && (paint = this.strokePaint);
    switch (join) {
        case 'miter':
            paint.setStrokeJoin(this.canvasKit.StrokeJoin.Miter);
            return;
        case 'round':
            paint.setStrokeJoin(this.canvasKit.StrokeJoin.Round);
            return;
        case 'bevel':
            paint.setStrokeJoin(this.canvasKit.StrokeJoin.Bevel);
            return;
    }
}

/**
 * 设置画笔斜接
 */
SkiaShapeElement.prototype.setStrokeMiter = function (limit, paint) {
    if (limit <= 0 || !limit) {
        // Spec says to ignore NaN/Inf/0/negative values
        return;
    }

    (!paint) && (paint = this.strokePaint);
    paint.setStrokeMiter(limit);
}

/**
 * 创建虚线
 */
SkiaShapeElement.prototype.setLineDash = function (dashes, lineDashOffset, paint) {
    for (var i = 0; i < dashes.length; i++) {
        if (!isFinite(dashes[i]) || dashes[i] < 0) {
            console.log('dash list must have positive, finite values');
            return;
        }
    }

    (!paint) && (paint = this.strokePaint);

    if (dashes.length % 2 === 1) {
        // as per the spec, concatenate 2 copies of dashes
        // to give it an even number of elements.
        Array.prototype.push.apply(dashes, dashes);
    }

    if (dashes.length) {
        var dashedEffect = this.canvasKit.MakeSkDashPathEffect(dashes, lineDashOffset);
        paint.setPathEffect(dashedEffect);
    }

    paint.dispose = function () {
        dashedEffect && dashedEffect.delete();
        this.delete();
    }

}

/**
 * 创建填充
 */
SkiaShapeElement.prototype.setFillStyle = function (fillStyle, paint) {
    (!paint) && (paint = this.fillPaint);
    paint.setStyle(this.canvasKit.PaintStyle.Fill);
    if (typeof fillStyle === 'string') {
        var fs = ColorUtil.parseColor(this.canvasKit, fillStyle);
        var alphaColor = this.canvasKit.multiplyByAlpha(fs, this._globalAlpha);
        paint.setColor(alphaColor);
    } else if (fillStyle._getShader) {
        // It's an effect that has a shader.
        var shader = fillStyle._getShader(this._currentTransform);
        paint.setColor(this.canvasKit.Color(0, 0, 0, this._globalAlpha));
        paint.setShader(shader);
    }

    paint.dispose = function () {
        // If there are some helper effects in the future, clean them up
        // here. In any case, we have .dispose() to make _fillPaint behave
        // like _strokePaint and _shadowPaint.
        this.delete();
    }
}

//----------------------------------------------------------------------------------------------------//

// Returns the matrix representing the offset of the shadows. This unapplies
// the effects of the scale, which should not affect the shadow offsets.
SkiaShapeElement.prototype._shadowOffsetMatrix = function () {
    var sx = this._currentTransform[0];
    var sy = this._currentTransform[4];
    return this.canvasKit.SkMatrix.translated(this._shadowOffsetX / sx, this._shadowOffsetY / sy);
}

SkiaShapeElement.prototype.SkBlurRadiusToSigma = function (radius) {
    // Blink (Chrome) does the following, for legacy reasons, even though it
    // is against the spec. https://bugs.chromium.org/p/chromium/issues/detail?id=179006
    // This may change in future releases.
    // This code is staying here in case any clients are interested in using it
    // to match Blink "exactly".
    // if (radius <= 0)
    //   return 0;
    // return 0.288675 * radius + 0.5;
    //
    // This is what the spec says, which is how Firefox and others operate.
    return radius / 2;
}

// Returns the shadow paint for the current settings or null if there
// should be no shadow. This ends up being a copy of the given
// paint with a blur maskfilter and the correct color.
SkiaShapeElement.prototype._shadowPaint = function (basePaint) {
    // multiply first to see if the alpha channel goes to 0 after multiplication.
    var alphaColor = this.canvasKit.multiplyByAlpha(this._shadowColor, this._globalAlpha);
    // if alpha is zero, no shadows
    if (!this.canvasKit.getColorComponents(alphaColor)[3]) {
        return null;
    }
    // one of these must also be non-zero (otherwise the shadow is
    // completely hidden.  And the spec says so).
    if (!(this._shadowBlur || this._shadowOffsetY || this._shadowOffsetX)) {
        return null;
    }
    var shadowPaint = basePaint.copy();
    shadowPaint.setColor(alphaColor);
    var blurEffect = this.canvasKit.SkMaskFilter.MakeBlur(this.canvasKit.BlurStyle.Normal,
        SkBlurRadiusToSigma(this._shadowBlur),
        false);
    shadowPaint.setMaskFilter(blurEffect);

    // hack up a "destructor" which also cleans up the blurEffect. Otherwise,
    // we leak the blurEffect (since smart pointers don't help us in JS land).
    shadowPaint.dispose = function () {
        blurEffect.delete();
        this.delete();
    };
    return shadowPaint;
}

//----------------------------------------------------------------------------------------------------//

/**
 * 填充操作
 */
SkiaShapeElement.prototype.fill = function (path, fillRule, paint) {
    if (typeof path === 'string') {
        // shift the args if a Path2D is supplied
        fillRule = path;
        path = this.curPath;
    } else if (path && path._getPath) {
        path = path._getPath();
    }
    if (fillRule === 'evenodd') {
        this.curPath.setFillType(this.canvasKit.FillType.EvenOdd);
    } else if (fillRule === 'nonzero' || !fillRule) {
        this.curPath.setFillType(this.canvasKit.FillType.Winding);
    } else {
        throw 'invalid fill rule';
    }
    if (!path) {
        path = this.curPath;
    }

    (!paint) && (paint = this.fillPaint);

    var shadowPaint = this._shadowPaint(paint);
    if (shadowPaint) {
        this.skcanvas.save();
        this.skcanvas.concat(this._shadowOffsetMatrix());
        this.skcanvas.drawPath(path, shadowPaint);
        this.skcanvas.restore();
        shadowPaint.dispose();
    }
    this.skcanvas.drawPath(path, paint);
    paint.dispose();
}

SkiaShapeElement.prototype.drawLayer = function () {
    var i, len = this.stylesList.length;
    var j, jLen, k, kLen, elems, nodes, renderer = this.globalData.renderer, ctx = this.globalData.canvasContext, type, currentStyle;
    for (i = 0; i < len; i += 1) {
        currentStyle = this.stylesList[i];
        type = currentStyle.type;

        //Skipping style when
        //Stroke width equals 0
        //style should not be rendered (extra unused repeaters)
        //current opacity equals 0
        //global opacity equals 0
        if (((type === 'st' || type === 'gs') && currentStyle.wi === 0) || !currentStyle.data._shouldRender || currentStyle.coOp === 0 || this.globalData.currentGlobalAlpha === 0) {
            continue;
        }
        renderer.save();
        elems = currentStyle.elements;

        if (type === 'st' || type === 'gs') {
            //ctx.strokeStyle
            this.setStrokeStyle(type === 'st' ? currentStyle.co : currentStyle.grd);
            //ctx.lineWidth
            paint.setStrokeWidth(currentStyle.wi);
            //ctx.lineCap
            this.setStrokeCap(paint, currentStyle.lc);
            //ctx.lineJoin
            this.setStrokeJoin(paint, currentStyle.lj);
            //ctx.miterLimit
            this.setStrokeMiter(paint, currentStyle.ml || 0);
        } else {
            //ctx.fillStyle
            this.setFillStyle(type === 'fl' ? currentStyle.co : currentStyle.grd);
        }
        renderer.ctxOpacity(currentStyle.coOp);
        if (type !== 'st' && type !== 'gs') {
            this.curPath.reset();
        }
        renderer.ctxTransform(currentStyle.preTransforms.finalTransform.props);
        jLen = elems.length;
        for (j = 0; j < jLen; j += 1) {
            if (type === 'st' || type === 'gs') {
                this.curPath.reset();
                if (currentStyle.da) {
                    //setLineDash lineDashOffset
                    this.setLineDash(currentStyle.da, currentStyle.do);
                }
            }
            nodes = elems[j].trNodes;
            kLen = nodes.length;

            for (k = 0; k < kLen; k += 1) {
                if (nodes[k].t == 'm') {
                    this.curPath.moveTo(nodes[k].p[0], nodes[k].p[1]);
                } else if (nodes[k].t == 'c') {
                    this.curPath.cubicTo(nodes[k].pts[0], nodes[k].pts[1], nodes[k].pts[2], nodes[k].pts[3], nodes[k].pts[4], nodes[k].pts[5]);
                } else {
                    this.curPath.close();
                }
            }
            if (type === 'st' || type === 'gs') {
                ctx.stroke();
                if (currentStyle.da) {
                    this.setLineDash(dashResetter, 0);
                }
            }
        }
        if (type !== 'st' && type !== 'gs') {
            this.fill(currentStyle.r);
        }
        renderer.restore();
    }
};

SkiaShapeElement.prototype.renderShape = function (parentTransform, items, data, isMain) {
    var i, len = items.length - 1;
    var groupTransform;
    groupTransform = parentTransform;
    for (i = len; i >= 0; i -= 1) {
        if (items[i].ty == 'tr') {
            groupTransform = data[i].transform;
            this.renderShapeTransform(parentTransform, groupTransform);
        } else if (items[i].ty == 'sh' || items[i].ty == 'el' || items[i].ty == 'rc' || items[i].ty == 'sr') {
            this.renderPath(items[i], data[i]);
        } else if (items[i].ty == 'fl') {
            this.renderFill(items[i], data[i], groupTransform);
        } else if (items[i].ty == 'st') {
            this.renderStroke(items[i], data[i], groupTransform);
        } else if (items[i].ty == 'gf' || items[i].ty == 'gs') {
            this.renderGradientFill(items[i], data[i], groupTransform);
        } else if (items[i].ty == 'gr') {
            this.renderShape(groupTransform, items[i].it, data[i].it);
        } else if (items[i].ty == 'tm') {
            //
        }
    }
    if (isMain) {
        this.drawLayer();
    }

};

SkiaShapeElement.prototype.renderStyledShape = function (styledShape, shape) {
    if (this._isFirstFrame || shape._mdf || styledShape.transforms._mdf) {
        var shapeNodes = styledShape.trNodes;
        var paths = shape.paths;
        var i, len, j, jLen = paths._length;
        shapeNodes.length = 0;
        var groupTransformMat = styledShape.transforms.finalTransform;
        for (j = 0; j < jLen; j += 1) {
            var pathNodes = paths.shapes[j];
            if (pathNodes && pathNodes.v) {
                len = pathNodes._length;
                for (i = 1; i < len; i += 1) {
                    if (i === 1) {
                        shapeNodes.push({
                            t: 'm',
                            p: groupTransformMat.applyToPointArray(pathNodes.v[0][0], pathNodes.v[0][1], 0)
                        });
                    }
                    shapeNodes.push({
                        t: 'c',
                        pts: groupTransformMat.applyToTriplePoints(pathNodes.o[i - 1], pathNodes.i[i], pathNodes.v[i])
                    });
                }
                if (len === 1) {
                    shapeNodes.push({
                        t: 'm',
                        p: groupTransformMat.applyToPointArray(pathNodes.v[0][0], pathNodes.v[0][1], 0)
                    });
                }
                if (pathNodes.c && len) {
                    shapeNodes.push({
                        t: 'c',
                        pts: groupTransformMat.applyToTriplePoints(pathNodes.o[i - 1], pathNodes.i[0], pathNodes.v[0])
                    });
                    shapeNodes.push({
                        t: 'z'
                    });
                }
            }
        }
        styledShape.trNodes = shapeNodes;
    }
}

SkiaShapeElement.prototype.renderPath = function (pathData, itemData) {
    if (pathData.hd !== true && pathData._shouldRender) {
        var i, len = itemData.styledShapes.length;
        for (i = 0; i < len; i += 1) {
            this.renderStyledShape(itemData.styledShapes[i], itemData.sh);
        }
    }
};

SkiaShapeElement.prototype.renderFill = function (styleData, itemData, groupTransform) {
    var styleElem = itemData.style;

    if (itemData.c._mdf || this._isFirstFrame) {
        styleElem.co = 'rgb('
            + bm_floor(itemData.c.v[0]) + ','
            + bm_floor(itemData.c.v[1]) + ','
            + bm_floor(itemData.c.v[2]) + ')';
    }
    if (itemData.o._mdf || groupTransform._opMdf || this._isFirstFrame) {
        styleElem.coOp = itemData.o.v * groupTransform.opacity;
    }
};

SkiaShapeElement.prototype.renderGradientFill = function (styleData, itemData, groupTransform) {
    var styleElem = itemData.style;
    if (!styleElem.grd || itemData.g._mdf || itemData.s._mdf || itemData.e._mdf || (styleData.t !== 1 && (itemData.h._mdf || itemData.a._mdf))) {
        var ctx = this.globalData.canvasContext;
        var grd;
        var pt1 = itemData.s.v, pt2 = itemData.e.v;
        if (styleData.t === 1) {
            grd = ctx.createLinearGradient(pt1[0], pt1[1], pt2[0], pt2[1]);
        } else {
            var rad = Math.sqrt(Math.pow(pt1[0] - pt2[0], 2) + Math.pow(pt1[1] - pt2[1], 2));
            var ang = Math.atan2(pt2[1] - pt1[1], pt2[0] - pt1[0]);

            var percent = itemData.h.v >= 1 ? 0.99 : itemData.h.v <= -1 ? -0.99 : itemData.h.v;
            var dist = rad * percent;
            var x = Math.cos(ang + itemData.a.v) * dist + pt1[0];
            var y = Math.sin(ang + itemData.a.v) * dist + pt1[1];
            var grd = ctx.createRadialGradient(x, y, 0, pt1[0], pt1[1], rad);
        }

        var i, len = styleData.g.p;
        var cValues = itemData.g.c;
        var opacity = 1;

        for (i = 0; i < len; i += 1) {
            if (itemData.g._hasOpacity && itemData.g._collapsable) {
                opacity = itemData.g.o[i * 2 + 1];
            }
            grd.addColorStop(cValues[i * 4] / 100, 'rgba(' + cValues[i * 4 + 1] + ',' + cValues[i * 4 + 2] + ',' + cValues[i * 4 + 3] + ',' + opacity + ')');
        }
        styleElem.grd = grd;
    }
    styleElem.coOp = itemData.o.v * groupTransform.opacity;

};

SkiaShapeElement.prototype.renderStroke = function (styleData, itemData, groupTransform) {
    var styleElem = itemData.style;
    var d = itemData.d;
    if (d && (d._mdf || this._isFirstFrame)) {
        styleElem.da = d.dashArray;
        styleElem.do = d.dashoffset[0];
    }
    if (itemData.c._mdf || this._isFirstFrame) {
        styleElem.co = 'rgb(' + bm_floor(itemData.c.v[0]) + ',' + bm_floor(itemData.c.v[1]) + ',' + bm_floor(itemData.c.v[2]) + ')';
    }
    if (itemData.o._mdf || groupTransform._opMdf || this._isFirstFrame) {
        styleElem.coOp = itemData.o.v * groupTransform.opacity;
    }
    if (itemData.w._mdf || this._isFirstFrame) {
        styleElem.wi = itemData.w.v;
    }
};


SkiaShapeElement.prototype.destroy = function () {
    this.shapesData = null;
    this.globalData = null;
    this.canvasContext = null;
    this.stylesList.length = 0;
    this.itemsData.length = 0;
};

