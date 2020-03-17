(typeof navigator !== "undefined") && (function(root, factory) {
    if (typeof define === "function" && define.amd) {
        define(function() {
            return factory(root);
        });
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory(root);
    } else {
        root.lottie = factory(root);
        root.bodymovin = root.lottie;
    }
}((window || {}), function(window) {
	"use strict";
var svgNS = "http://www.w3.org/2000/svg";

var locationHref = '';

var initialDefaultFrame = -999999;

var subframeEnabled = true;
var expressionsPlugin;
var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
var cachedColors = {};
var bm_rounder = Math.round;
var bm_rnd;
var bm_pow = Math.pow;
var bm_sqrt = Math.sqrt;
var bm_abs = Math.abs;
var bm_floor = Math.floor;
var bm_max = Math.max;
var bm_min = Math.min;
var blitter = 10;

var BMMath = {};
(function(){
    var propertyNames = ["abs", "acos", "acosh", "asin", "asinh", "atan", "atanh", "atan2", "ceil", "cbrt", "expm1", "clz32", "cos", "cosh", "exp", "floor", "fround", "hypot", "imul", "log", "log1p", "log2", "log10", "max", "min", "pow", "random", "round", "sign", "sin", "sinh", "sqrt", "tan", "tanh", "trunc", "E", "LN10", "LN2", "LOG10E", "LOG2E", "PI", "SQRT1_2", "SQRT2"];
    var i, len = propertyNames.length;
    for(i=0;i<len;i+=1){
        BMMath[propertyNames[i]] = Math[propertyNames[i]];
    }
}());

function ProjectInterface(){return {};}

BMMath.random = Math.random;
BMMath.abs = function(val){
    var tOfVal = typeof val;
    if(tOfVal === 'object' && val.length){
        var absArr = createSizedArray(val.length);
        var i, len = val.length;
        for(i=0;i<len;i+=1){
            absArr[i] = Math.abs(val[i]);
        }
        return absArr;
    }
    return Math.abs(val);

};
var defaultCurveSegments = 150;
var degToRads = Math.PI/180;
var roundCorner = 0.5519;

function roundValues(flag){
    if(flag){
        bm_rnd = Math.round;
    }else{
        bm_rnd = function(val){
            return val;
        };
    }
}
roundValues(false);

function styleDiv(element){
    element.style.position = 'absolute';
    element.style.top = 0;
    element.style.left = 0;
    element.style.display = 'block';
    element.style.transformOrigin = element.style.webkitTransformOrigin = '0 0';
    element.style.backfaceVisibility  = element.style.webkitBackfaceVisibility = 'visible';
    element.style.transformStyle = element.style.webkitTransformStyle = element.style.mozTransformStyle = "preserve-3d";
}

function BMEnterFrameEvent(type, currentTime, totalTime, frameMultiplier){
    this.type = type;
    this.currentTime = currentTime;
    this.totalTime = totalTime;
    this.direction = frameMultiplier < 0 ? -1 : 1;
}

function BMCompleteEvent(type, frameMultiplier){
    this.type = type;
    this.direction = frameMultiplier < 0 ? -1 : 1;
}

function BMCompleteLoopEvent(type, totalLoops, currentLoop, frameMultiplier){
    this.type = type;
    this.currentLoop = currentLoop;
    this.totalLoops = totalLoops;
    this.direction = frameMultiplier < 0 ? -1 : 1;
}

function BMSegmentStartEvent(type, firstFrame, totalFrames){
    this.type = type;
    this.firstFrame = firstFrame;
    this.totalFrames = totalFrames;
}

function BMDestroyEvent(type, target){
    this.type = type;
    this.target = target;
}

function BMRenderFrameErrorEvent(nativeError, currentTime) {
    this.type = 'renderFrameError';
    this.nativeError = nativeError;
    this.currentTime = currentTime;
}

function BMConfigErrorEvent(nativeError) {
    this.type = 'configError';
    this.nativeError = nativeError;
}

function BMAnimationConfigErrorEvent(type, nativeError) {
    this.type = type;
    this.nativeError = nativeError;
    this.currentTime = currentTime;
}

var createElementID = (function(){
    var _count = 0;
    return function createID() {
        return '__lottie_element_' + ++_count
    }
}())

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return [ r,
        g,
         b ];
}

function RGBtoHSV(r, g, b) {
    var max = Math.max(r, g, b), min = Math.min(r, g, b),
        d = max - min,
        h,
        s = (max === 0 ? 0 : d / max),
        v = max / 255;

    switch (max) {
        case min: h = 0; break;
        case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
        case g: h = (b - r) + d * 2; h /= 6 * d; break;
        case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return [
         h,
         s,
         v
    ];
}

function addSaturationToRGB(color,offset){
    var hsv = RGBtoHSV(color[0]*255,color[1]*255,color[2]*255);
    hsv[1] += offset;
    if (hsv[1] > 1) {
        hsv[1] = 1;
    }
    else if (hsv[1] <= 0) {
        hsv[1] = 0;
    }
    return HSVtoRGB(hsv[0],hsv[1],hsv[2]);
}

function addBrightnessToRGB(color,offset){
    var hsv = RGBtoHSV(color[0]*255,color[1]*255,color[2]*255);
    hsv[2] += offset;
    if (hsv[2] > 1) {
        hsv[2] = 1;
    }
    else if (hsv[2] < 0) {
        hsv[2] = 0;
    }
    return HSVtoRGB(hsv[0],hsv[1],hsv[2]);
}

function addHueToRGB(color,offset) {
    var hsv = RGBtoHSV(color[0]*255,color[1]*255,color[2]*255);
    hsv[0] += offset/360;
    if (hsv[0] > 1) {
        hsv[0] -= 1;
    }
    else if (hsv[0] < 0) {
        hsv[0] += 1;
    }
    return HSVtoRGB(hsv[0],hsv[1],hsv[2]);
}

var rgbToHex = (function(){
    var colorMap = [];
    var i;
    var hex;
    for(i=0;i<256;i+=1){
        hex = i.toString(16);
        colorMap[i] = hex.length == 1 ? '0' + hex : hex;
    }

    return function(r, g, b) {
        if(r<0){
            r = 0;
        }
        if(g<0){
            g = 0;
        }
        if(b<0){
            b = 0;
        }
        return '#' + colorMap[r] + colorMap[g] + colorMap[b];
    };
}());
function BaseEvent(){}
BaseEvent.prototype = {
	triggerEvent: function (eventName, args) {
	    if (this._cbs[eventName]) {
	        var len = this._cbs[eventName].length;
	        for (var i = 0; i < len; i++){
	            this._cbs[eventName][i](args);
	        }
	    }
	},
	addEventListener: function (eventName, callback) {
	    if (!this._cbs[eventName]){
	        this._cbs[eventName] = [];
	    }
	    this._cbs[eventName].push(callback);

		return function() {
			this.removeEventListener(eventName, callback);
		}.bind(this);
	},
	removeEventListener: function (eventName,callback){
	    if (!callback){
	        this._cbs[eventName] = null;
	    }else if(this._cbs[eventName]){
	        var i = 0, len = this._cbs[eventName].length;
	        while(i<len){
	            if(this._cbs[eventName][i] === callback){
	                this._cbs[eventName].splice(i,1);
	                i -=1;
	                len -= 1;
	            }
	            i += 1;
	        }
	        if(!this._cbs[eventName].length){
	            this._cbs[eventName] = null;
	        }
	    }
	}
};
var createTypedArray = (function(){
	function createRegularArray(type, len){
		var i = 0, arr = [], value;
		switch(type) {
			case 'int16':
			case 'uint8c':
				value = 1;
				break;
			default:
				value = 1.1;
				break;
		}
		for(i = 0; i < len; i += 1) {
			arr.push(value);
		}
		return arr;
	}
	function createTypedArray(type, len){
		if(type === 'float32') {
			return new Float32Array(len);
		} else if(type === 'int16') {
			return new Int16Array(len);
		} else if(type === 'uint8c') {
			return new Uint8ClampedArray(len);
		}
	}
	if(typeof Uint8ClampedArray === 'function' && typeof Float32Array === 'function') {
		return createTypedArray;
	} else {
		return createRegularArray;
	}
}());

function createSizedArray(len) {
	return Array.apply(null,{length:len});
}
function createNS(type) {
	//return {appendChild:function(){},setAttribute:function(){},style:{}}
	return document.createElementNS(svgNS, type);
}
function createTag(type) {
	//return {appendChild:function(){},setAttribute:function(){},style:{}}
	return document.createElement(type);
}
function DynamicPropertyContainer(){};
DynamicPropertyContainer.prototype = {
	addDynamicProperty: function(prop) {
		if(this.dynamicProperties.indexOf(prop) === -1) {
	        this.dynamicProperties.push(prop);
	        this.container.addDynamicProperty(this);
	    	this._isAnimated = true;
	    }
	},
	iterateDynamicProperties: function(){
	    this._mdf = false;
	    var i, len = this.dynamicProperties.length;
	    for(i=0;i<len;i+=1){
	        this.dynamicProperties[i].getValue();
	        if(this.dynamicProperties[i]._mdf) {
	            this._mdf = true;
	        }
	    }
	},
	initDynamicPropertyContainer: function(container){
	    this.container = container;
	    this.dynamicProperties = [];
	    this._mdf = false;
	    this._isAnimated = false;
	}
}
var getBlendMode = (function() {

	var blendModeEnums = {
        0:'source-over',
        1:'multiply',
        2:'screen',
        3:'overlay',
        4:'darken',
        5:'lighten',
        6:'color-dodge',
        7:'color-burn',
        8:'hard-light',
        9:'soft-light',
        10:'difference',
        11:'exclusion',
        12:'hue',
        13:'saturation',
        14:'color',
        15:'luminosity'
    }

	return function(mode) {
		return blendModeEnums[mode] || '';
	}
}())
function SkiaBaseContent() {
    this.alpha = 1;
    this.transform = SKIA.CanvasKit().SkMatrix.identity();
    var CK = SKIA.CanvasKit();
    this.paint = new CK.SkPaint();

    this.shadowColor = SKIA.CanvasKit().TRANSPARENT;
    this.shadowBlur = 0;
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;

    /**
    * 设置透明度
    */
    this.setAlpha = function (alpha) {
        this.alpha = alpha;
    }

    /**
     * 设置矩阵变换
     */
    this.setTransform = function (transform) {
        this.transform = transform;
    }

    //------------------------------------------code from canvaskit----------------------------------------------------------//

    // Returns the matrix representing the offset of the shadows. This unapplies
    // the effects of the scale, which should not affect the shadow offsets.
    this._shadowOffsetMatrix = function () {
        var sx = this.transform[0];
        var sy = this.transform[4];
        return SKIA.CanvasKit().SkMatrix.translated(this.shadowOffsetX / sx, this.shadowOffsetY / sy);
    }

    this.SkBlurRadiusToSigma = function (radius) {
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
    this._shadowPaint = function (basePaint) {
        // multiply first to see if the alpha channel goes to 0 after multiplication.
        var alphaColor = SKIA.CanvasKit().multiplyByAlpha(this.shadowColor, this.alpha);
        // if alpha is zero, no shadows
        if (!SKIA.CanvasKit().getColorComponents(alphaColor)[3]) {
            return null;
        }
        // one of these must also be non-zero (otherwise the shadow is
        // completely hidden.  And the spec says so).
        if (!(this.shadowBlur || this.shadowOffsetY || this.shadowOffsetX)) {
            return null;
        }
        var shadowPaint = basePaint.copy();
        shadowPaint.setColor(alphaColor);
        var blurEffect = SKIA.CanvasKit().SkMaskFilter.MakeBlur(SKIA.CanvasKit().BlurStyle.Normal,
            SkBlurRadiusToSigma(this.shadowBlur),
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

}


function SkiaFill() {
    SkiaBaseContent.call(this);

    /**
     * 创建填充
    */
    this.setFillStyle = function (fillStyle) {
        this.paint.setStyle(SKIA.CanvasKit().PaintStyle.Fill);
        if (typeof fillStyle === 'string') {
            var fs = ColorUtil.parseColor(fillStyle);
            var alphaColor = SKIA.CanvasKit().multiplyByAlpha(fs, this.alpha);
            this.paint.setColor(alphaColor);
        } else if (fillStyle._getShader) {
            // It's an effect that has a shader.
            var shader = fillStyle._getShader(this.transform);
            this.paint.setColor(SKIA.CanvasKit().Color(0, 0, 0, this.alpha));
            this.paint.setShader(shader);
        }

        this.paint.dispose = function () {
            // If there are some helper effects in the future, clean them up
            // here. In any case, we have .dispose() to make _fillPaint behave
            // like _strokePaint and _shadowPaint.
            this.delete();
        }
    }


    /**
     * 填充操作
     */
    this.draw = function (skcanvas, path, fillRule) {
        if (!path && !fillRule) {
            throw 'invalid paht && fill rule';
            return;
        }

        if (fillRule === 'evenodd') {
            path.setFillType(SKIA.CanvasKit().FillType.EvenOdd);
        } else if (fillRule === 'nonzero' || !fillRule) {
            path.setFillType(SKIA.CanvasKit().FillType.Winding);
        }

        var shadowPaint = this._shadowPaint(this.paint);
        if (shadowPaint) {
            skcanvas.save();
            skcanvas.concat(this._shadowOffsetMatrix());
            skcanvas.drawPath(path, shadowPaint);
            skcanvas.restore();
            shadowPaint.dispose();
        }
        skcanvas.drawPath(path, this.paint);
    }

    this.dispose = function () {
        this.paint.dispose();
    }

}



function SkiaStroke() {

    SkiaBaseContent.call(this);

    /**
    * 设置画笔风格
    */
    this.setStrokeStyle = function (strokeStyle) {
        this.paint.setStyle(SKIA.CanvasKit().PaintStyle.Stroke);
        if (typeof strokeStyle === 'string') {
            var ss = ColorUtil.parseColor(strokeStyle);
            var alphaColor = SKIA.CanvasKit().multiplyByAlpha(ss, this.alpha);
            this.paint.setColor(alphaColor);
        } else if (strokeStyle._getShader) {
            // It's probably an effect.
            var shader = strokeStyle._getShader(this.transform);
            this.paint.setColor(SKIA.CanvasKit().Color(0, 0, 0, this.alpha));
            this.paint.setShader(shader);
        }

        this.paint.dispose = function () {
            dashedEffect && dashedEffect.delete();
            this.delete();
        }
    }


    /**
     * 设置画笔宽
     */
    this.setStrokeWidth = function (width) {
        if (width <= 0 || !width) {
            // Spec says to ignore NaN/Inf/0/negative values
            return;
        }
        this.paint.setStrokeWidth(width);
    }


    /**
     * 设置画笔末端样式
     */
    this.setStrokeCap = function (cap) {
        switch (cap) {
            case 'butt':
                this.paint.setStrokeCap(SKIA.CanvasKit().StrokeCap.Butt);
                return;
            case 'round':
                this.paint.setStrokeCap(SKIA.CanvasKit().StrokeCap.Round);
                return;
            case 'square':
                this.paint.setStrokeCap(SKIA.CanvasKit().StrokeCap.Square);
                return;
        }
    }

    /**
     * 设置画笔转角
     */
    this.setStrokeJoin = function (join) {
        switch (join) {
            case 'miter':
                this.paint.setStrokeJoin(SKIA.CanvasKit().StrokeJoin.Miter);
                return;
            case 'round':
                this.paint.setStrokeJoin(SKIA.CanvasKit().StrokeJoin.Round);
                return;
            case 'bevel':
                this.paint.setStrokeJoin(SKIA.CanvasKit().StrokeJoin.Bevel);
                return;
        }
    }

    /**
     * 设置画笔斜接
     */
    this.setStrokeMiter = function (limit) {
        if (limit <= 0 || !limit) {
            // Spec says to ignore NaN/Inf/0/negative values
            return;
        }

        this.paint.setStrokeMiter(limit);
    }

    /**
     * 创建虚线
     */
    this.setLineDash = function (dashes, lineDashOffset) {
        for (var i = 0; i < dashes.length; i++) {
            if (!isFinite(dashes[i]) || dashes[i] < 0) {
                console.log('dash list must have positive, finite values');
                return;
            }
        }

        if (dashes.length % 2 === 1) {
            // as per the spec, concatenate 2 copies of dashes
            // to give it an even number of elements.
            Array.prototype.push.apply(dashes, dashes);
        }

        if (dashes.length) {
            var dashedEffect = SKIA.CanvasKit().MakeSkDashPathEffect(dashes, lineDashOffset);
            this.paint.setPathEffect(dashedEffect);
        }

    }

    /**
     * 画笔操作
     */
    this.draw = function (skcanvas, path) {

        var shadowPaint = this._shadowPaint(this.paint);
        if (shadowPaint) {
            skcanvas.save();
            skcanvas.concat(this._shadowOffsetMatrix());
            skcanvas.drawPath(path, shadowPaint);
            skcanvas.restore();
            shadowPaint.dispose();
        }

        skcanvas.drawPath(path, this.paint);
    }

    this.dispose = function () {
        this.paint.dispose();
    }
}


function CanvasPattern(image, repetition) {
    this._shader = null;
    // image should be an SkImage returned from HTMLCanvas.decodeImage()
    this._image = image;
    this._transform = SKIA.CanvasKit().SkMatrix.identity();
  
    if (repetition === '') {
      repetition = 'repeat';
    }
    switch(repetition) {
      case 'repeat-x':
        this._tileX = SKIA.CanvasKit().TileMode.Repeat;
        // Skia's 'clamp' mode repeats the last row/column
        // which looks very very strange.
        // Decal mode does just transparent copying, which
        // is exactly what the spec wants.
        this._tileY = SKIA.CanvasKit().TileMode.Decal;
        break;
      case 'repeat-y':
        this._tileX = SKIA.CanvasKit().TileMode.Decal;
        this._tileY = SKIA.CanvasKit().TileMode.Repeat;
        break;
      case 'repeat':
        this._tileX = SKIA.CanvasKit().TileMode.Repeat;
        this._tileY = SKIA.CanvasKit().TileMode.Repeat;
        break;
      case 'no-repeat':
        this._tileX = SKIA.CanvasKit().TileMode.Decal;
        this._tileY = SKIA.CanvasKit().TileMode.Decal;
        break;
      default:
        throw 'invalid repetition mode ' + repetition;
    }
  
    // Takes a DOMMatrix like object. e.g. the identity would be:
    // {a:1, b: 0, c: 0, d: 1, e: 0, f: 0}
    // @param {DOMMatrix} m
    this.setTransform = function(m) {
      var t = [m.a, m.c, m.e,
               m.b, m.d, m.f,
                 0,   0,   1];
      if (allAreFinite(t)) {
        this._transform = t;
      }
    }
  
    this._copy = function() {
      var cp = new CanvasPattern()
      cp._tileX = this._tileX;
      cp._tileY = this._tileY;
      return cp;
    }
  
    this._dispose = function() {
      if (this._shader) {
        this._shader.delete();
        this._shader = null;
      }
    }
  
    this._getShader = function(currentTransform) {
      // Ignore currentTransform since it will be applied later
      this._dispose();
      this._shader = this._image.makeShader(this._tileX, this._tileY, this._transform);
      return this._shader;
    }
  
  }

function LinearCanvasGradient(x1, y1, x2, y2) {
    this._shader = null;
    this._colors = [];
    this._pos = [];
  
    this.addColorStop = function(offset, color) {
      if (offset < 0 || offset > 1 || !isFinite(offset)) {
        throw 'offset must be between 0 and 1 inclusively';
      }
  
      color = parseColor(color);
      // From the spec: If multiple stops are added at the same offset on a
      // gradient, then they must be placed in the order added, with the first
      // one closest to the start of the gradient, and each subsequent one
      // infinitesimally further along towards the end point (in effect
      // causing all but the first and last stop added at each point to be
      // ignored).
      // To implement that, if an offset is already in the list,
      // we just overwrite its color (since the user can't remove Color stops
      // after the fact).
      var idx = this._pos.indexOf(offset);
      if (idx !== -1) {
        this._colors[idx] = color;
      } else {
        // insert it in sorted order
        for (idx = 0; idx < this._pos.length; idx++) {
          if (this._pos[idx] > offset) {
            break;
          }
        }
        this._pos   .splice(idx, 0, offset);
        this._colors.splice(idx, 0, color);
      }
    }
  
    this._copy = function() {
      var lcg = new LinearCanvasGradient(x1, y1, x2, y2);
      lcg._colors = this._colors.slice();
      lcg._pos    = this._pos.slice();
      return lcg;
    }
  
    this._dispose = function() {
      if (this._shader) {
        this._shader.delete();
        this._shader = null;
      }
    }
  
    this._getShader = function(currentTransform) {
      // From the spec: "The points in the linear gradient must be transformed
      // as described by the current transformation matrix when rendering."
      var pts = [x1, y1, x2, y2];
      SKIA.CanvasKit().SkMatrix.mapPoints(currentTransform, pts);
      var sx1 = pts[0];
      var sy1 = pts[1];
      var sx2 = pts[2];
      var sy2 = pts[3];
  
      this._dispose();
      this._shader = SKIA.CanvasKit().MakeLinearGradientShader([sx1, sy1], [sx2, sy2],
        this._colors, this._pos, SKIA.CanvasKit().TileMode.Clamp);
      return this._shader;
    }
  }
// Note, Skia has a different notion of a "radial" gradient.
// Skia has a twoPointConical gradient that is the same as the
// canvas's RadialGradient.

function RadialCanvasGradient(x1, y1, r1, x2, y2, r2) {
    this._shader = null;
    this._colors = [];
    this._pos = [];
  
    this.addColorStop = function(offset, color) {
      if (offset < 0 || offset > 1 || !isFinite(offset)) {
        throw 'offset must be between 0 and 1 inclusively';
      }
  
      color = parseColor(color);
      // From the spec: If multiple stops are added at the same offset on a
      // gradient, then they must be placed in the order added, with the first
      // one closest to the start of the gradient, and each subsequent one
      // infinitesimally further along towards the end point (in effect
      // causing all but the first and last stop added at each point to be
      // ignored).
      // To implement that, if an offset is already in the list,
      // we just overwrite its color (since the user can't remove Color stops
      // after the fact).
      var idx = this._pos.indexOf(offset);
      if (idx !== -1) {
        this._colors[idx] = color;
      } else {
        // insert it in sorted order
        for (idx = 0; idx < this._pos.length; idx++) {
          if (this._pos[idx] > offset) {
            break;
          }
        }
        this._pos   .splice(idx, 0, offset);
        this._colors.splice(idx, 0, color);
      }
    }
  
    this._copy = function() {
      var rcg = new RadialCanvasGradient(x1, y1, r1, x2, y2, r2);
      rcg._colors = this._colors.slice();
      rcg._pos    = this._pos.slice();
      return rcg;
    }
  
    this._dispose = function() {
      if (this._shader) {
        this._shader.delete();
        this._shader = null;
      }
    }
  
    this._getShader = function(currentTransform) {
      // From the spec: "The points in the linear gradient must be transformed
      // as described by the current transformation matrix when rendering."
      var pts = [x1, y1, x2, y2];
      SKIA.CanvasKit().SkMatrix.mapPoints(currentTransform, pts);
      var sx1 = pts[0];
      var sy1 = pts[1];
      var sx2 = pts[2];
      var sy2 = pts[3];
  
      var sx = currentTransform[0];
      var sy = currentTransform[4];
      var scaleFactor = (Math.abs(sx) + Math.abs(sy))/2;
  
      var sr1 = r1 * scaleFactor;
      var sr2 = r2 * scaleFactor;
  
      this._dispose();
      this._shader = SKIA.CanvasKit().MakeTwoPointConicalGradientShader(
          [sx1, sy1], sr1, [sx2, sy2], sr2, this._colors, this._pos,
          SKIA.CanvasKit().TileMode.Clamp);
      return this._shader;
    }
  }
var ColorUtil = (function () {

    var colorMap = { 'aliceblue': 4293982463, 'antiquewhite': 4294634455, 'aqua': 4278255615, 'aquamarine': 4286578644, 'azure': 4293984255, 'beige': 4294309340, 'bisque': 4294960324, 'black': 4278190080, 'blanchedalmond': 4294962125, 'blue': 4278190335, 'blueviolet': 4287245282, 'brown': 4289014314, 'burlywood': 4292786311, 'cadetblue': 4284456608, 'chartreuse': 4286578432, 'chocolate': 4291979550, 'coral': 4294934352, 'cornflowerblue': 4284782061, 'cornsilk': 4294965468, 'crimson': 4292613180, 'cyan': 4278255615, 'darkblue': 4278190219, 'darkcyan': 4278225803, 'darkgoldenrod': 4290283019, 'darkgray': 4289309097, 'darkgreen': 4278215680, 'darkgrey': 4289309097, 'darkkhaki': 4290623339, 'darkmagenta': 4287299723, 'darkolivegreen': 4283788079, 'darkorange': 4294937600, 'darkorchid': 4288230092, 'darkred': 4287299584, 'darksalmon': 4293498490, 'darkseagreen': 4287609999, 'darkslateblue': 4282924427, 'darkslategray': 4281290575, 'darkslategrey': 4281290575, 'darkturquoise': 4278243025, 'darkviolet': 4287889619, 'deeppink': 4294907027, 'deepskyblue': 4278239231, 'dimgray': 4285098345, 'dimgrey': 4285098345, 'dodgerblue': 4280193279, 'firebrick': 4289864226, 'floralwhite': 4294966000, 'forestgreen': 4280453922, 'fuchsia': 4294902015, 'gainsboro': 4292664540, 'ghostwhite': 4294506751, 'gold': 4294956800, 'goldenrod': 4292519200, 'gray': 4286611584, 'green': 4278222848, 'greenyellow': 4289593135, 'grey': 4286611584, 'honeydew': 4293984240, 'hotpink': 4294928820, 'indianred': 4291648604, 'indigo': 4283105410, 'ivory': 4294967280, 'khaki': 4293977740, 'lavender': 4293322490, 'lavenderblush': 4294963445, 'lawngreen': 4286381056, 'lemonchiffon': 4294965965, 'lightblue': 4289583334, 'lightcoral': 4293951616, 'lightcyan': 4292935679, 'lightgoldenrodyellow': 4294638290, 'lightgray': 4292072403, 'lightgreen': 4287688336, 'lightgrey': 4292072403, 'lightpink': 4294948545, 'lightsalmon': 4294942842, 'lightseagreen': 4280332970, 'lightskyblue': 4287090426, 'lightslategray': 4286023833, 'lightslategrey': 4286023833, 'lightsteelblue': 4289774814, 'lightyellow': 4294967264, 'lime': 4278255360, 'limegreen': 4281519410, 'linen': 4294635750, 'magenta': 4294902015, 'maroon': 4286578688, 'mediumaquamarine': 4284927402, 'mediumblue': 4278190285, 'mediumorchid': 4290401747, 'mediumpurple': 4287852763, 'mediumseagreen': 4282168177, 'mediumslateblue': 4286277870, 'mediumspringgreen': 4278254234, 'mediumturquoise': 4282962380, 'mediumvioletred': 4291237253, 'midnightblue': 4279834992, 'mintcream': 4294311930, 'mistyrose': 4294960353, 'moccasin': 4294960309, 'navajowhite': 4294958765, 'navy': 4278190208, 'oldlace': 4294833638, 'olive': 4286611456, 'olivedrab': 4285238819, 'orange': 4294944000, 'orangered': 4294919424, 'orchid': 4292505814, 'palegoldenrod': 4293847210, 'palegreen': 4288215960, 'paleturquoise': 4289720046, 'palevioletred': 4292571283, 'papayawhip': 4294963157, 'peachpuff': 4294957753, 'peru': 4291659071, 'pink': 4294951115, 'plum': 4292714717, 'powderblue': 4289781990, 'purple': 4286578816, 'rebeccapurple': 4284887961, 'red': 4294901760, 'rosybrown': 4290547599, 'royalblue': 4282477025, 'saddlebrown': 4287317267, 'salmon': 4294606962, 'sandybrown': 4294222944, 'seagreen': 4281240407, 'seashell': 4294964718, 'sienna': 4288696877, 'silver': 4290822336, 'skyblue': 4287090411, 'slateblue': 4285160141, 'slategray': 4285563024, 'slategrey': 4285563024, 'snow': 4294966010, 'springgreen': 4278255487, 'steelblue': 4282811060, 'tan': 4291998860, 'teal': 4278222976, 'thistle': 4292394968, 'transparent': 0, 'tomato': 4294927175, 'turquoise': 4282441936, 'violet': 4293821166, 'wheat': 4294303411, 'white': 4294967295, 'whitesmoke': 4294309365, 'yellow': 4294967040, 'yellowgreen': 4288335154 };
    function colorToString(skcolor) {
        // https://html.spec.whatwg.org/multipage/canvas.html#serialisation-of-a-color
        var components = SKIA.CanvasKit().getColorComponents(skcolor);
        var r = components[0];
        var g = components[1];
        var b = components[2];
        var a = components[3];
        if (a === 1.0) {
            // hex
            r = r.toString(16).toLowerCase();
            g = g.toString(16).toLowerCase();
            b = b.toString(16).toLowerCase();
            r = (r.length === 1 ? '0' + r : r);
            g = (g.length === 1 ? '0' + g : g);
            b = (b.length === 1 ? '0' + b : b);
            return '#' + r + g + b;
        } else {
            a = (a === 0 || a === 1) ? a : a.toFixed(8);
            return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
        }
    }

    function valueOrPercent(aStr) {
        if (aStr === undefined) {
            return 1; // default to opaque.
        }
        var a = parseFloat(aStr);
        if (aStr && aStr.indexOf('%') !== -1) {
            return a / 100;
        }
        return a;
    }

    function parseColor(colorStr) {
        colorStr = colorStr.toLowerCase();
        // See https://drafts.csswg.org/css-color/#typedef-hex-color
        if (colorStr.startsWith('#')) {
            var r, g, b, a = 255;
            switch (colorStr.length) {
                case 9: // 8 hex chars #RRGGBBAA
                    a = parseInt(colorStr.slice(7, 9), 16);
                case 7: // 6 hex chars #RRGGBB
                    r = parseInt(colorStr.slice(1, 3), 16);
                    g = parseInt(colorStr.slice(3, 5), 16);
                    b = parseInt(colorStr.slice(5, 7), 16);
                    break;
                case 5: // 4 hex chars #RGBA
                    // multiplying by 17 is the same effect as
                    // appending another character of the same value
                    // e.g. e => ee == 14 => 238
                    a = parseInt(colorStr.slice(4, 5), 16) * 17;
                case 4: // 6 hex chars #RGB
                    r = parseInt(colorStr.slice(1, 2), 16) * 17;
                    g = parseInt(colorStr.slice(2, 3), 16) * 17;
                    b = parseInt(colorStr.slice(3, 4), 16) * 17;
                    break;
            }
            return SKIA.CanvasKit().Color(r, g, b, a / 255);

        } else if (colorStr.startsWith('rgba')) {
            // Trim off rgba( and the closing )
            colorStr = colorStr.slice(5, -1);
            var nums = colorStr.split(',');
            return SKIA.CanvasKit().Color(+nums[0], +nums[1], +nums[2],
                valueOrPercent(nums[3]));
        } else if (colorStr.startsWith('rgb')) {
            // Trim off rgba( and the closing )
            colorStr = colorStr.slice(4, -1);
            var nums = colorStr.split(',');
            // rgb can take 3 or 4 arguments
            return SKIA.CanvasKit().Color(+nums[0], +nums[1], +nums[2],
                valueOrPercent(nums[3]));
        } else if (colorStr.startsWith('gray(')) {
            // TODO
        } else if (colorStr.startsWith('hsl')) {
            // TODO
        } else {
            // Try for named color
            var nc = colorMap[colorStr];
            if (nc !== undefined) {
                return nc;
            }
        }
        SkDebug('unrecognized color ' + colorStr);
        return SKIA.CanvasKit().BLACK;
    }

    function parseArray(colorArray) {
        if (!colorArray) {
            return SKIA.CanvasKit().BLACK;
        }

        return SKIA.CanvasKit().Color(colorArray[0]*255, colorArray[1]*255, colorArray[2]*255, 1);

    }

    return {
        colorToString: colorToString,
        valueOrPercent: valueOrPercent,
        parseColor: parseColor,
        parseArray: parseArray
    };
}());
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
/*!
 Transformation Matrix v2.0
 (c) Epistemex 2014-2015
 www.epistemex.com
 By Ken Fyrstenberg
 Contributions by leeoniya.
 License: MIT, header required.
 */

/**
 * 2D transformation matrix object initialized with identity matrix.
 *
 * The matrix can synchronize a canvas context by supplying the context
 * as an argument, or later apply current absolute transform to an
 * existing context.
 *
 * All values are handled as floating point values.
 *
 * @param {CanvasRenderingContext2D} [context] - Optional context to sync with Matrix
 * @prop {number} a - scale x
 * @prop {number} b - shear y
 * @prop {number} c - shear x
 * @prop {number} d - scale y
 * @prop {number} e - translate x
 * @prop {number} f - translate y
 * @prop {CanvasRenderingContext2D|null} [context=null] - set or get current canvas context
 * @constructor
 */

var Matrix = (function(){

    var _cos = Math.cos;
    var _sin = Math.sin;
    var _tan = Math.tan;
    var _rnd = Math.round;

    function reset(){
        this.props[0] = 1;
        this.props[1] = 0;
        this.props[2] = 0;
        this.props[3] = 0;
        this.props[4] = 0;
        this.props[5] = 1;
        this.props[6] = 0;
        this.props[7] = 0;
        this.props[8] = 0;
        this.props[9] = 0;
        this.props[10] = 1;
        this.props[11] = 0;
        this.props[12] = 0;
        this.props[13] = 0;
        this.props[14] = 0;
        this.props[15] = 1;
        return this;
    }

    function rotate(angle) {
        if(angle === 0){
            return this;
        }
        var mCos = _cos(angle);
        var mSin = _sin(angle);
        return this._t(mCos, -mSin,  0, 0, mSin,  mCos, 0, 0, 0,  0,  1, 0, 0, 0, 0, 1);
    }

    function rotateX(angle){
        if(angle === 0){
            return this;
        }
        var mCos = _cos(angle);
        var mSin = _sin(angle);
        return this._t(1, 0, 0, 0, 0, mCos, -mSin, 0, 0, mSin,  mCos, 0, 0, 0, 0, 1);
    }

    function rotateY(angle){
        if(angle === 0){
            return this;
        }
        var mCos = _cos(angle);
        var mSin = _sin(angle);
        return this._t(mCos,  0,  mSin, 0, 0, 1, 0, 0, -mSin,  0,  mCos, 0, 0, 0, 0, 1);
    }

    function rotateZ(angle){
        if(angle === 0){
            return this;
        }
        var mCos = _cos(angle);
        var mSin = _sin(angle);
        return this._t(mCos, -mSin,  0, 0, mSin,  mCos, 0, 0, 0,  0,  1, 0, 0, 0, 0, 1);
    }

    function shear(sx,sy){
        return this._t(1, sy, sx, 1, 0, 0);
    }

    function skew(ax, ay){
        return this.shear(_tan(ax), _tan(ay));
    }

    function skewFromAxis(ax, angle){
        var mCos = _cos(angle);
        var mSin = _sin(angle);
        return this._t(mCos, mSin,  0, 0, -mSin,  mCos, 0, 0, 0,  0,  1, 0, 0, 0, 0, 1)
            ._t(1, 0,  0, 0, _tan(ax),  1, 0, 0, 0,  0,  1, 0, 0, 0, 0, 1)
            ._t(mCos, -mSin,  0, 0, mSin,  mCos, 0, 0, 0,  0,  1, 0, 0, 0, 0, 1);
        //return this._t(mCos, mSin, -mSin, mCos, 0, 0)._t(1, 0, _tan(ax), 1, 0, 0)._t(mCos, -mSin, mSin, mCos, 0, 0);
    }

    function scale(sx, sy, sz) {
        if(!sz && sz !== 0) {
            sz = 1;
        }
        if(sx === 1 && sy === 1 && sz === 1){
            return this;
        }
        return this._t(sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1);
    }

    function setTransform(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) {
        this.props[0] = a;
        this.props[1] = b;
        this.props[2] = c;
        this.props[3] = d;
        this.props[4] = e;
        this.props[5] = f;
        this.props[6] = g;
        this.props[7] = h;
        this.props[8] = i;
        this.props[9] = j;
        this.props[10] = k;
        this.props[11] = l;
        this.props[12] = m;
        this.props[13] = n;
        this.props[14] = o;
        this.props[15] = p;
        return this;
    }

    function translate(tx, ty, tz) {
        tz = tz || 0;
        if(tx !== 0 || ty !== 0 || tz !== 0){
            return this._t(1,0,0,0,0,1,0,0,0,0,1,0,tx,ty,tz,1);
        }
        return this;
    }

    function transform(a2, b2, c2, d2, e2, f2, g2, h2, i2, j2, k2, l2, m2, n2, o2, p2) {

        var _p = this.props;

        if(a2 === 1 && b2 === 0 && c2 === 0 && d2 === 0 && e2 === 0 && f2 === 1 && g2 === 0 && h2 === 0 && i2 === 0 && j2 === 0 && k2 === 1 && l2 === 0){
            //NOTE: commenting this condition because TurboFan deoptimizes code when present
            //if(m2 !== 0 || n2 !== 0 || o2 !== 0){
                _p[12] = _p[12] * a2 + _p[15] * m2;
                _p[13] = _p[13] * f2 + _p[15] * n2;
                _p[14] = _p[14] * k2 + _p[15] * o2;
                _p[15] = _p[15] * p2;
            //}
            this._identityCalculated = false;
            return this;
        }

        var a1 = _p[0];
        var b1 = _p[1];
        var c1 = _p[2];
        var d1 = _p[3];
        var e1 = _p[4];
        var f1 = _p[5];
        var g1 = _p[6];
        var h1 = _p[7];
        var i1 = _p[8];
        var j1 = _p[9];
        var k1 = _p[10];
        var l1 = _p[11];
        var m1 = _p[12];
        var n1 = _p[13];
        var o1 = _p[14];
        var p1 = _p[15];

        /* matrix order (canvas compatible):
         * ace
         * bdf
         * 001
         */
        _p[0] = a1 * a2 + b1 * e2 + c1 * i2 + d1 * m2;
        _p[1] = a1 * b2 + b1 * f2 + c1 * j2 + d1 * n2 ;
        _p[2] = a1 * c2 + b1 * g2 + c1 * k2 + d1 * o2 ;
        _p[3] = a1 * d2 + b1 * h2 + c1 * l2 + d1 * p2 ;

        _p[4] = e1 * a2 + f1 * e2 + g1 * i2 + h1 * m2 ;
        _p[5] = e1 * b2 + f1 * f2 + g1 * j2 + h1 * n2 ;
        _p[6] = e1 * c2 + f1 * g2 + g1 * k2 + h1 * o2 ;
        _p[7] = e1 * d2 + f1 * h2 + g1 * l2 + h1 * p2 ;

        _p[8] = i1 * a2 + j1 * e2 + k1 * i2 + l1 * m2 ;
        _p[9] = i1 * b2 + j1 * f2 + k1 * j2 + l1 * n2 ;
        _p[10] = i1 * c2 + j1 * g2 + k1 * k2 + l1 * o2 ;
        _p[11] = i1 * d2 + j1 * h2 + k1 * l2 + l1 * p2 ;

        _p[12] = m1 * a2 + n1 * e2 + o1 * i2 + p1 * m2 ;
        _p[13] = m1 * b2 + n1 * f2 + o1 * j2 + p1 * n2 ;
        _p[14] = m1 * c2 + n1 * g2 + o1 * k2 + p1 * o2 ;
        _p[15] = m1 * d2 + n1 * h2 + o1 * l2 + p1 * p2 ;

        this._identityCalculated = false;
        return this;
    }

    function isIdentity() {
        if(!this._identityCalculated){
            this._identity = !(this.props[0] !== 1 || this.props[1] !== 0 || this.props[2] !== 0 || this.props[3] !== 0 || this.props[4] !== 0 || this.props[5] !== 1 || this.props[6] !== 0 || this.props[7] !== 0 || this.props[8] !== 0 || this.props[9] !== 0 || this.props[10] !== 1 || this.props[11] !== 0 || this.props[12] !== 0 || this.props[13] !== 0 || this.props[14] !== 0 || this.props[15] !== 1);
            this._identityCalculated = true;
        }
        return this._identity;
    }

    function equals(matr){
        var i = 0;
        while (i < 16) {
            if(matr.props[i] !== this.props[i]) {
                return false;
            }
            i+=1;
        }
        return true;
    }

    function clone(matr){
        var i;
        for(i=0;i<16;i+=1){
            matr.props[i] = this.props[i];
        }
    }

    function cloneFromProps(props){
        var i;
        for(i=0;i<16;i+=1){
            this.props[i] = props[i];
        }
    }

    function applyToPoint(x, y, z) {

        return {
            x: x * this.props[0] + y * this.props[4] + z * this.props[8] + this.props[12],
            y: x * this.props[1] + y * this.props[5] + z * this.props[9] + this.props[13],
            z: x * this.props[2] + y * this.props[6] + z * this.props[10] + this.props[14]
        };
        /*return {
         x: x * me.a + y * me.c + me.e,
         y: x * me.b + y * me.d + me.f
         };*/
    }
    function applyToX(x, y, z) {
        return x * this.props[0] + y * this.props[4] + z * this.props[8] + this.props[12];
    }
    function applyToY(x, y, z) {
        return x * this.props[1] + y * this.props[5] + z * this.props[9] + this.props[13];
    }
    function applyToZ(x, y, z) {
        return x * this.props[2] + y * this.props[6] + z * this.props[10] + this.props[14];
    }

    function getInverseMatrix() {
        var determinant = this.props[0] * this.props[5] - this.props[1] * this.props[4];
        var a = this.props[5]/determinant;
        var b = - this.props[1]/determinant;
        var c = - this.props[4]/determinant;
        var d = this.props[0]/determinant;
        var e = (this.props[4] * this.props[13] - this.props[5] * this.props[12])/determinant;
        var f = - (this.props[0] * this.props[13] - this.props[1] * this.props[12])/determinant;
        var inverseMatrix = new Matrix();
        inverseMatrix.props[0] = a;
        inverseMatrix.props[1] = b;
        inverseMatrix.props[4] = c;
        inverseMatrix.props[5] = d;
        inverseMatrix.props[12] = e;
        inverseMatrix.props[13] = f;
        return inverseMatrix;
    }

    function inversePoint(pt) {
        var inverseMatrix = this.getInverseMatrix();
        return inverseMatrix.applyToPointArray(pt[0], pt[1], pt[2] || 0)
    }

    function inversePoints(pts){
        var i, len = pts.length, retPts = [];
        for(i=0;i<len;i+=1){
            retPts[i] = inversePoint(pts[i]);
        }
        return retPts;
    }

    function applyToTriplePoints(pt1, pt2, pt3) {
        var arr = createTypedArray('float32', 6);
        if(this.isIdentity()) {
            arr[0] = pt1[0];
            arr[1] = pt1[1];
            arr[2] = pt2[0];
            arr[3] = pt2[1];
            arr[4] = pt3[0];
            arr[5] = pt3[1];
        } else {
            var p0 = this.props[0], p1 = this.props[1], p4 = this.props[4], p5 = this.props[5], p12 = this.props[12], p13 = this.props[13];
            arr[0] = pt1[0] * p0 + pt1[1] * p4 + p12;
            arr[1] = pt1[0] * p1 + pt1[1] * p5 + p13;
            arr[2] = pt2[0] * p0 + pt2[1] * p4 + p12;
            arr[3] = pt2[0] * p1 + pt2[1] * p5 + p13;
            arr[4] = pt3[0] * p0 + pt3[1] * p4 + p12;
            arr[5] = pt3[0] * p1 + pt3[1] * p5 + p13;
        }
        return arr;
    }

    function applyToPointArray(x,y,z){
        var arr;
        if(this.isIdentity()) {
            arr = [x,y,z];
        } else {
            arr = [x * this.props[0] + y * this.props[4] + z * this.props[8] + this.props[12],x * this.props[1] + y * this.props[5] + z * this.props[9] + this.props[13],x * this.props[2] + y * this.props[6] + z * this.props[10] + this.props[14]];
        }
        return arr;
    }

    function applyToPointStringified(x, y) {
        if(this.isIdentity()) {
            return x + ',' + y;
        }
        var _p = this.props;
        return Math.round((x * _p[0] + y * _p[4] + _p[12]) * 100) / 100+','+ Math.round((x * _p[1] + y * _p[5] + _p[13]) * 100) / 100;
    }

    function toCSS() {
        //Doesn't make much sense to add this optimization. If it is an identity matrix, it's very likely this will get called only once since it won't be keyframed.
        /*if(this.isIdentity()) {
            return '';
        }*/
        var i = 0;
        var props = this.props;
        var cssValue = 'matrix3d(';
        var v = 10000;
        while(i<16){
            cssValue += _rnd(props[i]*v)/v;
            cssValue += i === 15 ? ')':',';
            i += 1;
        }
        return cssValue;
    }

    function roundMatrixProperty(val) {
        var v = 10000;
        if((val < 0.000001 && val > 0) || (val > -0.000001 && val < 0)) {
            return _rnd(val * v) / v;
        }
        return val;
    }

    function to2dCSS() {
        //Doesn't make much sense to add this optimization. If it is an identity matrix, it's very likely this will get called only once since it won't be keyframed.
        /*if(this.isIdentity()) {
            return '';
        }*/
        var props = this.props;
        var _a = roundMatrixProperty(props[0]);
        var _b = roundMatrixProperty(props[1]);
        var _c = roundMatrixProperty(props[4]);
        var _d = roundMatrixProperty(props[5]);
        var _e = roundMatrixProperty(props[12]);
        var _f = roundMatrixProperty(props[13]);
        return "matrix(" + _a + ',' + _b + ',' + _c + ',' + _d + ',' + _e + ',' + _f + ")";
    }

    return function(){
        this.reset = reset;
        this.rotate = rotate;
        this.rotateX = rotateX;
        this.rotateY = rotateY;
        this.rotateZ = rotateZ;
        this.skew = skew;
        this.skewFromAxis = skewFromAxis;
        this.shear = shear;
        this.scale = scale;
        this.setTransform = setTransform;
        this.translate = translate;
        this.transform = transform;
        this.applyToPoint = applyToPoint;
        this.applyToX = applyToX;
        this.applyToY = applyToY;
        this.applyToZ = applyToZ;
        this.applyToPointArray = applyToPointArray;
        this.applyToTriplePoints = applyToTriplePoints;
        this.applyToPointStringified = applyToPointStringified;
        this.toCSS = toCSS;
        this.to2dCSS = to2dCSS;
        this.clone = clone;
        this.cloneFromProps = cloneFromProps;
        this.equals = equals;
        this.inversePoints = inversePoints;
        this.inversePoint = inversePoint;
        this.getInverseMatrix = getInverseMatrix;
        this._t = this.transform;
        this.isIdentity = isIdentity;
        this._identity = true;
        this._identityCalculated = false;

        this.props = createTypedArray('float32', 16);
        this.reset();
    };
}());

/*
 Copyright 2014 David Bau.

 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

(function (pool, math) {
//
// The following constants are related to IEEE 754 limits.
//
    var global = this,
        width = 256,        // each RC4 output is 0 <= x < 256
        chunks = 6,         // at least six RC4 outputs for each double
        digits = 52,        // there are 52 significant digits in a double
        rngname = 'random', // rngname: name for Math.random and Math.seedrandom
        startdenom = math.pow(width, chunks),
        significance = math.pow(2, digits),
        overflow = significance * 2,
        mask = width - 1,
        nodecrypto;         // node.js crypto module, initialized at the bottom.

//
// seedrandom()
// This is the seedrandom function described above.
//
    function seedrandom(seed, options, callback) {
        var key = [];
        options = (options === true) ? { entropy: true } : (options || {});

        // Flatten the seed string or build one from local entropy if needed.
        var shortseed = mixkey(flatten(
            options.entropy ? [seed, tostring(pool)] :
                (seed === null) ? autoseed() : seed, 3), key);

        // Use the seed to initialize an ARC4 generator.
        var arc4 = new ARC4(key);

        // This function returns a random double in [0, 1) that contains
        // randomness in every bit of the mantissa of the IEEE 754 value.
        var prng = function() {
            var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
                d = startdenom,                 //   and denominator d = 2 ^ 48.
                x = 0;                          //   and no 'extra last byte'.
            while (n < significance) {          // Fill up all significant digits by
                n = (n + x) * width;              //   shifting numerator and
                d *= width;                       //   denominator and generating a
                x = arc4.g(1);                    //   new least-significant-byte.
            }
            while (n >= overflow) {             // To avoid rounding up, before adding
                n /= 2;                           //   last byte, shift everything
                d /= 2;                           //   right using integer math until
                x >>>= 1;                         //   we have exactly the desired bits.
            }
            return (n + x) / d;                 // Form the number within [0, 1).
        };

        prng.int32 = function() { return arc4.g(4) | 0; };
        prng.quick = function() { return arc4.g(4) / 0x100000000; };
        prng.double = prng;

        // Mix the randomness into accumulated entropy.
        mixkey(tostring(arc4.S), pool);

        // Calling convention: what to return as a function of prng, seed, is_math.
        return (options.pass || callback ||
        function(prng, seed, is_math_call, state) {
            if (state) {
                // Load the arc4 state from the given state if it has an S array.
                if (state.S) { copy(state, arc4); }
                // Only provide the .state method if requested via options.state.
                prng.state = function() { return copy(arc4, {}); };
            }

            // If called as a method of Math (Math.seedrandom()), mutate
            // Math.random because that is how seedrandom.js has worked since v1.0.
            if (is_math_call) { math[rngname] = prng; return seed; }

            // Otherwise, it is a newer calling convention, so return the
            // prng directly.
            else return prng;
        })(
            prng,
            shortseed,
            'global' in options ? options.global : (this == math),
            options.state);
    }
    math['seed' + rngname] = seedrandom;

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
    function ARC4(key) {
        var t, keylen = key.length,
            me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

        // The empty key [] is treated as [0].
        if (!keylen) { key = [keylen++]; }

        // Set up S using the standard key scheduling algorithm.
        while (i < width) {
            s[i] = i++;
        }
        for (i = 0; i < width; i++) {
            s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
            s[j] = t;
        }

        // The "g" method returns the next (count) outputs as one number.
        me.g = function(count) {
            // Using instance members instead of closure state nearly doubles speed.
            var t, r = 0,
                i = me.i, j = me.j, s = me.S;
            while (count--) {
                t = s[i = mask & (i + 1)];
                r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
            }
            me.i = i; me.j = j;
            return r;
            // For robust unpredictability, the function call below automatically
            // discards an initial batch of values.  This is called RC4-drop[256].
            // See http://google.com/search?q=rsa+fluhrer+response&btnI
        };
    }

//
// copy()
// Copies internal state of ARC4 to or from a plain object.
//
    function copy(f, t) {
        t.i = f.i;
        t.j = f.j;
        t.S = f.S.slice();
        return t;
    }

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
    function flatten(obj, depth) {
        var result = [], typ = (typeof obj), prop;
        if (depth && typ == 'object') {
            for (prop in obj) {
                try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
            }
        }
        return (result.length ? result : typ == 'string' ? obj : obj + '\0');
    }

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
    function mixkey(seed, key) {
        var stringseed = seed + '', smear, j = 0;
        while (j < stringseed.length) {
            key[mask & j] =
                mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
        }
        return tostring(key);
    }

//
// autoseed()
// Returns an object for autoseeding, using window.crypto and Node crypto
// module if available.
//
    function autoseed() {
        try {
            if (nodecrypto) { return tostring(nodecrypto.randomBytes(width)); }
            var out = new Uint8Array(width);
            (global.crypto || global.msCrypto).getRandomValues(out);
            return tostring(out);
        } catch (e) {
            var browser = global.navigator,
                plugins = browser && browser.plugins;
            return [+new Date(), global, plugins, global.screen, tostring(pool)];
        }
    }

//
// tostring()
// Converts an array of charcodes to a string
//
    function tostring(a) {
        return String.fromCharCode.apply(0, a);
    }

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to interfere with deterministic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
    mixkey(math.random(), pool);

//
// Nodejs and AMD support: export the implementation as a module using
// either convention.
//

// End anonymous scope, and pass initial values.
})(
    [],     // pool: entropy pool starts empty
    BMMath    // math: package containing random, pow, and seedrandom
);
var BezierFactory = (function(){
    /**
     * BezierEasing - use bezier curve for transition easing function
     * by Gaëtan Renaudeau 2014 - 2015 – MIT License
     *
     * Credits: is based on Firefox's nsSMILKeySpline.cpp
     * Usage:
     * var spline = BezierEasing([ 0.25, 0.1, 0.25, 1.0 ])
     * spline.get(x) => returns the easing value | x must be in [0, 1] range
     *
     */

        var ob = {};
    ob.getBezierEasing = getBezierEasing;
    var beziers = {};

    function getBezierEasing(a,b,c,d,nm){
        var str = nm || ('bez_' + a+'_'+b+'_'+c+'_'+d).replace(/\./g, 'p');
        if(beziers[str]){
            return beziers[str];
        }
        var bezEasing = new BezierEasing([a,b,c,d]);
        beziers[str] = bezEasing;
        return bezEasing;
    }

// These values are established by empiricism with tests (tradeoff: performance VS precision)
    var NEWTON_ITERATIONS = 4;
    var NEWTON_MIN_SLOPE = 0.001;
    var SUBDIVISION_PRECISION = 0.0000001;
    var SUBDIVISION_MAX_ITERATIONS = 10;

    var kSplineTableSize = 11;
    var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

    var float32ArraySupported = typeof Float32Array === "function";

    function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
    function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
    function C (aA1)      { return 3.0 * aA1; }

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    function calcBezier (aT, aA1, aA2) {
        return ((A(aA1, aA2)*aT + B(aA1, aA2))*aT + C(aA1))*aT;
    }

// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
    function getSlope (aT, aA1, aA2) {
        return 3.0 * A(aA1, aA2)*aT*aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
    }

    function binarySubdivide (aX, aA, aB, mX1, mX2) {
        var currentX, currentT, i = 0;
        do {
            currentT = aA + (aB - aA) / 2.0;
            currentX = calcBezier(currentT, mX1, mX2) - aX;
            if (currentX > 0.0) {
                aB = currentT;
            } else {
                aA = currentT;
            }
        } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
        return currentT;
    }

    function newtonRaphsonIterate (aX, aGuessT, mX1, mX2) {
        for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
            var currentSlope = getSlope(aGuessT, mX1, mX2);
            if (currentSlope === 0.0) return aGuessT;
            var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
            aGuessT -= currentX / currentSlope;
        }
        return aGuessT;
    }

    /**
     * points is an array of [ mX1, mY1, mX2, mY2 ]
     */
    function BezierEasing (points) {
        this._p = points;
        this._mSampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
        this._precomputed = false;

        this.get = this.get.bind(this);
    }

    BezierEasing.prototype = {

        get: function (x) {
            var mX1 = this._p[0],
                mY1 = this._p[1],
                mX2 = this._p[2],
                mY2 = this._p[3];
            if (!this._precomputed) this._precompute();
            if (mX1 === mY1 && mX2 === mY2) return x; // linear
            // Because JavaScript number are imprecise, we should guarantee the extremes are right.
            if (x === 0) return 0;
            if (x === 1) return 1;
            return calcBezier(this._getTForX(x), mY1, mY2);
        },

        // Private part

        _precompute: function () {
            var mX1 = this._p[0],
                mY1 = this._p[1],
                mX2 = this._p[2],
                mY2 = this._p[3];
            this._precomputed = true;
            if (mX1 !== mY1 || mX2 !== mY2)
                this._calcSampleValues();
        },

        _calcSampleValues: function () {
            var mX1 = this._p[0],
                mX2 = this._p[2];
            for (var i = 0; i < kSplineTableSize; ++i) {
                this._mSampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
            }
        },

        /**
         * getTForX chose the fastest heuristic to determine the percentage value precisely from a given X projection.
         */
        _getTForX: function (aX) {
            var mX1 = this._p[0],
                mX2 = this._p[2],
                mSampleValues = this._mSampleValues;

            var intervalStart = 0.0;
            var currentSample = 1;
            var lastSample = kSplineTableSize - 1;

            for (; currentSample !== lastSample && mSampleValues[currentSample] <= aX; ++currentSample) {
                intervalStart += kSampleStepSize;
            }
            --currentSample;

            // Interpolate to provide an initial guess for t
            var dist = (aX - mSampleValues[currentSample]) / (mSampleValues[currentSample+1] - mSampleValues[currentSample]);
            var guessForT = intervalStart + dist * kSampleStepSize;

            var initialSlope = getSlope(guessForT, mX1, mX2);
            if (initialSlope >= NEWTON_MIN_SLOPE) {
                return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
            } else if (initialSlope === 0.0) {
                return guessForT;
            } else {
                return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
            }
        }
    };

    return ob;

}());

var CanvasKitInit = (function () {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  if (typeof __filename !== 'undefined') _scriptDir = _scriptDir || __filename;
  return (
    function (CanvasKitInit) {
      CanvasKitInit = CanvasKitInit || {};

      var g; g || (g = typeof CanvasKitInit !== 'undefined' ? CanvasKitInit : {});
      (function (a) {
      a.Fk = a.Fk || []; a.Fk.push(function () {
      a.MakeSWCanvasSurface = function (b) { var c = b; if ("CANVAS" !== c.tagName && (c = document.getElementById(b), !c)) throw "Canvas with id " + b + " was not found"; if (b = a.MakeSurface(c.width, c.height)) b.rk = c; return b }; a.MakeCanvasSurface || (a.MakeCanvasSurface = a.MakeSWCanvasSurface); a.MakeSurface = function (b, c) {
        var d = { width: b, height: c, colorType: a.ColorType.RGBA_8888, alphaType: a.AlphaType.Unpremul }, e = b * c * 4, f = a._malloc(e); if (d = this._getRasterDirectSurface(d, f, 4 * b)) d.rk = null,
          d.qm = b, d.mm = c, d.pm = e, d.Ol = f, d.getCanvas().clear(a.TRANSPARENT); return d
      }; a.SkSurface.prototype.flush = function () { this._flush(); if (this.rk) { var b = new Uint8ClampedArray(a.HEAPU8.buffer, this.Ol, this.pm); b = new ImageData(b, this.qm, this.mm); this.rk.getContext("2d").putImageData(b, 0, 0) } }; a.SkSurface.prototype.dispose = function () { this.Ol && a._free(this.Ol); this.delete() }; a.currentContext = a.currentContext || function () { }; a.setCurrentContext = a.setCurrentContext || function () { }
      })
      })(g);
      (function (a) {
      a.Fk = a.Fk || []; a.Fk.push(function () {
        function b(a, b, e) { return a && a.hasOwnProperty(b) ? a[b] : e } a.GetWebGLContext = function (a, d) {
          d = {
            alpha: b(d, "alpha", 1), depth: b(d, "depth", 1), stencil: b(d, "stencil", 8), antialias: b(d, "antialias", 1), premultipliedAlpha: b(d, "premultipliedAlpha", 1), preserveDrawingBuffer: b(d, "preserveDrawingBuffer", 0), preferLowPowerToHighPerformance: b(d, "preferLowPowerToHighPerformance", 0), failIfMajorPerformanceCaveat: b(d, "failIfMajorPerformanceCaveat", 0), vl: b(d, "majorVersion", 2), Nm: b(d,
              "minorVersion", 0), fm: b(d, "enableExtensionsByDefault", 1), ln: b(d, "explicitSwapControl", 0), tn: b(d, "renderViaOffscreenBackBuffer", 0)
          }; if (!a || d.explicitSwapControl) a = 0; else { var c = aa(a, d); !c && 1 < d.vl && (d.vl = 1, d.Nm = 0, c = aa(a, d)); a = c } return a
        }; a.MakeWebGLCanvasSurface = function (b, d, e) {
          var c = b; if ("CANVAS" !== c.tagName && (c = document.getElementById(b), !c)) throw "Canvas with id " + b + " was not found"; b = this.GetWebGLContext(c); if (!b || 0 > b) throw "failed to create webgl context: err " + b; if (!(c || d && e)) throw "height and width must be provided with context";
          var k = this.MakeGrContext(b); k && k.setResourceCacheLimitBytes(268435456); d = this.MakeOnScreenGLSurface(k, d || c.width, e || c.height); if (!d) return d = c.cloneNode(!0), c.parentNode.replaceChild(d, c), d.classList.add("ck-replaced"), a.MakeSWCanvasSurface(d); d.Wk = b; d.grContext = k; return d
        }; a.MakeCanvasSurface = a.MakeWebGLCanvasSurface
      })
      })(g);
      (function (a) {
        function b(a) { return Math.round(Math.max(0, Math.min(a || 0, 255))) } function c(a) { if (void 0 === a) return 1; var b = parseFloat(a); return a && -1 !== a.indexOf("%") ? b / 100 : b } function d(b, c, d) { if (!b || !b.length) return 0; if (b._ck) return b.byteOffset; d || (d = a._malloc(b.length * c.BYTES_PER_ELEMENT)); c.set(b, d / c.BYTES_PER_ELEMENT); return d } function e(b, c, d) {
          if (!b || !b.length) return 0; d || (d = a._malloc(b.length * b[0].length * c.BYTES_PER_ELEMENT)); for (var e = 0, l = d / c.BYTES_PER_ELEMENT, f = 0; f < b.length; f++)for (var t = 0; t <
            b[0].length; t++)c[l + e] = b[f][t], e++; return d
        } a.Color = function (a, c, d, e) { void 0 === e && (e = 1); return (b(255 * e) << 24 | b(a) << 16 | b(c) << 8 | b(d) << 0) >>> 0 }; a.getColorComponents = function (a) { return [a >> 16 & 255, a >> 8 & 255, a >> 0 & 255, (a >> 24 & 255) / 255] }; a.parseColorString = function (b, d) {
          b = b.toLowerCase(); if (b.startsWith("#")) {
            d = 255; switch (b.length) {
              case 9: d = parseInt(b.slice(7, 9), 16); case 7: var e = parseInt(b.slice(1, 3), 16); var f = parseInt(b.slice(3, 5), 16); var l = parseInt(b.slice(5, 7), 16); break; case 5: d = 17 * parseInt(b.slice(4, 5), 16);
              case 4: e = 17 * parseInt(b.slice(1, 2), 16), f = 17 * parseInt(b.slice(2, 3), 16), l = 17 * parseInt(b.slice(3, 4), 16)
            }return a.Color(e, f, l, d / 255)
          } return b.startsWith("rgba") ? (b = b.slice(5, -1), b = b.split(","), a.Color(+b[0], +b[1], +b[2], c(b[3]))) : b.startsWith("rgb") ? (b = b.slice(4, -1), b = b.split(","), a.Color(+b[0], +b[1], +b[2], c(b[3]))) : b.startsWith("gray(") || b.startsWith("hsl") || !d || (b = d[b], void 0 === b) ? a.BLACK : b
        }; a.multiplyByAlpha = function (a, c) { return 1 === c ? a : (b((a >> 24 & 255) * c) << 24 | a & 16777215) >>> 0 }; var f = !(new Function("try {return this===window;}catch(e){ return false;}"))(),
          k = {}; a.al = function () { this.Uk = []; this.yk = null; Object.defineProperty(this, "length", { enumerable: !0, get: function () { return this.Uk.length / 4 } }) }; a.al.prototype.push = function (a, b, c, d) { this.yk || this.Uk.push(a, b, c, d) }; a.al.prototype.set = function (b, c, d, e, f) { 0 > b || b >= this.Uk.length / 4 || (b *= 4, this.yk ? (b = this.yk / 4 + b, a.HEAPF32[b] = c, a.HEAPF32[b + 1] = d, a.HEAPF32[b + 2] = e, a.HEAPF32[b + 3] = f) : (this.Uk[b] = c, this.Uk[b + 1] = d, this.Uk[b + 2] = e, this.Uk[b + 3] = f)) }; a.al.prototype.build = function () {
            return this.yk ? this.yk : this.yk = d(this.Uk,
              a.HEAPF32)
          }; a.al.prototype.delete = function () { this.yk && (a._free(this.yk), this.yk = null) }; a.ol = function () { this.ul = []; this.yk = null; Object.defineProperty(this, "length", { enumerable: !0, get: function () { return this.ul.length } }) }; a.ol.prototype.push = function (a) { this.yk || this.ul.push(a) }; a.ol.prototype.set = function (b, c) { 0 > b || b >= this.ul.length || (b *= 4, this.yk ? a.HEAPU32[this.yk / 4 + b] = c : this.ul[b] = c) }; a.ol.prototype.build = function () { return this.yk ? this.yk : this.yk = d(this.ul, a.HEAPU32) }; a.ol.prototype.delete = function () {
          this.yk &&
            (a._free(this.yk), this.yk = null)
          }; a.SkRectBuilder = a.al; a.RSXFormBuilder = a.al; a.SkColorBuilder = a.ol; a.Malloc = function (b, c) { var d = a._malloc(c * b.BYTES_PER_ELEMENT); b = new b(a.HEAPU8.buffer, d, c); b._ck = !0; return b }; a.onRuntimeInitialized = function () {
            function b(a, b, c, d, e) { for (var t = 0; t < a.length; t++)b[t * c + (t * e + d + c) % c] = a[t]; return b } function c(a) { for (var b = a * a, c = Array(b); b--;)c[b] = 0 == b % (a + 1) ? 1 : 0; return c } function f() { for (var a = 0, b = 0; b < arguments.length - 1; b += 2)a += arguments[b] * arguments[b + 1]; return a } function k(a,
              b, c) { for (var d = Array(a.length), e = 0; e < c; e++)for (var t = 0; t < c; t++) { for (var f = 0, l = 0; l < c; l++)f += a[c * e + l] * b[c * l + t]; d[e * c + t] = f } return d } function w(a, b) { for (var c = k(b[0], b[1], a), d = 2; d < b.length;)c = k(c, b[d], a), d++; return c } a.SkMatrix = {}; a.SkMatrix.identity = function () { return c(3) }; a.SkMatrix.invert = function (a) {
                var b = a[0] * a[4] * a[8] + a[1] * a[5] * a[6] + a[2] * a[3] * a[7] - a[2] * a[4] * a[6] - a[1] * a[3] * a[8] - a[0] * a[5] * a[7]; return b ? [(a[4] * a[8] - a[5] * a[7]) / b, (a[2] * a[7] - a[1] * a[8]) / b, (a[1] * a[5] - a[2] * a[4]) / b, (a[5] * a[6] - a[3] * a[8]) /
                  b, (a[0] * a[8] - a[2] * a[6]) / b, (a[2] * a[3] - a[0] * a[5]) / b, (a[3] * a[7] - a[4] * a[6]) / b, (a[1] * a[6] - a[0] * a[7]) / b, (a[0] * a[4] - a[1] * a[3]) / b] : null
              }; a.SkMatrix.mapPoints = function (a, b) { for (var c = 0; c < b.length; c += 2) { var d = b[c], e = b[c + 1], t = a[6] * d + a[7] * e + a[8], f = a[3] * d + a[4] * e + a[5]; b[c] = (a[0] * d + a[1] * e + a[2]) / t; b[c + 1] = f / t } return b }; a.SkMatrix.multiply = function () { return w(3, arguments) }; a.SkMatrix.rotated = function (a, b, c) { b = b || 0; c = c || 0; var d = Math.sin(a); a = Math.cos(a); return [a, -d, f(d, c, 1 - a, b), d, a, f(-d, b, 1 - a, c), 0, 0, 1] }; a.SkMatrix.scaled =
                function (a, d, e, f) { e = e || 0; f = f || 0; var t = b([a, d], c(3), 3, 0, 1); return b([e - a * e, f - d * f], t, 3, 2, 0) }; a.SkMatrix.skewed = function (a, d, e, f) { e = e || 0; f = f || 0; var t = b([a, d], c(3), 3, 1, -1); return b([-a * e, -d * f], t, 3, 2, 0) }; a.SkMatrix.translated = function (a, d) { return b(arguments, c(3), 3, 2, 0) }; a.SkVector = {}; a.SkVector.dot = function (a, b) { return a.map(function (a, c) { return a * b[c] }).reduce(function (a, b) { return a + b }) }; a.SkVector.lengthSquared = function (b) { return a.SkVector.dot(b, b) }; a.SkVector.length = function (b) { return Math.sqrt(a.SkVector.lengthSquared(b)) };
            a.SkVector.mulScalar = function (a, b) { return a.map(function (a) { return a * b }) }; a.SkVector.add = function (a, b) { return a.map(function (a, c) { return a + b[c] }) }; a.SkVector.sub = function (a, b) { return a.map(function (a, c) { return a - b[c] }) }; a.SkVector.dist = function (b, c) { return a.SkVector.length(a.SkVector.sub(b, c)) }; a.SkVector.normalize = function (b) { return a.SkVector.mulScalar(b, 1 / a.SkVector.length(b)) }; a.SkVector.cross = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }; a.SkM44 = {}; a.SkM44.identity =
              function () { return c(4) }; a.SkM44.translated = function (a) { return b(a, c(4), 4, 3, 0) }; a.SkM44.scaled = function (a) { return b(a, c(4), 4, 0, 1) }; a.SkM44.rotated = function (b, c) { return a.SkM44.rotatedUnitSinCos(a.SkVector.normalize(b), Math.sin(c), Math.cos(c)) }; a.SkM44.rotatedUnitSinCos = function (a, b, c) { var d = a[0], e = a[1]; a = a[2]; var f = 1 - c; return [f * d * d + c, f * d * e - b * a, f * d * a + b * e, 0, f * d * e + b * a, f * e * e + c, f * e * a - b * d, 0, f * d * a - b * e, f * e * a + b * d, f * a * a + c, 0, 0, 0, 0, 1] }; a.SkM44.lookat = function (c, d, e) {
                d = a.SkVector.normalize(a.SkVector.sub(d, c));
                e = a.SkVector.normalize(e); e = a.SkVector.normalize(a.SkVector.cross(d, e)); var f = a.SkM44.identity(); b(e, f, 4, 0, 0); b(a.SkVector.cross(e, d), f, 4, 1, 0); b(a.SkVector.mulScalar(d, -1), f, 4, 2, 0); b(c, f, 4, 3, 0); c = a.SkM44.invert(f); return null === c ? a.SkM44.identity() : c
              }; a.SkM44.perspective = function (a, b, c) { var d = 1 / (b - a); c /= 2; c = Math.cos(c) / Math.sin(c); return [c, 0, 0, 0, 0, c, 0, 0, 0, 0, (b + a) * d, 2 * b * a * d, 0, 0, -1, 1] }; a.SkM44.rc = function (a, b, c) { return a[4 * b + c] }; a.SkM44.multiply = function () { return w(4, arguments) }; a.SkM44.invert = function (a) {
                var b =
                  a[0], c = a[4], d = a[8], e = a[12], f = a[1], t = a[5], l = a[9], m = a[13], k = a[2], q = a[6], r = a[10], w = a[14], y = a[3], Fa = a[7], Ga = a[11]; a = a[15]; var Ha = b * t - c * f, Ia = b * l - d * f, Ja = b * m - e * f, Ka = c * l - d * t, La = c * m - e * t, Ma = d * m - e * l, Na = k * Fa - q * y, Oa = k * Ga - r * y, Pa = k * a - w * y, Qa = q * Ga - r * Fa, Ra = q * a - w * Fa, Sa = r * a - w * Ga, Yc = Ha * Sa - Ia * Ra + Ja * Qa + Ka * Pa - La * Oa + Ma * Na, S = 1 / Yc; if (0 === Yc || Infinity === S) return null; Ha *= S; Ia *= S; Ja *= S; Ka *= S; La *= S; Ma *= S; Na *= S; Oa *= S; Pa *= S; Qa *= S; Ra *= S; Sa *= S; b = [t * Sa - l * Ra + m * Qa, l * Pa - f * Sa - m * Oa, f * Ra - t * Pa + m * Na, t * Oa - f * Qa - l * Na, d * Ra - c * Sa - e * Qa, b * Sa - d * Pa +
                    e * Oa, c * Pa - b * Ra - e * Na, b * Qa - c * Oa + d * Na, Fa * Ma - Ga * La + a * Ka, Ga * Ja - y * Ma - a * Ia, y * La - Fa * Ja + a * Ha, Fa * Ia - y * Ka - Ga * Ha, r * La - q * Ma - w * Ka, k * Ma - r * Ja + w * Ia, q * Ja - k * La - w * Ha, k * Ka - q * Ia + r * Ha]; return b.every(function (a) { return Infinity !== a && -Infinity !== a }) ? b : null
              }; a.SkM44.transpose = function (a) { return [a[0], a[4], a[8], a[12], a[1], a[5], a[9], a[13], a[2], a[6], a[10], a[14], a[3], a[7], a[11], a[15]] }; a.SkColorMatrix = {}; a.SkColorMatrix.identity = function () { var a = new Float32Array(20); a[0] = 1; a[6] = 1; a[12] = 1; a[18] = 1; return a }; a.SkColorMatrix.scaled =
                function (a, b, c, d) { var e = new Float32Array(20); e[0] = a; e[6] = b; e[12] = c; e[18] = d; return e }; var y = [[6, 7, 11, 12], [0, 10, 2, 12], [0, 1, 5, 6]]; a.SkColorMatrix.rotated = function (b, c, d) { var e = a.SkColorMatrix.identity(); b = y[b]; e[b[0]] = d; e[b[1]] = c; e[b[2]] = -c; e[b[3]] = d; return e }; a.SkColorMatrix.postTranslate = function (a, b, c, d, e) { a[4] += b; a[9] += c; a[14] += d; a[19] += e; return a }; a.SkColorMatrix.concat = function (a, b) {
                  for (var c = new Float32Array(20), d = 0, e = 0; 20 > e; e += 5) {
                    for (var f = 0; 4 > f; f++)c[d++] = a[e] * b[f] + a[e + 1] * b[f + 5] + a[e + 2] * b[f +
                      10] + a[e + 3] * b[f + 15]; c[d++] = a[e] * b[4] + a[e + 1] * b[9] + a[e + 2] * b[14] + a[e + 3] * b[19] + a[e + 4]
                  } return c
                }; a.SkPath.prototype.addArc = function (a, b, c) { this._addArc(a, b, c); return this }; a.SkPath.prototype.addOval = function (a, b, c) { void 0 === c && (c = 1); this._addOval(a, !!b, c); return this }; a.SkPath.prototype.addPath = function () {
                  var a = Array.prototype.slice.call(arguments), b = a[0], c = !1; "boolean" === typeof a[a.length - 1] && (c = a.pop()); if (1 === a.length) this._addPath(b, 1, 0, 0, 0, 1, 0, 0, 0, 1, c); else if (2 === a.length) a = a[1], this._addPath(b, a[0],
                    a[1], a[2], a[3], a[4], a[5], a[6] || 0, a[7] || 0, a[8] || 1, c); else if (7 === a.length || 10 === a.length) this._addPath(b, a[1], a[2], a[3], a[4], a[5], a[6], a[7] || 0, a[8] || 0, a[9] || 1, c); else return null; return this
                }; a.SkPath.prototype.addPoly = function (b, c) { if (b._ck) { var d = b.byteOffset; b = b.length / 2 } else d = e(b, a.HEAPF32), b = b.length; this._addPoly(d, b, c); a._free(d); return this }; a.SkPath.prototype.addRect = function () {
                  if (1 === arguments.length || 2 === arguments.length) {
                    var a = arguments[0]; this._addRect(a.fLeft, a.fTop, a.fRight, a.fBottom,
                      arguments[1] || !1)
                  } else if (4 === arguments.length || 5 === arguments.length) a = arguments, this._addRect(a[0], a[1], a[2], a[3], a[4] || !1); else return null; return this
                }; a.SkPath.prototype.addRoundRect = function () {
                  var b = arguments; if (3 === b.length || 6 === b.length) var c = b[b.length - 2]; else if (6 === b.length || 7 === b.length) { c = b[b.length - 3]; var e = b[b.length - 2]; c = [c, e, c, e, c, e, c, e] } else return null; if (8 !== c.length) return null; c = d(c, a.HEAPF32); if (3 === b.length || 4 === b.length) {
                    e = b[0]; var f = b[b.length - 1]; this._addRoundRect(e.fLeft,
                      e.fTop, e.fRight, e.fBottom, c, f)
                  } else 6 !== b.length && 7 !== b.length || this._addRoundRect(b[0], b[1], b[2], b[3], c, f); a._free(c); return this
                }; a.SkPath.prototype.arc = function (b, c, d, e, f, l) { b = a.LTRBRect(b - d, c - d, b + d, c + d); f = (f - e) / Math.PI * 180 - 360 * !!l; l = new a.SkPath; l.addArc(b, e / Math.PI * 180, f); this.addPath(l, !0); l.delete(); return this }; a.SkPath.prototype.arcTo = function () {
                  var a = arguments; if (5 === a.length) this._arcTo(a[0], a[1], a[2], a[3], a[4]); else if (4 === a.length) this._arcTo(a[0], a[1], a[2], a[3]); else if (7 === a.length) this._arcTo(a[0],
                    a[1], a[2], !!a[3], !!a[4], a[5], a[6]); else throw "Invalid args for arcTo. Expected 4, 5, or 7, got " + a.length; return this
                }; a.SkPath.prototype.close = function () { this._close(); return this }; a.SkPath.prototype.conicTo = function (a, b, c, d, e) { this._conicTo(a, b, c, d, e); return this }; a.SkPath.prototype.cubicTo = function (a, b, c, d, e, f) { this._cubicTo(a, b, c, d, e, f); return this }; a.SkPath.prototype.dash = function (a, b, c) { return this._dash(a, b, c) ? this : null }; a.SkPath.prototype.lineTo = function (a, b) { this._lineTo(a, b); return this };
            a.SkPath.prototype.moveTo = function (a, b) { this._moveTo(a, b); return this }; a.SkPath.prototype.offset = function (a, b) { this._transform(1, 0, a, 0, 1, b, 0, 0, 1); return this }; a.SkPath.prototype.quadTo = function (a, b, c, d) { this._quadTo(a, b, c, d); return this }; a.SkPath.prototype.rArcTo = function (a, b, c, d, e, f, l) { this._rArcTo(a, b, c, d, e, f, l); return this }; a.SkPath.prototype.rConicTo = function (a, b, c, d, e) { this._rConicTo(a, b, c, d, e); return this }; a.SkPath.prototype.rCubicTo = function (a, b, c, d, e, f) { this._rCubicTo(a, b, c, d, e, f); return this };
            a.SkPath.prototype.rLineTo = function (a, b) { this._rLineTo(a, b); return this }; a.SkPath.prototype.rMoveTo = function (a, b) { this._rMoveTo(a, b); return this }; a.SkPath.prototype.rQuadTo = function (a, b, c, d) { this._rQuadTo(a, b, c, d); return this }; a.SkPath.prototype.stroke = function (b) { b = b || {}; b.width = b.width || 1; b.miter_limit = b.miter_limit || 4; b.cap = b.cap || a.StrokeCap.Butt; b.join = b.join || a.StrokeJoin.Miter; b.precision = b.precision || 1; return this._stroke(b) ? this : null }; a.SkPath.prototype.transform = function () {
              if (1 === arguments.length) {
                var a =
                  arguments[0]; this._transform(a[0], a[1], a[2], a[3], a[4], a[5], a[6] || 0, a[7] || 0, a[8] || 1)
              } else if (6 === arguments.length || 9 === arguments.length) a = arguments, this._transform(a[0], a[1], a[2], a[3], a[4], a[5], a[6] || 0, a[7] || 0, a[8] || 1); else throw "transform expected to take 1 or 9 arguments. Got " + arguments.length; return this
            }; a.SkPath.prototype.trim = function (a, b, c) { return this._trim(a, b, !!c) ? this : null }; a.SkVertices.prototype.applyBones = function (b) {
              var c = a.HEAPF32; var d = void 0; if (b && b.length && b[0].length) {
                d || (d = a._malloc(b.length *
                  b[0].length * b[0][0].length * c.BYTES_PER_ELEMENT)); for (var e = 0, f = d / c.BYTES_PER_ELEMENT, l = 0; l < b.length; l++)for (var m = 0; m < b[0].length; m++)for (var k = 0; k < b[0][0].length; k++)c[f + e] = b[l][m][k], e++; c = d
              } else c = 0; b = this._applyBones(c, b.length); a._free(c); return b
            }; a.SkImage.prototype.encodeToData = function () {
              if (!arguments.length) return this._encodeToData(); if (2 === arguments.length) { var a = arguments; return this._encodeToDataWithFormat(a[0], a[1]) } throw "encodeToData expected to take 0 or 2 arguments. Got " + arguments.length;
            }; a.SkImage.prototype.makeShader = function (a, b, c) { return c ? (6 === c.length && c.push(0, 0, 1), this._makeShader(a, b, c)) : this._makeShader(a, b) }; a.SkImage.prototype.readPixels = function (b, c, d) {
              switch (b.colorType) { case a.ColorType.RGBA_8888: var e = 4 * b.width; break; case a.ColorType.RGBA_F32: e = 16 * b.width; break; default: return }var f = e * b.height, l = a._malloc(f); if (!this._readPixels(b, l, e, c, d)) return null; c = null; switch (b.colorType) {
                case a.ColorType.RGBA_8888: c = (new Uint8Array(a.HEAPU8.buffer, l, f)).slice(); break; case a.ColorType.RGBA_F32: c =
                  (new Float32Array(a.HEAPU8.buffer, l, f)).slice()
              }a._free(l); return c
            }; a.SkCanvas.prototype.drawAtlas = function (b, c, e, f, l, m) { if (b && f && c && e) { l || (l = a.BlendMode.SrcOver); var k; c.build ? k = c.build() : k = d(c, a.HEAPF32); var q; e.build ? q = e.build() : q = d(e, a.HEAPF32); var t = 0; m && (m.build ? t = m.build() : t = d(m, a.HEAPU32)); this._drawAtlas(b, q, k, t, e.length, l, f); k && !c.build && a._free(k); q && !e.build && a._free(q); t && !m.build && a._free(t) } }; a.SkCanvas.prototype.drawPoints = function (b, c, d) {
              if (c._ck) { var f = c.byteOffset; c = c.length / 2 } else f =
                e(c, a.HEAPF32), c = c.length; this._drawPoints(b, f, c, d); a._free(f)
            }; a.SkCanvas.prototype.readPixels = function (b, c, d, e, f, l, m) { f = f || a.AlphaType.Unpremul; l = l || a.ColorType.RGBA_8888; m = m || 4 * d; var k = e * m, q = a._malloc(k); if (!this._readPixels({ width: d, height: e, colorType: l, alphaType: f }, q, m, b, c)) return a._free(q), null; b = (new Uint8Array(a.HEAPU8.buffer, q, k)).slice(); a._free(q); return b }; a.SkCanvas.prototype.writePixels = function (b, c, d, e, f, l, m) {
              if (b.byteLength % (c * d)) throw "pixels length must be a multiple of the srcWidth * srcHeight";
              var k = b.byteLength / (c * d); l = l || a.AlphaType.Unpremul; m = m || a.ColorType.RGBA_8888; var q = k * c; k = a._malloc(b.byteLength); a.HEAPU8.set(b, k); b = this._writePixels({ width: c, height: d, colorType: m, alphaType: l }, k, q, e, f); a._free(k); return b
            }; a.SkColorFilter.MakeMatrix = function (b) { if (b && 20 === b.length) { b = d(b, a.HEAPF32); var c = a.SkColorFilter._makeMatrix(b); a._free(b); return c } }; a.SkShader.Blend = function (a, b, c, d) { return d ? this._Blend(a, b, c, d) : this._Blend(a, b, c) }; a.SkShader.Lerp = function (a, b, c, d) {
              return d ? this._Lerp(a,
                b, c, d) : this._Lerp(a, b, c)
            }; a.SkSurface.prototype.captureFrameAsSkPicture = function (b) { var c = new a.SkPictureRecorder, d = c.beginRecording(a.LTRBRect(0, 0, this.width(), this.height())); b(d); b = c.finishRecordingAsPicture(); c.delete(); return b }; a.SkSurface.prototype.requestAnimationFrame = function (b) { this.pl || (this.pl = this.getCanvas()); window.requestAnimationFrame(function () { void 0 !== this.Wk && a.setCurrentContext(this.Wk); b(this.pl); this.flush() }.bind(this)) }; a.SkSurface.prototype.drawOnce = function (b) {
            this.pl ||
              (this.pl = this.getCanvas()); window.requestAnimationFrame(function () { void 0 !== this.Wk && a.setCurrentContext(this.Wk); b(this.pl); this.flush(); this.dispose() }.bind(this))
            }; a.Fk && a.Fk.forEach(function (a) { a() })
          }; a.LTRBRect = function (a, b, c, d) { return { fLeft: a, fTop: b, fRight: c, fBottom: d } }; a.XYWHRect = function (a, b, c, d) { return { fLeft: a, fTop: b, fRight: a + c, fBottom: b + d } }; a.RRectXY = function (a, b, c) { return { rect: a, rx1: b, ry1: c, rx2: b, ry2: c, rx3: b, ry3: c, rx4: b, ry4: c } }; a.MakePathFromCmds = function (b) {
            for (var c = 0, e = 0; e < b.length; e++)c +=
              b[e].length; if (k[c]) var f = k[c]; else f = new Float32Array(c), k[c] = f; var l = 0; for (e = 0; e < b.length; e++)for (var y = 0; y < b[e].length; y++)f[l] = b[e][y], l++; b = [d(f, a.HEAPF32), c]; c = a._MakePathFromCmds(b[0], b[1]); a._free(b[0]); return c
          }; a.MakeSkDashPathEffect = function (b, c) { c || (c = 0); if (!b.length || 1 === b.length % 2) throw "Intervals array must have even length"; var e = d(b, a.HEAPF32); b = a._MakeSkDashPathEffect(e, b.length, c); a._free(e); return b }; a.MakeAnimatedImageFromEncoded = function (b) {
            b = new Uint8Array(b); var c = a._malloc(b.byteLength);
            a.HEAPU8.set(b, c); return (b = a._decodeAnimatedImage(c, b.byteLength)) ? b : null
          }; a.MakeImageFromEncoded = function (b) { b = new Uint8Array(b); var c = a._malloc(b.byteLength); a.HEAPU8.set(b, c); return (b = a._decodeImage(c, b.byteLength)) ? b : null }; a.MakeImage = function (b, c, e, f, k) { var l = b.length / (c * e); e = { width: c, height: e, alphaType: f, colorType: k }; f = d(b, a.HEAPU8); return a._MakeImage(e, f, b.length, c * l) }; a.MakeLinearGradientShader = function (b, c, e, f, k, y, t) {
            var l = d(e, a.HEAPU32); f = d(f, a.HEAPF32); t = t || 0; y ? (6 === y.length && y.push(0,
              0, 1), b = a._MakeLinearGradientShader(b, c, l, f, e.length, k, t, y)) : b = a._MakeLinearGradientShader(b, c, l, f, e.length, k, t); a._free(l); a._free(f); return b
          }; a.MakeRadialGradientShader = function (b, c, e, f, k, y, t) { var l = d(e, a.HEAPU32); f = d(f, a.HEAPF32); t = t || 0; y ? (6 === y.length && y.push(0, 0, 1), b = a._MakeRadialGradientShader(b, c, l, f, e.length, k, t, y)) : b = a._MakeRadialGradientShader(b, c, l, f, e.length, k, t); a._free(l); a._free(f); return b }; a.MakeTwoPointConicalGradientShader = function (b, c, e, f, k, y, t, D, W) {
            var l = d(k, a.HEAPU32); y = d(y,
              a.HEAPF32); W = W || 0; D ? (6 === D.length && D.push(0, 0, 1), b = a._MakeTwoPointConicalGradientShader(b, c, e, f, l, y, k.length, t, W, D)) : b = a._MakeTwoPointConicalGradientShader(b, c, e, f, l, y, k.length, t, W); a._free(l); a._free(y); return b
          }; a.MakeSkVertices = function (b, c, f, k, w, y, t, D) {
            var l = t && t.length || 0, m = 0; f && f.length && (m |= 1); k && k.length && (m |= 2); w && w.length && (m |= 4); void 0 === D || D || (m |= 8); b = new a._SkVerticesBuilder(b, c.length, l, m); e(c, a.HEAPF32, b.positions()); b.texCoords() && e(f, a.HEAPF32, b.texCoords()); b.colors() && d(k, a.HEAPU32,
              b.colors()); b.boneIndices() && e(w, a.HEAP32, b.boneIndices()); b.boneWeights() && e(y, a.HEAPF32, b.boneWeights()); b.indices() && d(t, a.HEAPU16, b.indices()); return b.detach()
          }; (function (a) {
          a.Fk = a.Fk || []; a.Fk.push(function () {
            a.Paragraph.prototype.getRectsForRange = function (b, c, d, e) { b = this._getRectsForRange(b, c, d, e); if (!b || !b.length) return []; c = []; for (d = 0; d < b.length; d += 5)e = a.LTRBRect(b[d], b[d + 1], b[d + 2], b[d + 3]), e.direction = 1 === b[d + 4] ? a.TextDirection.RTL : a.TextDirection.LTR, c.push(e); a._free(b.byteOffset); return c };
            a.ParagraphStyle = function (b) { b.disableHinting = b.disableHinting || !1; if (b.ellipsis) { var c = b.ellipsis, d = ba(c) + 1, e = a._malloc(d); h(c, e, d); b._ellipsisPtr = e; b._ellipsisLen = d } else b._ellipsisPtr = 0, b._ellipsisLen = 0; b.heightMultiplier = b.heightMultiplier || 0; b.maxLines = b.maxLines || 0; b.textAlign = b.textAlign || a.TextAlign.Start; b.textDirection = b.textDirection || a.TextDirection.LTR; b.textStyle = a.TextStyle(b.textStyle); return b }; a.TextStyle = function (b) {
            b.backgroundColor = b.backgroundColor || 0; void 0 === b.color && (b.color =
              a.BLACK); b.decoration = b.decoration || 0; b.decorationThickness = b.decorationThickness || 0; b.fontSize = b.fontSize || 0; if (Array.isArray(b.fontFamilies) && b.fontFamilies.length) { var c; if ((c = b.fontFamilies) && c.length) { for (var e = [], f = 0; f < c.length; f++) { var l = c[f], k = ba(l) + 1, m = a._malloc(k); h(l, m, k); e.push(m) } c = d(e, a.HEAPU32) } else c = 0; b._fontFamilies = c; b._numFontFamilies = b.fontFamilies.length } else b._fontFamilies = 0, b._numFontFamilies = 0; c = (c = b.fontStyle) || {}; void 0 === c.weight && (c.weight = a.FontWeight.Normal); c.width =
                c.width || a.FontWidth.Normal; c.slant = c.slant || a.FontSlant.Upright; b.fontStyle = c; b.foregroundColor = b.foregroundColor || 0; return b
            }
          })
          })(g); a.Fk = a.Fk || []; a.Fk.push(function () {
            a.SkCanvas.prototype.drawText = function (b, c, d, e, f) { if ("string" === typeof b) { var l = ba(b), k = a._malloc(l + 1); h(b, k, l + 1); this._drawSimpleText(k, l, c, d, f, e) } else this._drawShapedText(b, c, d, e) }; a.SkFont.prototype.getWidths = function (b) {
              var c = b.length + 1, d = ba(b) + 1, e = a._malloc(d); h(b, e, d); b = a._malloc(4 * c); if (!this._getWidths(e, d, c, b)) return a._free(e),
                a._free(b), null; c = new Float32Array(a.HEAPU8.buffer, b, c); c = Array.from(c); a._free(e); a._free(b); return c
            }; a.SkFontMgr.FromData = function () { if (!arguments.length) return null; var b = arguments; 1 === b.length && Array.isArray(b[0]) && (b = arguments[0]); if (!b.length) return null; for (var c = [], e = [], f = 0; f < b.length; f++) { var k = new Uint8Array(b[f]), y = d(k, a.HEAPU8); c.push(y); e.push(k.byteLength) } c = d(c, a.HEAPU32); e = d(e, a.HEAPU32); b = a.SkFontMgr._fromData(c, e, b.length); a._free(c); a._free(e); return b }; a.SkFontMgr.prototype.MakeTypefaceFromData =
              function (b) { b = new Uint8Array(b); var c = d(b, a.HEAPU8); return (b = this._makeTypefaceFromData(c, b.byteLength)) ? b : null }; a.SkTextBlob.MakeOnPath = function (b, c, d, e) {
                if (b && b.length && c && c.countPoints()) {
                  if (1 === c.countPoints()) return this.MakeFromText(b, d); e || (e = 0); var f = d.getWidths(b), l = new a.RSXFormBuilder; c = new a.SkPathMeasure(c, !1, 1); for (var k = 0; k < b.length; k++) {
                    var m = f[k]; e += m / 2; if (e > c.getLength()) { if (!c.nextContour()) { b = b.substring(0, k); break } e = m / 2 } var q = c.getPosTan(e), r = q[2], ib = q[3]; l.push(r, ib, q[0] - m / 2 *
                      r, q[1] - m / 2 * ib); e += m / 2
                  } b = this.MakeFromRSXform(b, l, d); l.delete(); c.delete(); return b
                }
              }; a.SkTextBlob.MakeFromRSXform = function (b, c, d) { var e = ba(b) + 1, f = a._malloc(e); h(b, f, e); b = c.build(); d = a.SkTextBlob._MakeFromRSXform(f, e - 1, b, d, a.TextEncoding.UTF8); if (!d) return null; var l = d.delete.bind(d); d.delete = function () { a._free(f); l() }; return d }; a.SkTextBlob.MakeFromText = function (b, c) {
                var d = ba(b) + 1, e = a._malloc(d); h(b, e, d); b = a.SkTextBlob._MakeFromText(e, d - 1, c, a.TextEncoding.UTF8); if (!b) return null; var f = b.delete.bind(b);
                b.delete = function () { a._free(e); f() }; return b
              }
          }); (function () {
            function b(a) { for (var b = 0; b < a.length; b++)if (void 0 !== a[b] && !Number.isFinite(a[b])) return !1; return !0 } function c(b) { var c = a.getColorComponents(b); b = c[0]; var d = c[1], e = c[2]; c = c[3]; if (1 === c) return b = b.toString(16).toLowerCase(), d = d.toString(16).toLowerCase(), e = e.toString(16).toLowerCase(), b = 1 === b.length ? "0" + b : b, d = 1 === d.length ? "0" + d : d, e = 1 === e.length ? "0" + e : e, "#" + b + d + e; c = 0 === c || 1 === c ? c : c.toFixed(8); return "rgba(" + b + ", " + d + ", " + e + ", " + c + ")" } function d(b) {
              return a.parseColorString(b,
                ne)
            } function e(a) { a = oe.exec(a); if (!a) return null; var b = parseFloat(a[4]), c = 16; switch (a[5]) { case "em": case "rem": c = 16 * b; break; case "pt": c = 4 * b / 3; break; case "px": c = b; break; case "pc": c = 16 * b; break; case "in": c = 96 * b; break; case "cm": c = 96 * b / 2.54; break; case "mm": c = 96 / 25.4 * b; break; case "q": c = 96 / 25.4 / 4 * b; break; case "%": c = 16 / 75 * b }return { style: a[1], variant: a[2], weight: a[3], sizePx: c, family: a[6].trim() } } function k(f) {
            this.rk = f; this.tk = new a.SkPaint; this.tk.setAntiAlias(!0); this.tk.setStrokeMiter(10); this.tk.setStrokeCap(a.StrokeCap.Butt);
              this.tk.setStrokeJoin(a.StrokeJoin.Miter); this.Bl = "10px monospace"; this.Xk = new a.SkFont(null, 10); this.Xk.setSubpixel(!0); this.Hk = this.Ok = a.BLACK; this.el = 0; this.sl = a.TRANSPARENT; this.gl = this.fl = 0; this.tl = this.Sk = 1; this.rl = 0; this.dl = []; this.sk = a.BlendMode.SrcOver; this.Yk = a.FilterQuality.Low; this.ql = !0; this.tk.setStrokeWidth(this.tl); this.tk.setBlendMode(this.sk); this.vk = new a.SkPath; this.xk = a.SkMatrix.identity(); this.bm = []; this.jl = []; this.Tk = function () {
                this.vk.delete(); this.tk.delete(); this.Xk.delete();
                this.jl.forEach(function (a) { a.Tk() })
              }; Object.defineProperty(this, "currentTransform", { enumerable: !0, get: function () { return { a: this.xk[0], c: this.xk[1], e: this.xk[2], b: this.xk[3], d: this.xk[4], f: this.xk[5] } }, set: function (a) { a.a && this.setTransform(a.a, a.b, a.c, a.d, a.e, a.f) } }); Object.defineProperty(this, "fillStyle", { enumerable: !0, get: function () { return Number.isInteger(this.Hk) ? c(this.Hk) : this.Hk }, set: function (a) { "string" === typeof a ? this.Hk = d(a) : a.cl && (this.Hk = a) } }); Object.defineProperty(this, "font", {
                enumerable: !0,
                get: function () { return this.Bl }, set: function (a) { var b = e(a), c = b.family; b.typeface = Ea[c] ? Ea[c][(b.style || "normal") + "|" + (b.variant || "normal") + "|" + (b.weight || "normal")] || Ea[c]["*"] : null; b && (this.Xk.setSize(b.sizePx), this.Xk.setTypeface(b.typeface), this.Bl = a) }
              }); Object.defineProperty(this, "globalAlpha", { enumerable: !0, get: function () { return this.Sk }, set: function (a) { !isFinite(a) || 0 > a || 1 < a || (this.Sk = a) } }); Object.defineProperty(this, "globalCompositeOperation", {
                enumerable: !0, get: function () {
                  switch (this.sk) {
                    case a.BlendMode.SrcOver: return "source-over";
                    case a.BlendMode.DstOver: return "destination-over"; case a.BlendMode.Src: return "copy"; case a.BlendMode.Dst: return "destination"; case a.BlendMode.Clear: return "clear"; case a.BlendMode.SrcIn: return "source-in"; case a.BlendMode.DstIn: return "destination-in"; case a.BlendMode.SrcOut: return "source-out"; case a.BlendMode.DstOut: return "destination-out"; case a.BlendMode.SrcATop: return "source-atop"; case a.BlendMode.DstATop: return "destination-atop"; case a.BlendMode.Xor: return "xor"; case a.BlendMode.Plus: return "lighter";
                    case a.BlendMode.Multiply: return "multiply"; case a.BlendMode.Screen: return "screen"; case a.BlendMode.Overlay: return "overlay"; case a.BlendMode.Darken: return "darken"; case a.BlendMode.Lighten: return "lighten"; case a.BlendMode.ColorDodge: return "color-dodge"; case a.BlendMode.ColorBurn: return "color-burn"; case a.BlendMode.HardLight: return "hard-light"; case a.BlendMode.SoftLight: return "soft-light"; case a.BlendMode.Difference: return "difference"; case a.BlendMode.Exclusion: return "exclusion"; case a.BlendMode.Hue: return "hue";
                    case a.BlendMode.Saturation: return "saturation"; case a.BlendMode.Color: return "color"; case a.BlendMode.Luminosity: return "luminosity"
                  }
                }, set: function (b) {
                  switch (b) {
                    case "source-over": this.sk = a.BlendMode.SrcOver; break; case "destination-over": this.sk = a.BlendMode.DstOver; break; case "copy": this.sk = a.BlendMode.Src; break; case "destination": this.sk = a.BlendMode.Dst; break; case "clear": this.sk = a.BlendMode.Clear; break; case "source-in": this.sk = a.BlendMode.SrcIn; break; case "destination-in": this.sk = a.BlendMode.DstIn;
                      break; case "source-out": this.sk = a.BlendMode.SrcOut; break; case "destination-out": this.sk = a.BlendMode.DstOut; break; case "source-atop": this.sk = a.BlendMode.SrcATop; break; case "destination-atop": this.sk = a.BlendMode.DstATop; break; case "xor": this.sk = a.BlendMode.Xor; break; case "lighter": this.sk = a.BlendMode.Plus; break; case "plus-lighter": this.sk = a.BlendMode.Plus; break; case "plus-darker": throw "plus-darker is not supported"; case "multiply": this.sk = a.BlendMode.Multiply; break; case "screen": this.sk = a.BlendMode.Screen;
                      break; case "overlay": this.sk = a.BlendMode.Overlay; break; case "darken": this.sk = a.BlendMode.Darken; break; case "lighten": this.sk = a.BlendMode.Lighten; break; case "color-dodge": this.sk = a.BlendMode.ColorDodge; break; case "color-burn": this.sk = a.BlendMode.ColorBurn; break; case "hard-light": this.sk = a.BlendMode.HardLight; break; case "soft-light": this.sk = a.BlendMode.SoftLight; break; case "difference": this.sk = a.BlendMode.Difference; break; case "exclusion": this.sk = a.BlendMode.Exclusion; break; case "hue": this.sk = a.BlendMode.Hue;
                      break; case "saturation": this.sk = a.BlendMode.Saturation; break; case "color": this.sk = a.BlendMode.Color; break; case "luminosity": this.sk = a.BlendMode.Luminosity; break; default: return
                  }this.tk.setBlendMode(this.sk)
                }
              }); Object.defineProperty(this, "imageSmoothingEnabled", { enumerable: !0, get: function () { return this.ql }, set: function (a) { this.ql = !!a } }); Object.defineProperty(this, "imageSmoothingQuality", {
                enumerable: !0, get: function () {
                  switch (this.Yk) {
                    case a.FilterQuality.Low: return "low"; case a.FilterQuality.Medium: return "medium";
                    case a.FilterQuality.High: return "high"
                  }
                }, set: function (b) { switch (b) { case "low": this.Yk = a.FilterQuality.Low; break; case "medium": this.Yk = a.FilterQuality.Medium; break; case "high": this.Yk = a.FilterQuality.High } }
              }); Object.defineProperty(this, "lineCap", {
                enumerable: !0, get: function () { switch (this.tk.getStrokeCap()) { case a.StrokeCap.Butt: return "butt"; case a.StrokeCap.Round: return "round"; case a.StrokeCap.Square: return "square" } }, set: function (b) {
                  switch (b) {
                    case "butt": this.tk.setStrokeCap(a.StrokeCap.Butt); break;
                    case "round": this.tk.setStrokeCap(a.StrokeCap.Round); break; case "square": this.tk.setStrokeCap(a.StrokeCap.Square)
                  }
                }
              }); Object.defineProperty(this, "lineDashOffset", { enumerable: !0, get: function () { return this.rl }, set: function (a) { isFinite(a) && (this.rl = a) } }); Object.defineProperty(this, "lineJoin", {
                enumerable: !0, get: function () { switch (this.tk.getStrokeJoin()) { case a.StrokeJoin.Miter: return "miter"; case a.StrokeJoin.Round: return "round"; case a.StrokeJoin.Bevel: return "bevel" } }, set: function (b) {
                  switch (b) {
                    case "miter": this.tk.setStrokeJoin(a.StrokeJoin.Miter);
                      break; case "round": this.tk.setStrokeJoin(a.StrokeJoin.Round); break; case "bevel": this.tk.setStrokeJoin(a.StrokeJoin.Bevel)
                  }
                }
              }); Object.defineProperty(this, "lineWidth", { enumerable: !0, get: function () { return this.tk.getStrokeWidth() }, set: function (a) { 0 >= a || !a || (this.tl = a, this.tk.setStrokeWidth(a)) } }); Object.defineProperty(this, "miterLimit", { enumerable: !0, get: function () { return this.tk.getStrokeMiter() }, set: function (a) { 0 >= a || !a || this.tk.setStrokeMiter(a) } }); Object.defineProperty(this, "shadowBlur", {
                enumerable: !0,
                get: function () { return this.el }, set: function (a) { 0 > a || !isFinite(a) || (this.el = a) }
              }); Object.defineProperty(this, "shadowColor", { enumerable: !0, get: function () { return c(this.sl) }, set: function (a) { this.sl = d(a) } }); Object.defineProperty(this, "shadowOffsetX", { enumerable: !0, get: function () { return this.fl }, set: function (a) { isFinite(a) && (this.fl = a) } }); Object.defineProperty(this, "shadowOffsetY", { enumerable: !0, get: function () { return this.gl }, set: function (a) { isFinite(a) && (this.gl = a) } }); Object.defineProperty(this, "strokeStyle",
                { enumerable: !0, get: function () { return c(this.Ok) }, set: function (a) { "string" === typeof a ? this.Ok = d(a) : a.cl && (this.Ok = a) } }); this.arc = function (a, b, c, d, e, f) { Kb(this.vk, a, b, c, c, 0, d, e, f) }; this.arcTo = function (a, b, c, d, e) { W(this.vk, a, b, c, d, e) }; this.beginPath = function () { this.vk.delete(); this.vk = new a.SkPath }; this.bezierCurveTo = function (a, c, d, e, f, k) { var l = this.vk; b([a, c, d, e, f, k]) && (l.isEmpty() && l.moveTo(a, c), l.cubicTo(a, c, d, e, f, k)) }; this.clearRect = function (b, c, d, e) {
                  this.tk.setStyle(a.PaintStyle.Fill); this.tk.setBlendMode(a.BlendMode.Clear);
                  this.rk.drawRect(a.XYWHRect(b, c, d, e), this.tk); this.tk.setBlendMode(this.sk)
                }; this.clip = function (b, c) { "string" === typeof b ? (c = b, b = this.vk) : b && b.Nl && (b = b.zk); b || (b = this.vk); b = b.copy(); c && "evenodd" === c.toLowerCase() ? b.setFillType(a.FillType.EvenOdd) : b.setFillType(a.FillType.Winding); this.rk.clipPath(b, a.ClipOp.Intersect, !0); b.delete() }; this.closePath = function () { hb(this.vk) }; this.createImageData = function () {
                  if (1 === arguments.length) {
                    var a = arguments[0]; return new t(new Uint8ClampedArray(4 * a.width * a.height),
                      a.width, a.height)
                  } if (2 === arguments.length) { a = arguments[0]; var b = arguments[1]; return new t(new Uint8ClampedArray(4 * a * b), a, b) } throw "createImageData expects 1 or 2 arguments, got " + arguments.length;
                }; this.createLinearGradient = function (a, c, d, e) { if (b(arguments)) { var f = new D(a, c, d, e); this.jl.push(f); return f } }; this.createPattern = function (a, b) { a = new Wc(a, b); this.jl.push(a); return a }; this.createRadialGradient = function (a, c, d, e, f, k) { if (b(arguments)) { var l = new Xc(a, c, d, e, f, k); this.jl.push(l); return l } }; this.om =
                  function () { var b = this.Al(); this.ql ? b.setFilterQuality(this.Yk) : b.setFilterQuality(a.FilterQuality.None); return b }; this.drawImage = function (b) {
                    var c = this.om(); if (3 === arguments.length || 5 === arguments.length) var d = a.XYWHRect(arguments[1], arguments[2], arguments[3] || b.width(), arguments[4] || b.height()), e = a.XYWHRect(0, 0, b.width(), b.height()); else if (9 === arguments.length) d = a.XYWHRect(arguments[5], arguments[6], arguments[7], arguments[8]), e = a.XYWHRect(arguments[1], arguments[2], arguments[3], arguments[4]); else throw "invalid number of args for drawImage, need 3, 5, or 9; got " +
                      arguments.length; this.rk.drawImageRect(b, e, d, c, !1); c.dispose()
                  }; this.ellipse = function (a, b, c, d, e, f, k, l) { Kb(this.vk, a, b, c, d, e, f, k, l) }; this.Al = function () { var b = this.tk.copy(); b.setStyle(a.PaintStyle.Fill); if (Number.isInteger(this.Hk)) { var c = a.multiplyByAlpha(this.Hk, this.Sk); b.setColor(c) } else c = this.Hk.cl(this.xk), b.setColor(a.Color(0, 0, 0, this.Sk)), b.setShader(c); b.dispose = function () { this.delete() }; return b }; this.fill = function (b, c) {
                    "string" === typeof b ? (c = b, b = this.vk) : b && b.Nl && (b = b.zk); if ("evenodd" ===
                      c) this.vk.setFillType(a.FillType.EvenOdd); else { if ("nonzero" !== c && c) throw "invalid fill rule"; this.vk.setFillType(a.FillType.Winding) } b || (b = this.vk); c = this.Al(); var d = this.Dl(c); d && (this.rk.save(), this.rk.concat(this.Cl()), this.rk.drawPath(b, d), this.rk.restore(), d.dispose()); this.rk.drawPath(b, c); c.dispose()
                  }; this.fillRect = function (b, c, d, e) { var f = this.Al(); this.rk.drawRect(a.XYWHRect(b, c, d, e), f); f.dispose() }; this.fillText = function (b, c, d) {
                    var e = this.Al(); b = a.SkTextBlob.MakeFromText(b, this.Xk); var f =
                      this.Dl(e); f && (this.rk.save(), this.rk.concat(this.Cl()), this.rk.drawTextBlob(b, c, d, f), this.rk.restore(), f.dispose()); this.rk.drawTextBlob(b, c, d, e); b.delete(); e.dispose()
                  }; this.getImageData = function (a, b, c, d) { return (a = this.rk.readPixels(a, b, c, d)) ? new t(new Uint8ClampedArray(a.buffer), c, d) : null }; this.getLineDash = function () { return this.dl.slice() }; this.cm = function (b) { var c = a.SkMatrix.invert(this.xk); a.SkMatrix.mapPoints(c, b); return b }; this.isPointInPath = function (b, c, d) {
                    var e = arguments; if (3 === e.length) var f =
                      this.vk; else if (4 === e.length) f = e[0], b = e[1], c = e[2], d = e[3]; else throw "invalid arg count, need 3 or 4, got " + e.length; if (!isFinite(b) || !isFinite(c)) return !1; d = d || "nonzero"; if ("nonzero" !== d && "evenodd" !== d) return !1; e = this.cm([b, c]); b = e[0]; c = e[1]; f.setFillType("nonzero" === d ? a.FillType.Winding : a.FillType.EvenOdd); return f.contains(b, c)
                  }; this.isPointInStroke = function (b, c) {
                    var d = arguments; if (2 === d.length) var e = this.vk; else if (3 === d.length) e = d[0], b = d[1], c = d[2]; else throw "invalid arg count, need 2 or 3, got " +
                      d.length; if (!isFinite(b) || !isFinite(c)) return !1; d = this.cm([b, c]); b = d[0]; c = d[1]; e = e.copy(); e.setFillType(a.FillType.Winding); e.stroke({ width: this.lineWidth, miter_limit: this.miterLimit, cap: this.tk.getStrokeCap(), join: this.tk.getStrokeJoin(), precision: .3 }); d = e.contains(b, c); e.delete(); return d
                  }; this.lineTo = function (a, b) { Vc(this.vk, a, b) }; this.measureText = function (a) { return { width: this.Xk.measureText(a) } }; this.moveTo = function (a, c) { var d = this.vk; b([a, c]) && d.moveTo(a, c) }; this.putImageData = function (c, d, e,
                    f, k, l, m) { if (b([d, e, f, k, l, m])) if (void 0 === f) this.rk.writePixels(c.data, c.width, c.height, d, e); else if (f = f || 0, k = k || 0, l = l || c.width, m = m || c.height, 0 > l && (f += l, l = Math.abs(l)), 0 > m && (k += m, m = Math.abs(m)), 0 > f && (l += f, f = 0), 0 > k && (m += k, k = 0), !(0 >= l || 0 >= m)) { c = a.MakeImage(c.data, c.width, c.height, a.AlphaType.Unpremul, a.ColorType.RGBA_8888); var t = a.XYWHRect(f, k, l, m); d = a.XYWHRect(d + f, e + k, l, m); e = a.SkMatrix.invert(this.xk); this.rk.save(); this.rk.concat(e); this.rk.drawImageRect(c, t, d, null, !1); this.rk.restore(); c.delete() } };
              this.quadraticCurveTo = function (a, c, d, e) { var f = this.vk; b([a, c, d, e]) && (f.isEmpty() && f.moveTo(a, c), f.quadTo(a, c, d, e)) }; this.rect = function (a, c, d, e) { var f = this.vk; b([a, c, d, e]) && f.addRect(a, c, a + d, c + e) }; this.resetTransform = function () { this.vk.transform(this.xk); var b = a.SkMatrix.invert(this.xk); this.rk.concat(b); this.xk = this.rk.getTotalMatrix() }; this.restore = function () {
                var b = this.bm.pop(); if (b) {
                  var c = a.SkMatrix.multiply(this.xk, a.SkMatrix.invert(b.sm)); this.vk.transform(c); this.tk.delete(); this.tk = b.Om; this.dl =
                    b.Jm; this.tl = b.Zm; this.Ok = b.Ym; this.Hk = b.fs; this.fl = b.Wm; this.gl = b.Xm; this.el = b.Tm; this.sl = b.Vm; this.Sk = b.ym; this.sk = b.zm; this.rl = b.Km; this.ql = b.Hm; this.Yk = b.Im; this.Bl = b.xm; this.rk.restore(); this.xk = this.rk.getTotalMatrix()
                }
              }; this.rotate = function (b) { if (isFinite(b)) { var c = a.SkMatrix.rotated(-b); this.vk.transform(c); this.rk.rotate(b / Math.PI * 180, 0, 0); this.xk = this.rk.getTotalMatrix() } }; this.save = function () {
                if (this.Hk.bl) { var a = this.Hk.bl(); this.jl.push(a) } else a = this.Hk; if (this.Ok.bl) {
                  var b = this.Ok.bl();
                  this.jl.push(b)
                } else b = this.Ok; this.bm.push({ sm: this.xk.slice(), Jm: this.dl.slice(), Zm: this.tl, Ym: b, fs: a, Wm: this.fl, Xm: this.gl, Tm: this.el, Vm: this.sl, ym: this.Sk, Km: this.rl, zm: this.sk, Hm: this.ql, Im: this.Yk, Om: this.tk.copy(), xm: this.Bl }); this.rk.save()
              }; this.scale = function (c, d) { if (b(arguments)) { var e = a.SkMatrix.scaled(1 / c, 1 / d); this.vk.transform(e); this.rk.scale(c, d); this.xk = this.rk.getTotalMatrix() } }; this.setLineDash = function (a) {
                for (var b = 0; b < a.length; b++)if (!isFinite(a[b]) || 0 > a[b]) return; 1 === a.length %
                  2 && Array.prototype.push.apply(a, a); this.dl = a
              }; this.setTransform = function (a, c, d, e, f, k) { b(arguments) && (this.resetTransform(), this.transform(a, c, d, e, f, k)) }; this.Cl = function () { return a.SkMatrix.translated(this.fl / this.xk[0], this.gl / this.xk[4]) }; this.Dl = function (b) {
                var c = a.multiplyByAlpha(this.sl, this.Sk); if (!a.getColorComponents(c)[3] || !(this.el || this.gl || this.fl)) return null; b = b.copy(); b.setColor(c); var d = a.SkMaskFilter.MakeBlur(a.BlurStyle.Normal, this.el / 2, !1); b.setMaskFilter(d); b.dispose = function () {
                  d.delete();
                  this.delete()
                }; return b
              }; this.Pl = function () { var b = this.tk.copy(); b.setStyle(a.PaintStyle.Stroke); if (Number.isInteger(this.Ok)) { var c = a.multiplyByAlpha(this.Ok, this.Sk); b.setColor(c) } else c = this.Ok.cl(this.xk), b.setColor(a.Color(0, 0, 0, this.Sk)), b.setShader(c); b.setStrokeWidth(this.tl); if (this.dl.length) { var d = a.MakeSkDashPathEffect(this.dl, this.rl); b.setPathEffect(d) } b.dispose = function () { d && d.delete(); this.delete() }; return b }; this.stroke = function (a) {
                a = a ? a.zk : this.vk; var b = this.Pl(), c = this.Dl(b); c &&
                  (this.rk.save(), this.rk.concat(this.Cl()), this.rk.drawPath(a, c), this.rk.restore(), c.dispose()); this.rk.drawPath(a, b); b.dispose()
              }; this.strokeRect = function (b, c, d, e) { var f = this.Pl(); this.rk.drawRect(a.XYWHRect(b, c, d, e), f); f.dispose() }; this.strokeText = function (b, c, d) { var e = this.Pl(); b = a.SkTextBlob.MakeFromText(b, this.Xk); var f = this.Dl(e); f && (this.rk.save(), this.rk.concat(this.Cl()), this.rk.drawTextBlob(b, c, d, f), this.rk.restore(), f.dispose()); this.rk.drawTextBlob(b, c, d, e); b.delete(); e.dispose() }; this.translate =
                function (c, d) { if (b(arguments)) { var e = a.SkMatrix.translated(-c, -d); this.vk.transform(e); this.rk.translate(c, d); this.xk = this.rk.getTotalMatrix() } }; this.transform = function (b, c, d, e, f, k) { b = [b, d, f, c, e, k, 0, 0, 1]; c = a.SkMatrix.invert(b); this.vk.transform(c); this.rk.concat(b); this.xk = this.rk.getTotalMatrix() }; this.addHitRegion = function () { }; this.clearHitRegions = function () { }; this.drawFocusIfNeeded = function () { }; this.removeHitRegion = function () { }; this.scrollPathIntoView = function () { }; Object.defineProperty(this, "canvas",
                  { value: null, writable: !1 })
            } function y(b) {
            this.Ql = b; this.Wk = new k(b.getCanvas()); this.El = []; this.lm = a.SkFontMgr.RefDefault(); this.decodeImage = function (b) { b = a.MakeImageFromEncoded(b); if (!b) throw "Invalid input"; this.El.push(b); return b }; this.loadFont = function (a, b) { a = this.lm.MakeTypefaceFromData(a); if (!a) return null; this.El.push(a); var c = (b.style || "normal") + "|" + (b.variant || "normal") + "|" + (b.weight || "normal"); b = b.family; Ea[b] || (Ea[b] = { "*": a }); Ea[b][c] = a }; this.makePath2D = function (a) {
              a = new me(a); this.El.push(a.zk);
              return a
            }; this.getContext = function (a) { return "2d" === a ? this.Wk : null }; this.toDataURL = function (b, c) { this.Ql.flush(); var d = this.Ql.makeImageSnapshot(); if (d) { b = b || "image/png"; var e = a.ImageFormat.PNG; "image/jpeg" === b && (e = a.ImageFormat.JPEG); if (c = d.encodeToData(e, c || .92)) { c = a.getSkDataBytes(c); b = "data:" + b + ";base64,"; if (f) c = Buffer.from(c).toString("base64"); else { d = 0; e = c.length; for (var k = "", l; d < e;)l = c.slice(d, Math.min(d + 32768, e)), k += String.fromCharCode.apply(null, l), d += 32768; c = btoa(k) } return b + c } } }; this.dispose =
              function () { this.Wk.Tk(); this.El.forEach(function (a) { a.delete() }); this.Ql.dispose() }
            } function t(a, b, c) { if (!b || 0 === c) throw "invalid dimensions, width and height must be non-zero"; if (a.length % 4) throw "arr must be a multiple of 4"; c = c || a.length / (4 * b); Object.defineProperty(this, "data", { value: a, writable: !1 }); Object.defineProperty(this, "height", { value: c, writable: !1 }); Object.defineProperty(this, "width", { value: b, writable: !1 }) } function D(b, c, e, f) {
            this.Bk = null; this.Kk = []; this.Ek = []; this.addColorStop = function (a,
              b) { if (0 > a || 1 < a || !isFinite(a)) throw "offset must be between 0 and 1 inclusively"; b = d(b); var c = this.Ek.indexOf(a); if (-1 !== c) this.Kk[c] = b; else { for (c = 0; c < this.Ek.length && !(this.Ek[c] > a); c++); this.Ek.splice(c, 0, a); this.Kk.splice(c, 0, b) } }; this.bl = function () { var a = new D(b, c, e, f); a.Kk = this.Kk.slice(); a.Ek = this.Ek.slice(); return a }; this.Tk = function () { this.Bk && (this.Bk.delete(), this.Bk = null) }; this.cl = function (d) {
                var k = [b, c, e, f]; a.SkMatrix.mapPoints(d, k); d = k[0]; var l = k[1], m = k[2]; k = k[3]; this.Tk(); return this.Bk =
                  a.MakeLinearGradientShader([d, l], [m, k], this.Kk, this.Ek, a.TileMode.Clamp)
              }
            } function W(a, c, d, e, f, k) { if (b([c, d, e, f, k])) { if (0 > k) throw "radii cannot be negative"; a.isEmpty() && a.moveTo(c, d); a.arcTo(c, d, e, f, k) } } function hb(a) { if (!a.isEmpty()) { var b = a.getBounds(); (b.fBottom - b.fTop || b.fRight - b.fLeft) && a.close() } } function ib(b, c, d, e, f, k, l) { l = (l - k) / Math.PI * 180; k = k / Math.PI * 180; c = a.LTRBRect(c - e, d - f, c + e, d + f); 1E-5 > Math.abs(Math.abs(l) - 360) ? (d = l / 2, b.arcTo(c, k, d, !1), b.arcTo(c, k + d, d, !1)) : b.arcTo(c, k, l, !1) } function Kb(c,
              d, e, f, k, l, m, t, q) { if (b([d, e, f, k, l, m, t])) { if (0 > f || 0 > k) throw "radii cannot be negative"; var r = 2 * Math.PI, w = m % r; 0 > w && (w += r); var y = w - m; m = w; t += y; !q && t - m >= r ? t = m + r : q && m - t >= r ? t = m - r : !q && m > t ? t = m + (r - (m - t) % r) : q && m < t && (t = m - (r - (t - m) % r)); l ? (q = a.SkMatrix.rotated(l, d, e), l = a.SkMatrix.rotated(-l, d, e), c.transform(l), ib(c, d, e, f, k, m, t), c.transform(q)) : ib(c, d, e, f, k, m, t) } } function Vc(a, c, d) { b([c, d]) && (a.isEmpty() && a.moveTo(c, d), a.lineTo(c, d)) } function me(c) {
              this.zk = null; "string" === typeof c ? this.zk = a.MakePathFromSVGString(c) :
                c && c.Nl ? this.zk = c.zk.copy() : this.zk = new a.SkPath; this.Nl = function () { return this.zk }; this.addPath = function (a, b) { b || (b = { a: 1, c: 0, e: 0, b: 0, d: 1, f: 0 }); this.zk.addPath(a.zk, [b.a, b.c, b.e, b.b, b.d, b.f]) }; this.arc = function (a, b, c, d, e, f) { Kb(this.zk, a, b, c, c, 0, d, e, f) }; this.arcTo = function (a, b, c, d, e) { W(this.zk, a, b, c, d, e) }; this.bezierCurveTo = function (a, c, d, e, f, k) { var l = this.zk; b([a, c, d, e, f, k]) && (l.isEmpty() && l.moveTo(a, c), l.cubicTo(a, c, d, e, f, k)) }; this.closePath = function () { hb(this.zk) }; this.ellipse = function (a, b, c, d,
                  e, f, k, l) { Kb(this.zk, a, b, c, d, e, f, k, l) }; this.lineTo = function (a, b) { Vc(this.zk, a, b) }; this.moveTo = function (a, c) { var d = this.zk; b([a, c]) && d.moveTo(a, c) }; this.quadraticCurveTo = function (a, c, d, e) { var f = this.zk; b([a, c, d, e]) && (f.isEmpty() && f.moveTo(a, c), f.quadTo(a, c, d, e)) }; this.rect = function (a, c, d, e) { var f = this.zk; b([a, c, d, e]) && f.addRect(a, c, a + d, c + e) }
              } function Wc(c, d) {
              this.Bk = null; this.nm = c; this._transform = a.SkMatrix.identity(); "" === d && (d = "repeat"); switch (d) {
                case "repeat-x": this.hl = a.TileMode.Repeat; this.il =
                  a.TileMode.Decal; break; case "repeat-y": this.hl = a.TileMode.Decal; this.il = a.TileMode.Repeat; break; case "repeat": this.il = this.hl = a.TileMode.Repeat; break; case "no-repeat": this.il = this.hl = a.TileMode.Decal; break; default: throw "invalid repetition mode " + d;
              }this.setTransform = function (a) { a = [a.a, a.c, a.e, a.b, a.d, a.f, 0, 0, 1]; b(a) && (this._transform = a) }; this.bl = function () { var a = new Wc; a.hl = this.hl; a.il = this.il; return a }; this.Tk = function () { this.Bk && (this.Bk.delete(), this.Bk = null) }; this.cl = function () {
                this.Tk(); return this.Bk =
                  this.nm.makeShader(this.hl, this.il, this._transform)
              }
              } function Xc(b, c, e, f, k, l) {
              this.Bk = null; this.Kk = []; this.Ek = []; this.addColorStop = function (a, b) { if (0 > a || 1 < a || !isFinite(a)) throw "offset must be between 0 and 1 inclusively"; b = d(b); var c = this.Ek.indexOf(a); if (-1 !== c) this.Kk[c] = b; else { for (c = 0; c < this.Ek.length && !(this.Ek[c] > a); c++); this.Ek.splice(c, 0, a); this.Kk.splice(c, 0, b) } }; this.bl = function () { var a = new Xc(b, c, e, f, k, l); a.Kk = this.Kk.slice(); a.Ek = this.Ek.slice(); return a }; this.Tk = function () {
              this.Bk && (this.Bk.delete(),
                this.Bk = null)
              }; this.cl = function (d) { var m = [b, c, f, k]; a.SkMatrix.mapPoints(d, m); var t = m[0], q = m[1], r = m[2]; m = m[3]; var w = (Math.abs(d[0]) + Math.abs(d[4])) / 2; d = e * w; w *= l; this.Tk(); return this.Bk = a.MakeTwoPointConicalGradientShader([t, q], d, [r, m], w, this.Kk, this.Ek, a.TileMode.Clamp) }
              } a._testing = {}; var ne = {
                aliceblue: 4293982463, antiquewhite: 4294634455, aqua: 4278255615, aquamarine: 4286578644, azure: 4293984255, beige: 4294309340, bisque: 4294960324, black: 4278190080, blanchedalmond: 4294962125, blue: 4278190335, blueviolet: 4287245282,
                brown: 4289014314, burlywood: 4292786311, cadetblue: 4284456608, chartreuse: 4286578432, chocolate: 4291979550, coral: 4294934352, cornflowerblue: 4284782061, cornsilk: 4294965468, crimson: 4292613180, cyan: 4278255615, darkblue: 4278190219, darkcyan: 4278225803, darkgoldenrod: 4290283019, darkgray: 4289309097, darkgreen: 4278215680, darkgrey: 4289309097, darkkhaki: 4290623339, darkmagenta: 4287299723, darkolivegreen: 4283788079, darkorange: 4294937600, darkorchid: 4288230092, darkred: 4287299584, darksalmon: 4293498490, darkseagreen: 4287609999,
                darkslateblue: 4282924427, darkslategray: 4281290575, darkslategrey: 4281290575, darkturquoise: 4278243025, darkviolet: 4287889619, deeppink: 4294907027, deepskyblue: 4278239231, dimgray: 4285098345, dimgrey: 4285098345, dodgerblue: 4280193279, firebrick: 4289864226, floralwhite: 4294966E3, forestgreen: 4280453922, fuchsia: 4294902015, gainsboro: 4292664540, ghostwhite: 4294506751, gold: 4294956800, goldenrod: 4292519200, gray: 4286611584, green: 4278222848, greenyellow: 4289593135, grey: 4286611584, honeydew: 4293984240, hotpink: 4294928820,
                indianred: 4291648604, indigo: 4283105410, ivory: 4294967280, khaki: 4293977740, lavender: 4293322490, lavenderblush: 4294963445, lawngreen: 4286381056, lemonchiffon: 4294965965, lightblue: 4289583334, lightcoral: 4293951616, lightcyan: 4292935679, lightgoldenrodyellow: 4294638290, lightgray: 4292072403, lightgreen: 4287688336, lightgrey: 4292072403, lightpink: 4294948545, lightsalmon: 4294942842, lightseagreen: 4280332970, lightskyblue: 4287090426, lightslategray: 4286023833, lightslategrey: 4286023833, lightsteelblue: 4289774814, lightyellow: 4294967264,
                lime: 4278255360, limegreen: 4281519410, linen: 4294635750, magenta: 4294902015, maroon: 4286578688, mediumaquamarine: 4284927402, mediumblue: 4278190285, mediumorchid: 4290401747, mediumpurple: 4287852763, mediumseagreen: 4282168177, mediumslateblue: 4286277870, mediumspringgreen: 4278254234, mediumturquoise: 4282962380, mediumvioletred: 4291237253, midnightblue: 4279834992, mintcream: 4294311930, mistyrose: 4294960353, moccasin: 4294960309, navajowhite: 4294958765, navy: 4278190208, oldlace: 4294833638, olive: 4286611456, olivedrab: 4285238819,
                orange: 4294944E3, orangered: 4294919424, orchid: 4292505814, palegoldenrod: 4293847210, palegreen: 4288215960, paleturquoise: 4289720046, palevioletred: 4292571283, papayawhip: 4294963157, peachpuff: 4294957753, peru: 4291659071, pink: 4294951115, plum: 4292714717, powderblue: 4289781990, purple: 4286578816, rebeccapurple: 4284887961, red: 4294901760, rosybrown: 4290547599, royalblue: 4282477025, saddlebrown: 4287317267, salmon: 4294606962, sandybrown: 4294222944, seagreen: 4281240407, seashell: 4294964718, sienna: 4288696877, silver: 4290822336,
                skyblue: 4287090411, slateblue: 4285160141, slategray: 4285563024, slategrey: 4285563024, snow: 4294966010, springgreen: 4278255487, steelblue: 4282811060, tan: 4291998860, teal: 4278222976, thistle: 4292394968, transparent: 0, tomato: 4294927175, turquoise: 4282441936, violet: 4293821166, wheat: 4294303411, white: 4294967295, whitesmoke: 4294309365, yellow: 4294967040, yellowgreen: 4288335154
              }; a._testing.parseColor = d; a._testing.colorToString = c; var oe = /(italic|oblique|normal|)\s*(small-caps|normal|)\s*(bold|bolder|lighter|[1-9]00|normal|)\s*([\d\.]+)(px|pt|pc|in|cm|mm|%|em|ex|ch|rem|q)(.+)/,
                Ea = { "Noto Mono": { "*": null }, monospace: { "*": null } }; a._testing.parseFontString = e; a.MakeCanvas = function (b, c) { return (b = a.MakeSurface(b, c)) ? new y(b) : null }; a.ImageData = function () {
                  if (2 === arguments.length) { var a = arguments[0], b = arguments[1]; return new t(new Uint8ClampedArray(4 * a * b), a, b) } if (3 === arguments.length) {
                    var c = arguments[0]; if (c.prototype.constructor !== Uint8ClampedArray) throw "bytes must be given as a Uint8ClampedArray"; a = arguments[1]; b = arguments[2]; if (c % 4) throw "bytes must be given in a multiple of 4";
                    if (c % a) throw "bytes must divide evenly by width"; if (b && b !== c / (4 * a)) throw "invalid height given"; return new t(c, a, c / (4 * a))
                  } throw "invalid number of arguments - takes 2 or 3, saw " + arguments.length;
                }
          })()
      })(g); var ca = {}, da; for (da in g) g.hasOwnProperty(da) && (ca[da] = g[da]); var ea = "./this.program"; function fa(a, b) { throw b; } var ha = !1, ia = !1, ja = !1, ka = !1, la = !1; ha = "object" === typeof window; ia = "function" === typeof importScripts;
      ja = (ka = "object" === typeof process && "object" === typeof process.versions && "string" === typeof process.versions.node) && !ha && !ia; la = !ha && !ja && !ia; var n = "", ma, na, oa, pa;
      if (ja) n = __dirname + "/", ma = function (a, b) { oa || (oa = require("fs")); pa || (pa = require("path")); a = pa.normalize(a); return oa.readFileSync(a, b ? null : "utf8") }, na = function (a) { a = ma(a, !0); a.buffer || (a = new Uint8Array(a)); assert(a.buffer); return a }, 1 < process.argv.length && (ea = process.argv[1].replace(/\\/g, "/")), process.argv.slice(2), process.on("uncaughtException", function (a) { if (!(a instanceof qa)) throw a; }), process.on("unhandledRejection", p), fa = function (a) { process.exit(a) }, g.inspect = function () { return "[Emscripten Module object]" };
      else if (la) "undefined" != typeof read && (ma = function (a) { return read(a) }), na = function (a) { if ("function" === typeof readbuffer) return new Uint8Array(readbuffer(a)); a = read(a, "binary"); assert("object" === typeof a); return a }, "function" === typeof quit && (fa = function (a) { quit(a) }), "undefined" !== typeof print && ("undefined" === typeof console && (console = {}), console.log = print, console.warn = console.error = "undefined" !== typeof printErr ? printErr : print); else if (ha || ia) ia ? n = self.location.href : document.currentScript && (n = document.currentScript.src),
        _scriptDir && (n = _scriptDir), 0 !== n.indexOf("blob:") ? n = n.substr(0, n.lastIndexOf("/") + 1) : n = "", ma = function (a) { var b = new XMLHttpRequest; b.open("GET", a, !1); b.send(null); return b.responseText }, ia && (na = function (a) { var b = new XMLHttpRequest; b.open("GET", a, !1); b.responseType = "arraybuffer"; b.send(null); return new Uint8Array(b.response) }); var ra = g.print || console.log.bind(console), u = g.printErr || console.warn.bind(console); for (da in ca) ca.hasOwnProperty(da) && (g[da] = ca[da]); ca = null; g.thisProgram && (ea = g.thisProgram);
      g.quit && (fa = g.quit); function sa(a) { ta || (ta = {}); ta[a] || (ta[a] = 1, u(a)) } var ta, ua = 0, va; g.wasmBinary && (va = g.wasmBinary); var wa; g.noExitRuntime && (wa = g.noExitRuntime); "object" !== typeof WebAssembly && u("no native wasm support detected"); var xa, ya = new WebAssembly.Table({ initial: 7513, maximum: 7513, element: "anyfunc" }), za = !1; function assert(a, b) { a || p("Assertion failed: " + b) }
      function Aa(a) { if ("number" === typeof a) { var b = !0; var c = a } else b = !1, c = a.length; var d = Ba(Math.max(c, 1)); if (b) { a = d; assert(0 == (d & 3)); for (b = d + (c & -4); a < b; a += 4)v[a >> 2] = 0; for (b = d + c; a < b;)x[a++ >> 0] = 0; return d } a.subarray || a.slice ? z.set(a, d) : z.set(new Uint8Array(a), d); return d } var Ca = "undefined" !== typeof TextDecoder ? new TextDecoder("utf8") : void 0;
      function Da(a, b, c) { var d = b + c; for (c = b; a[c] && !(c >= d);)++c; if (16 < c - b && a.subarray && Ca) return Ca.decode(a.subarray(b, c)); for (d = ""; b < c;) { var e = a[b++]; if (e & 128) { var f = a[b++] & 63; if (192 == (e & 224)) d += String.fromCharCode((e & 31) << 6 | f); else { var k = a[b++] & 63; e = 224 == (e & 240) ? (e & 15) << 12 | f << 6 | k : (e & 7) << 18 | f << 12 | k << 6 | a[b++] & 63; 65536 > e ? d += String.fromCharCode(e) : (e -= 65536, d += String.fromCharCode(55296 | e >> 10, 56320 | e & 1023)) } } else d += String.fromCharCode(e) } return d } function A(a, b) { return a ? Da(z, a, b) : "" }
      function Ta(a, b, c, d) { if (!(0 < d)) return 0; var e = c; d = c + d - 1; for (var f = 0; f < a.length; ++f) { var k = a.charCodeAt(f); if (55296 <= k && 57343 >= k) { var l = a.charCodeAt(++f); k = 65536 + ((k & 1023) << 10) | l & 1023 } if (127 >= k) { if (c >= d) break; b[c++] = k } else { if (2047 >= k) { if (c + 1 >= d) break; b[c++] = 192 | k >> 6 } else { if (65535 >= k) { if (c + 2 >= d) break; b[c++] = 224 | k >> 12 } else { if (c + 3 >= d) break; b[c++] = 240 | k >> 18; b[c++] = 128 | k >> 12 & 63 } b[c++] = 128 | k >> 6 & 63 } b[c++] = 128 | k & 63 } } b[c] = 0; return c - e } function h(a, b, c) { return Ta(a, z, b, c) }
      function ba(a) { for (var b = 0, c = 0; c < a.length; ++c) { var d = a.charCodeAt(c); 55296 <= d && 57343 >= d && (d = 65536 + ((d & 1023) << 10) | a.charCodeAt(++c) & 1023); 127 >= d ? ++b : b = 2047 >= d ? b + 2 : 65535 >= d ? b + 3 : b + 4 } return b } "undefined" !== typeof TextDecoder && new TextDecoder("utf-16le"); var buffer, x, z, Ua, Va, v, B, C, Wa;
      function Xa(a) { buffer = a; g.HEAP8 = x = new Int8Array(a); g.HEAP16 = Ua = new Int16Array(a); g.HEAP32 = v = new Int32Array(a); g.HEAPU8 = z = new Uint8Array(a); g.HEAPU16 = Va = new Uint16Array(a); g.HEAPU32 = B = new Uint32Array(a); g.HEAPF32 = C = new Float32Array(a); g.HEAPF64 = Wa = new Float64Array(a) } var Ya = g.TOTAL_MEMORY || 134217728; g.wasmMemory ? xa = g.wasmMemory : xa = new WebAssembly.Memory({ initial: Ya / 65536 }); xa && (buffer = xa.buffer); Ya = buffer.byteLength; Xa(buffer); v[452804] = 7054256;
      function Za(a) { for (; 0 < a.length;) { var b = a.shift(); if ("function" == typeof b) b(); else { var c = b.hm; "number" === typeof c ? void 0 === b.Fl ? g.dynCall_v(c) : g.dynCall_vi(c, b.Fl) : c(void 0 === b.Fl ? null : b.Fl) } } } var $a = [], ab = [], bb = [], cb = [], db = !1; function eb() { var a = g.preRun.shift(); $a.unshift(a) } var fb = Math.abs, gb = Math.ceil, jb = Math.floor, kb = Math.min, lb = 0, mb = null, nb = null; g.preloadedImages = {}; g.preloadedAudios = {};
      function p(a) { if (g.onAbort) g.onAbort(a); ra(a); u(a); za = !0; throw new WebAssembly.RuntimeError("abort(" + a + "). Build with -s ASSERTIONS=1 for more info."); } function ob() { var a = pb; return String.prototype.startsWith ? a.startsWith("data:application/octet-stream;base64,") : 0 === a.indexOf("data:application/octet-stream;base64,") } var pb = "canvaskit.wasm"; if (!ob()) { var qb = pb; pb = g.locateFile ? g.locateFile(qb, n) : n + qb }
      function rb() { try { if (va) return new Uint8Array(va); if (na) return na(pb); throw "both async and sync fetching of the wasm failed"; } catch (a) { p(a) } } function sb() { return va || !ha && !ia || "function" !== typeof fetch ? new Promise(function (a) { a(rb()) }) : fetch(pb, { credentials: "same-origin" }).then(function (a) { if (!a.ok) throw "failed to load wasm binary file at '" + pb + "'"; return a.arrayBuffer() }).catch(function () { return rb() }) } var E, F; ab.push({ hm: function () { tb() } });
      function ub(a) { g.___errno_location && (v[g.___errno_location() >> 2] = a) } var vb = [null, [], []], wb = 0; function G() { wb += 4; return v[wb - 4 >> 2] } var xb = {}, yb = {}; function zb(a) { for (; a.length;) { var b = a.pop(); a.pop()(b) } } function Ab(a) { return this.fromWireType(B[a >> 2]) } var Bb = {}, Cb = {}, Db = {}; function Eb(a) { if (void 0 === a) return "_unknown"; a = a.replace(/[^a-zA-Z0-9_]/g, "$"); var b = a.charCodeAt(0); return 48 <= b && 57 >= b ? "_" + a : a }
      function Fb(a, b) { a = Eb(a); return (new Function("body", "return function " + a + '() {\n    "use strict";    return body.apply(this, arguments);\n};\n'))(b) } function Gb(a) { var b = Error, c = Fb(a, function (b) { this.name = a; this.message = b; b = Error(b).stack; void 0 !== b && (this.stack = this.toString() + "\n" + b.replace(/^Error(:[^\n]*)?\n/, "")) }); c.prototype = Object.create(b.prototype); c.prototype.constructor = c; c.prototype.toString = function () { return void 0 === this.message ? this.name : this.name + ": " + this.message }; return c }
      var Hb = void 0; function Ib(a) { throw new Hb(a); } function H(a, b, c) { function d(b) { b = c(b); b.length !== a.length && Ib("Mismatched type converter count"); for (var d = 0; d < a.length; ++d)Jb(a[d], b[d]) } a.forEach(function (a) { Db[a] = b }); var e = Array(b.length), f = [], k = 0; b.forEach(function (a, b) { Cb.hasOwnProperty(a) ? e[b] = Cb[a] : (f.push(a), Bb.hasOwnProperty(a) || (Bb[a] = []), Bb[a].push(function () { e[b] = Cb[a]; ++k; k === f.length && d(e) })) }); 0 === f.length && d(e) } var Lb = {};
      function Mb(a) { switch (a) { case 1: return 0; case 2: return 1; case 4: return 2; case 8: return 3; default: throw new TypeError("Unknown type size: " + a); } } var Nb = void 0; function I(a) { for (var b = ""; z[a];)b += Nb[z[a++]]; return b } var Ob = void 0; function J(a) { throw new Ob(a); }
      function Jb(a, b, c) { c = c || {}; if (!("argPackAdvance" in b)) throw new TypeError("registerType registeredInstance requires argPackAdvance"); var d = b.name; a || J('type "' + d + '" must have a positive integer typeid pointer'); if (Cb.hasOwnProperty(a)) { if (c.Em) return; J("Cannot register type '" + d + "' twice") } Cb[a] = b; delete Db[a]; Bb.hasOwnProperty(a) && (b = Bb[a], delete Bb[a], b.forEach(function (a) { a() })) } function Pb(a) { return { count: a.count, ll: a.ll, wl: a.wl, wk: a.wk, Ak: a.Ak, Jk: a.Jk, Nk: a.Nk } }
      function Qb(a) { J(a.qk.Ak.uk.name + " instance already deleted") } var Rb = !1; function Sb() { } function Tb(a) { --a.count.value; 0 === a.count.value && (a.Jk ? a.Nk.Mk(a.Jk) : a.Ak.uk.Mk(a.wk)) }
      function Ub(a) { if ("undefined" === typeof FinalizationGroup) return Ub = function (a) { return a }, a; Rb = new FinalizationGroup(function (a) { for (var b = a.next(); !b.done; b = a.next())b = b.value, b.wk ? Tb(b) : console.warn("object already deleted: " + b.wk) }); Ub = function (a) { Rb.register(a, a.qk, a.qk); return a }; Sb = function (a) { Rb.unregister(a.qk) }; return Ub(a) } var Vb = void 0, Wb = []; function Xb() { for (; Wb.length;) { var a = Wb.pop(); a.qk.ll = !1; a["delete"]() } } function Yb() { } var Zb = {};
      function $b(a, b, c) { if (void 0 === a[b].Dk) { var d = a[b]; a[b] = function () { a[b].Dk.hasOwnProperty(arguments.length) || J("Function '" + c + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + a[b].Dk + ")!"); return a[b].Dk[arguments.length].apply(this, arguments) }; a[b].Dk = []; a[b].Dk[d.kl] = d } }
      function ac(a, b, c) { g.hasOwnProperty(a) ? ((void 0 === c || void 0 !== g[a].Dk && void 0 !== g[a].Dk[c]) && J("Cannot register public name '" + a + "' twice"), $b(g, a, a), g.hasOwnProperty(c) && J("Cannot register multiple overloads of a function with the same number of arguments (" + c + ")!"), g[a].Dk[c] = b) : (g[a] = b, void 0 !== c && (g[a].sn = c)) } function bc(a, b, c, d, e, f, k, l) { this.name = a; this.constructor = b; this.ml = c; this.Mk = d; this.Pk = e; this.Am = f; this.zl = k; this.um = l; this.Qm = [] }
      function cc(a, b, c) { for (; b !== c;)b.zl || J("Expected null or instance of " + c.name + ", got an instance of " + b.name), a = b.zl(a), b = b.Pk; return a } function dc(a, b) { if (null === b) return this.Wl && J("null is not a valid " + this.name), 0; b.qk || J('Cannot pass "' + ec(b) + '" as a ' + this.name); b.qk.wk || J("Cannot pass deleted object as a pointer of type " + this.name); return cc(b.qk.wk, b.qk.Ak.uk, this.uk) }
      function fc(a, b) {
        if (null === b) { this.Wl && J("null is not a valid " + this.name); if (this.Hl) { var c = this.xl(); null !== a && a.push(this.Mk, c); return c } return 0 } b.qk || J('Cannot pass "' + ec(b) + '" as a ' + this.name); b.qk.wk || J("Cannot pass deleted object as a pointer of type " + this.name); !this.Gl && b.qk.Ak.Gl && J("Cannot convert argument of type " + (b.qk.Nk ? b.qk.Nk.name : b.qk.Ak.name) + " to parameter type " + this.name); c = cc(b.qk.wk, b.qk.Ak.uk, this.uk); if (this.Hl) switch (void 0 === b.qk.Jk && J("Passing raw pointer to smart pointer is illegal"),
          this.Um) { case 0: b.qk.Nk === this ? c = b.qk.Jk : J("Cannot convert argument of type " + (b.qk.Nk ? b.qk.Nk.name : b.qk.Ak.name) + " to parameter type " + this.name); break; case 1: c = b.qk.Jk; break; case 2: if (b.qk.Nk === this) c = b.qk.Jk; else { var d = b.clone(); c = this.Sm(c, hc(function () { d["delete"]() })); null !== a && a.push(this.Mk, c) } break; default: J("Unsupporting sharing policy") }return c
      }
      function ic(a, b) { if (null === b) return this.Wl && J("null is not a valid " + this.name), 0; b.qk || J('Cannot pass "' + ec(b) + '" as a ' + this.name); b.qk.wk || J("Cannot pass deleted object as a pointer of type " + this.name); b.qk.Ak.Gl && J("Cannot convert argument of type " + b.qk.Ak.name + " to parameter type " + this.name); return cc(b.qk.wk, b.qk.Ak.uk, this.uk) } function jc(a, b, c) { if (b === c) return a; if (void 0 === c.Pk) return null; a = jc(a, b, c.Pk); return null === a ? null : c.um(a) } var kc = {};
      function lc(a, b) { for (void 0 === b && J("ptr should not be undefined"); a.Pk;)b = a.zl(b), a = a.Pk; return kc[b] } function mc(a, b) { b.Ak && b.wk || Ib("makeClassHandle requires ptr and ptrType"); !!b.Nk !== !!b.Jk && Ib("Both smartPtrType and smartPtr must be specified"); b.count = { value: 1 }; return Ub(Object.create(a, { qk: { value: b } })) }
      function nc(a, b, c, d, e, f, k, l, m, q, r) { this.name = a; this.uk = b; this.Wl = c; this.Gl = d; this.Hl = e; this.Pm = f; this.Um = k; this.km = l; this.xl = m; this.Sm = q; this.Mk = r; e || void 0 !== b.Pk ? this.toWireType = fc : (this.toWireType = d ? dc : ic, this.Ik = null) } function oc(a, b, c) { g.hasOwnProperty(a) || Ib("Replacing nonexistant public symbol"); void 0 !== g[a].Dk && void 0 !== c ? g[a].Dk[c] = b : (g[a] = b, g[a].kl = c) }
      function K(a, b) {
        a = I(a); if (void 0 !== g["FUNCTION_TABLE_" + a]) var c = g["FUNCTION_TABLE_" + a][b]; else if ("undefined" !== typeof FUNCTION_TABLE) c = FUNCTION_TABLE[b]; else {
          c = g["dynCall_" + a]; void 0 === c && (c = g["dynCall_" + a.replace(/f/g, "d")], void 0 === c && J("No dynCall invoker for signature: " + a)); for (var d = [], e = 1; e < a.length; ++e)d.push("a" + e); e = "return function " + ("dynCall_" + a + "_" + b) + "(" + d.join(", ") + ") {\n"; e += "    return dynCall(rawFunction" + (d.length ? ", " : "") + d.join(", ") + ");\n"; c = (new Function("dynCall", "rawFunction",
            e + "};\n"))(c, b)
        } "function" !== typeof c && J("unknown function pointer with signature " + a + ": " + b); return c
      } var pc = void 0; function qc(a) { a = rc(a); var b = I(a); sc(a); return b } function tc(a, b) { function c(a) { e[a] || Cb[a] || (Db[a] ? Db[a].forEach(c) : (d.push(a), e[a] = !0)) } var d = [], e = {}; b.forEach(c); throw new pc(a + ": " + d.map(qc).join([", "])); }
      function uc(a) { var b = Function; if (!(b instanceof Function)) throw new TypeError("new_ called with constructor type " + typeof b + " which is not a function"); var c = Fb(b.name || "unknownFunctionName", function () { }); c.prototype = b.prototype; c = new c; a = b.apply(c, a); return a instanceof Object ? a : c }
      function vc(a, b, c, d, e) {
        var f = b.length; 2 > f && J("argTypes array size mismatch! Must at least get return value and 'this' types!"); var k = null !== b[1] && null !== c, l = !1; for (c = 1; c < b.length; ++c)if (null !== b[c] && void 0 === b[c].Ik) { l = !0; break } var m = "void" !== b[0].name, q = "", r = ""; for (c = 0; c < f - 2; ++c)q += (0 !== c ? ", " : "") + "arg" + c, r += (0 !== c ? ", " : "") + "arg" + c + "Wired"; a = "return function " + Eb(a) + "(" + q + ") {\nif (arguments.length !== " + (f - 2) + ") {\nthrowBindingError('function " + a + " called with ' + arguments.length + ' arguments, expected " +
          (f - 2) + " args!');\n}\n"; l && (a += "var destructors = [];\n"); var w = l ? "destructors" : "null"; q = "throwBindingError invoker fn runDestructors retType classParam".split(" "); d = [J, d, e, zb, b[0], b[1]]; k && (a += "var thisWired = classParam.toWireType(" + w + ", this);\n"); for (c = 0; c < f - 2; ++c)a += "var arg" + c + "Wired = argType" + c + ".toWireType(" + w + ", arg" + c + "); // " + b[c + 2].name + "\n", q.push("argType" + c), d.push(b[c + 2]); k && (r = "thisWired" + (0 < r.length ? ", " : "") + r); a += (m ? "var rv = " : "") + "invoker(fn" + (0 < r.length ? ", " : "") + r + ");\n"; if (l) a +=
            "runDestructors(destructors);\n"; else for (c = k ? 1 : 2; c < b.length; ++c)f = 1 === c ? "thisWired" : "arg" + (c - 2) + "Wired", null !== b[c].Ik && (a += f + "_dtor(" + f + "); // " + b[c].name + "\n", q.push(f + "_dtor"), d.push(b[c].Ik)); m && (a += "var ret = retType.fromWireType(rv);\nreturn ret;\n"); q.push(a + "}\n"); return uc(q).apply(null, d)
      } function wc(a, b) { for (var c = [], d = 0; d < a; d++)c.push(v[(b >> 2) + d]); return c } var xc = [], L = [{}, { value: void 0 }, { value: null }, { value: !0 }, { value: !1 }]; function yc(a) { 4 < a && 0 === --L[a].Xl && (L[a] = void 0, xc.push(a)) }
      function hc(a) { switch (a) { case void 0: return 1; case null: return 2; case !0: return 3; case !1: return 4; default: var b = xc.length ? xc.pop() : L.length; L[b] = { Xl: 1, value: a }; return b } } function zc(a, b, c) { switch (b) { case 0: return function (a) { return this.fromWireType((c ? x : z)[a]) }; case 1: return function (a) { return this.fromWireType((c ? Ua : Va)[a >> 1]) }; case 2: return function (a) { return this.fromWireType((c ? v : B)[a >> 2]) }; default: throw new TypeError("Unknown integer type: " + a); } }
      function Ac(a, b) { var c = Cb[a]; void 0 === c && J(b + " has unknown type " + qc(a)); return c } function ec(a) { if (null === a) return "null"; var b = typeof a; return "object" === b || "array" === b || "function" === b ? a.toString() : "" + a } function Bc(a, b) { switch (b) { case 2: return function (a) { return this.fromWireType(C[a >> 2]) }; case 3: return function (a) { return this.fromWireType(Wa[a >> 3]) }; default: throw new TypeError("Unknown float type: " + a); } }
      function Cc(a, b, c) { switch (b) { case 0: return c ? function (a) { return x[a] } : function (a) { return z[a] }; case 1: return c ? function (a) { return Ua[a >> 1] } : function (a) { return Va[a >> 1] }; case 2: return c ? function (a) { return v[a >> 2] } : function (a) { return B[a >> 2] }; default: throw new TypeError("Unknown integer type: " + a); } } var Dc = {}; function Ec(a) { var b = Dc[a]; return void 0 === b ? I(a) : b } var Fc = []; function Gc(a) { var b = Fc.length; Fc.push(a); return b }
      function Hc(a, b) { for (var c = Array(a), d = 0; d < a; ++d)c[d] = Ac(v[(b >> 2) + d], "parameter " + d); return c } function Ic() { p() }
      function Jc(a, b) {
        Kc = a; Lc = b; if (Mc) if (0 == a) Nc = function () { var a = Math.max(0, Oc + b - Ic()) | 0; setTimeout(Pc, a) }; else if (1 == a) Nc = function () { Qc(Pc) }; else if (2 == a) {
          if ("undefined" === typeof setImmediate) {
            var c = []; addEventListener("message", function (a) { if ("setimmediate" === a.data || "setimmediate" === a.data.target) a.stopPropagation(), c.shift()() }, !0); setImmediate = function (a) {
              c.push(a); ia ? (void 0 === g.setImmediates && (g.setImmediates = []), g.setImmediates.push(a), postMessage({ target: "setimmediate" })) : postMessage("setimmediate",
                "*")
            }
          } Nc = function () { setImmediate(Pc) }
        }
      }
      function Rc(a) {
        var b = Sc; wa = !0; assert(!Mc, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters."); Mc = a; Sc = b; var c = "undefined" !== typeof b ? function () { g.dynCall_vi(a, b) } : function () { g.dynCall_v(a) }; var d = Tc; Pc = function () {
          if (!za) if (0 < Uc.length) {
            var a = Date.now(), b = Uc.shift(); b.hm(b.Fl); if (Zc) { var k = Zc, l = 0 == k % 1 ? k - 1 : Math.floor(k); Zc = b.gn ? l : (8 * k + (l + .5)) / 9 } console.log('main loop blocker "' +
              b.name + '" took ' + (Date.now() - a) + " ms"); g.setStatus && (a = g.statusMessage || "Please wait...", b = Zc, k = $c.kn, b ? b < k ? g.setStatus(a + " (" + (k - b) + "/" + k + ")") : g.setStatus(a) : g.setStatus("")); d < Tc || setTimeout(Pc, 0)
          } else if (!(d < Tc)) if (ad = ad + 1 | 0, 1 == Kc && 1 < Lc && 0 != ad % Lc) Nc(); else {
          0 == Kc && (Oc = Ic()); a: if (!(za || g.preMainLoop && !1 === g.preMainLoop())) { try { c() } catch (m) { if (m instanceof qa) break a; m && "object" === typeof m && m.stack && u("exception thrown: " + [m, m.stack]); throw m; } g.postMainLoop && g.postMainLoop() } d < Tc || ("object" === typeof SDL &&
            SDL.audio && SDL.audio.Rm && SDL.audio.Rm(), Nc())
          }
        }
      } var Nc = null, Tc = 0, Mc = null, Sc = 0, Kc = 0, Lc = 0, ad = 0, Uc = [], $c = {}, Oc, Pc, Zc, bd = !1, cd = !1, dd = [];
      function ed() {
        function a() { cd = document.pointerLockElement === g.canvas || document.mozPointerLockElement === g.canvas || document.webkitPointerLockElement === g.canvas || document.msPointerLockElement === g.canvas } g.preloadPlugins || (g.preloadPlugins = []); if (!fd) {
          fd = !0; try { gd = !0 } catch (c) { gd = !1, console.log("warning: no blob constructor, cannot create blobs with mimetypes") } hd = "undefined" != typeof MozBlobBuilder ? MozBlobBuilder : "undefined" != typeof WebKitBlobBuilder ? WebKitBlobBuilder : gd ? null : console.log("warning: no BlobBuilder");
          id = "undefined" != typeof window ? window.URL ? window.URL : window.webkitURL : void 0; g.jm || "undefined" !== typeof id || (console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available."), g.jm = !0); g.preloadPlugins.push({
            canHandle: function (a) { return !g.jm && /\.(jpg|jpeg|png|bmp)$/i.test(a) }, handle: function (a, b, e, f) {
              var c = null; if (gd) try { c = new Blob([a], { type: jd(b) }), c.size !== a.length && (c = new Blob([(new Uint8Array(a)).buffer], { type: jd(b) })) } catch (q) {
                sa("Blob constructor present but fails: " +
                  q + "; falling back to blob builder")
              } c || (c = new hd, c.append((new Uint8Array(a)).buffer), c = c.getBlob()); var d = id.createObjectURL(c), m = new Image; m.onload = function () { assert(m.complete, "Image " + b + " could not be decoded"); var c = document.createElement("canvas"); c.width = m.width; c.height = m.height; c.getContext("2d").drawImage(m, 0, 0); g.preloadedImages[b] = c; id.revokeObjectURL(d); e && e(a) }; m.onerror = function () { console.log("Image " + d + " could not be decoded"); f && f() }; m.src = d
            }
          }); g.preloadPlugins.push({
            canHandle: function (a) {
              return !g.rn &&
                a.substr(-4) in { ".ogg": 1, ".wav": 1, ".mp3": 1 }
            }, handle: function (a, b, e, f) {
              function c(c) { m || (m = !0, g.preloadedAudios[b] = c, e && e(a)) } function d() { m || (m = !0, g.preloadedAudios[b] = new Audio, f && f()) } var m = !1; if (gd) {
                try { var q = new Blob([a], { type: jd(b) }) } catch (w) { return d() } q = id.createObjectURL(q); var r = new Audio; r.addEventListener("canplaythrough", function () { c(r) }, !1); r.onerror = function () {
                  if (!m) {
                    console.log("warning: browser could not fully decode audio " + b + ", trying slower base64 approach"); for (var d = "", e = 0, f = 0,
                      k = 0; k < a.length; k++)for (e = e << 8 | a[k], f += 8; 6 <= f;) { var l = e >> f - 6 & 63; f -= 6; d += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[l] } 2 == f ? (d += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(e & 3) << 4], d += "==") : 4 == f && (d += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(e & 15) << 2], d += "="); r.src = "data:audio/x-" + b.substr(-3) + ";base64," + d; c(r)
                  }
                }; r.src = q; kd(function () { c(r) })
              } else return d()
            }
          }); var b = g.canvas; b && (b.requestPointerLock = b.requestPointerLock || b.mozRequestPointerLock ||
            b.webkitRequestPointerLock || b.msRequestPointerLock || function () { }, b.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock || document.msExitPointerLock || function () { }, b.exitPointerLock = b.exitPointerLock.bind(document), document.addEventListener("pointerlockchange", a, !1), document.addEventListener("mozpointerlockchange", a, !1), document.addEventListener("webkitpointerlockchange", a, !1), document.addEventListener("mspointerlockchange", a, !1), g.elementPointerLock &&
            b.addEventListener("click", function (a) { !cd && g.canvas.requestPointerLock && (g.canvas.requestPointerLock(), a.preventDefault()) }, !1))
        }
      }
      function ld(a, b, c, d) { if (b && g.Rl && a == g.canvas) return g.Rl; var e; if (b) { var f = { antialias: !1, alpha: !1, vl: "undefined" !== typeof WebGL2RenderingContext ? 2 : 1 }; if (d) for (var k in d) f[k] = d[k]; if ("undefined" !== typeof md && (e = aa(a, f))) var l = nd[e].Ml } else l = a.getContext("2d"); if (!l) return null; c && (b || assert("undefined" === typeof M, "cannot set in module if GLctx is used, but we are a non-GL context that would replace it"), g.Rl = l, b && od(e), g.vn = b, dd.forEach(function (a) { a() }), ed()); return l } var pd = !1, qd = void 0, rd = void 0;
      function sd(a, b, c) {
        function d() {
          bd = !1; var a = e.parentNode; (document.fullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.webkitFullscreenElement || document.webkitCurrentFullScreenElement) === a ? (e.exitFullscreen = td, qd && e.requestPointerLock(), bd = !0, rd ? ("undefined" != typeof SDL && (v[SDL.screen >> 2] = B[SDL.screen >> 2] | 8388608), ud(g.canvas), vd()) : ud(e)) : (a.parentNode.insertBefore(e, a), a.parentNode.removeChild(a), rd ? ("undefined" != typeof SDL && (v[SDL.screen >> 2] = B[SDL.screen >> 2] &
            -8388609), ud(g.canvas), vd()) : ud(e)); if (g.onFullScreen) g.onFullScreen(bd); if (g.onFullscreen) g.onFullscreen(bd)
        } qd = a; rd = b; wd = c; "undefined" === typeof qd && (qd = !0); "undefined" === typeof rd && (rd = !1); "undefined" === typeof wd && (wd = null); var e = g.canvas; pd || (pd = !0, document.addEventListener("fullscreenchange", d, !1), document.addEventListener("mozfullscreenchange", d, !1), document.addEventListener("webkitfullscreenchange", d, !1), document.addEventListener("MSFullscreenChange", d, !1)); var f = document.createElement("div");
        e.parentNode.insertBefore(f, e); f.appendChild(e); f.requestFullscreen = f.requestFullscreen || f.mozRequestFullScreen || f.msRequestFullscreen || (f.webkitRequestFullscreen ? function () { f.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT) } : null) || (f.webkitRequestFullScreen ? function () { f.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT) } : null); c ? f.requestFullscreen({ wn: c }) : f.requestFullscreen()
      }
      function td() { if (!bd) return !1; (document.exitFullscreen || document.cancelFullScreen || document.mozCancelFullScreen || document.msExitFullscreen || document.webkitCancelFullScreen || function () { }).apply(document, []); return !0 } var xd = 0; function Qc(a) { if ("function" === typeof requestAnimationFrame) requestAnimationFrame(a); else { var b = Date.now(); if (0 === xd) xd = b + 1E3 / 60; else for (; b + 2 >= xd;)xd += 1E3 / 60; setTimeout(a, Math.max(xd - b, 0)) } } function kd(a) { wa = !0; setTimeout(function () { za || a() }, 1E4) }
      function jd(a) { return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", bmp: "image/bmp", ogg: "audio/ogg", wav: "audio/wav", mp3: "audio/mpeg" }[a.substr(a.lastIndexOf(".") + 1)] } var yd = []; function vd() { var a = g.canvas; yd.forEach(function (b) { b(a.width, a.height) }) }
      function ud(a, b, c) {
        b && c ? (a.en = b, a.Dm = c) : (b = a.en, c = a.Dm); var d = b, e = c; g.forcedAspectRatio && 0 < g.forcedAspectRatio && (d / e < g.forcedAspectRatio ? d = Math.round(e * g.forcedAspectRatio) : e = Math.round(d / g.forcedAspectRatio)); if ((document.fullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.webkitFullscreenElement || document.webkitCurrentFullScreenElement) === a.parentNode && "undefined" != typeof screen) {
          var f = Math.min(screen.width / d, screen.height / e); d = Math.round(d * f); e = Math.round(e *
            f)
        } rd ? (a.width != d && (a.width = d), a.height != e && (a.height = e), "undefined" != typeof a.style && (a.style.removeProperty("width"), a.style.removeProperty("height"))) : (a.width != b && (a.width = b), a.height != c && (a.height = c), "undefined" != typeof a.style && (d != b || e != c ? (a.style.setProperty("width", d + "px", "important"), a.style.setProperty("height", e + "px", "important")) : (a.style.removeProperty("width"), a.style.removeProperty("height"))))
      } var fd, gd, hd, id, wd, zd = {};
      function Ad(a) { var b = a.getExtension("ANGLE_instanced_arrays"); b && (a.vertexAttribDivisor = function (a, d) { b.vertexAttribDivisorANGLE(a, d) }, a.drawArraysInstanced = function (a, d, e, f) { b.drawArraysInstancedANGLE(a, d, e, f) }, a.drawElementsInstanced = function (a, d, e, f, k) { b.drawElementsInstancedANGLE(a, d, e, f, k) }) }
      function Bd(a) { var b = a.getExtension("OES_vertex_array_object"); b && (a.createVertexArray = function () { return b.createVertexArrayOES() }, a.deleteVertexArray = function (a) { b.deleteVertexArrayOES(a) }, a.bindVertexArray = function (a) { b.bindVertexArrayOES(a) }, a.isVertexArray = function (a) { return b.isVertexArrayOES(a) }) } function Cd(a) { var b = a.getExtension("WEBGL_draw_buffers"); b && (a.drawBuffers = function (a, d) { b.drawBuffersWEBGL(a, d) }) }
      var Dd = 1, Ed = 0, Fd = [], N = [], Gd = [], Hd = [], O = [], P = [], Q = [], Id = [], nd = {}, R = null, Jd = [], Kd = [], Ld = [], Md = [], Nd = [], Od = {}, Pd = {}, Qd = {}, Rd = 4; function T(a) { Ed || (Ed = a) } function Sd(a) { for (var b = Dd++, c = a.length; c < b; c++)a[c] = null; return b } var U = [0], Td = [0]; function Ud(a, b, c) { for (var d = "", e = 0; e < a; ++e) { var f = c ? v[c + 4 * e >> 2] : -1; d += A(v[b + 4 * e >> 2], 0 > f ? void 0 : f) } return d }
      function aa(a, b) { if (a = 1 < b.vl ? a.getContext("webgl2", b) : a.getContext("webgl", b)) { var c = Ba(8), d = { handle: c, attributes: b, version: b.vl, Ml: a }; a.canvas && (a.canvas.fn = d); nd[c] = d; ("undefined" === typeof b.fm || b.fm) && Vd(d); b = c } else b = 0; return b } function od(a) { R = nd[a]; g.Rl = M = R && R.Ml; return !(a && !M) }
      function Vd(a) {
        a || (a = R); if (!a.Fm) {
        a.Fm = !0; var b = a.Ml; 2 > a.version && (Ad(b), Bd(b), Cd(b)); b.Lk = b.getExtension("EXT_disjoint_timer_query"); var c = "OES_texture_float OES_texture_half_float OES_standard_derivatives OES_vertex_array_object WEBGL_compressed_texture_s3tc WEBGL_depth_texture OES_element_index_uint EXT_texture_filter_anisotropic EXT_frag_depth WEBGL_draw_buffers ANGLE_instanced_arrays OES_texture_float_linear OES_texture_half_float_linear EXT_blend_minmax EXT_shader_texture_lod WEBGL_compressed_texture_pvrtc EXT_color_buffer_half_float WEBGL_color_buffer_float EXT_sRGB WEBGL_compressed_texture_etc1 EXT_disjoint_timer_query WEBGL_compressed_texture_etc WEBGL_compressed_texture_astc EXT_color_buffer_float WEBGL_compressed_texture_s3tc_srgb EXT_disjoint_timer_query_webgl2 WEBKIT_WEBGL_compressed_texture_pvrtc".split(" "); (b.getSupportedExtensions() ||
          []).forEach(function (a) { -1 != c.indexOf(a) && b.getExtension(a) })
        }
      } function Wd(a) { var b = N[a]; a = Od[a] = { am: {}, Il: 0, Qk: -1, Rk: -1 }; for (var c = a.am, d = M.getProgramParameter(b, 35718), e = 0; e < d; ++e) { var f = M.getActiveUniform(b, e), k = f.name; a.Il = Math.max(a.Il, k.length + 1); "]" == k.slice(-1) && (k = k.slice(0, k.lastIndexOf("["))); var l = M.getUniformLocation(b, k); if (l) { var m = Sd(P); c[k] = [f.size, m]; P[m] = l; for (var q = 1; q < f.size; ++q)l = M.getUniformLocation(b, k + "[" + q + "]"), m = Sd(P), P[m] = l } } } var md = {}, Xd, Yd, Zd = [];
      function $d(a, b, c, d) { M.drawElements(a, b, c, d) } function V(a, b, c, d) { for (var e = 0; e < a; e++) { var f = M[c](), k = f && Sd(d); f ? (f.name = k, d[k] = f) : T(1282); v[b + 4 * e >> 2] = k } }
      function ae(a, b, c) {
        if (b) {
          var d = void 0; switch (a) { case 36346: d = 1; break; case 36344: 0 != c && 1 != c && T(1280); return; case 34814: case 36345: d = 0; break; case 34466: var e = M.getParameter(34467); d = e ? e.length : 0; break; case 33309: if (2 > R.version) { T(1282); return } d = 2 * (M.getSupportedExtensions() || []).length; break; case 33307: case 33308: if (2 > R.version) { T(1280); return } d = 33307 == a ? 3 : 0 }if (void 0 === d) switch (e = M.getParameter(a), typeof e) {
            case "number": d = e; break; case "boolean": d = e ? 1 : 0; break; case "string": T(1280); return; case "object": if (null ===
              e) switch (a) { case 34964: case 35725: case 34965: case 36006: case 36007: case 32873: case 34229: case 35097: case 36389: case 34068: d = 0; break; default: T(1280); return } else {
                if (e instanceof Float32Array || e instanceof Uint32Array || e instanceof Int32Array || e instanceof Array) { for (a = 0; a < e.length; ++a)switch (c) { case 0: v[b + 4 * a >> 2] = e[a]; break; case 2: C[b + 4 * a >> 2] = e[a]; break; case 4: x[b + a >> 0] = e[a] ? 1 : 0 }return } try { d = e.name | 0 } catch (f) {
                  T(1280); u("GL_INVALID_ENUM in glGet" + c + "v: Unknown object returned from WebGL getParameter(" +
                    a + ")! (error: " + f + ")"); return
                }
            } break; default: T(1280); u("GL_INVALID_ENUM in glGet" + c + "v: Native code calling glGet" + c + "v(" + a + ") and it returns " + e + " of type " + typeof e + "!"); return
          }switch (c) { case 1: F = [d >>> 0, (E = d, 1 <= +fb(E) ? 0 < E ? (kb(+jb(E / 4294967296), 4294967295) | 0) >>> 0 : ~~+gb((E - +(~~E >>> 0)) / 4294967296) >>> 0 : 0)]; v[b >> 2] = F[0]; v[b + 4 >> 2] = F[1]; break; case 0: v[b >> 2] = d; break; case 2: C[b >> 2] = d; break; case 4: x[b >> 0] = d ? 1 : 0 }
        } else T(1281)
      }
      function be(a, b, c, d) {
        if (c) {
          b = M.getIndexedParameter(a, b); switch (typeof b) { case "boolean": a = b ? 1 : 0; break; case "number": a = b; break; case "object": if (null === b) switch (a) { case 35983: case 35368: a = 0; break; default: T(1280); return } else if (b instanceof WebGLBuffer) a = b.name | 0; else { T(1280); return } break; default: T(1280); return }switch (d) {
            case 1: F = [a >>> 0, (E = a, 1 <= +fb(E) ? 0 < E ? (kb(+jb(E / 4294967296), 4294967295) | 0) >>> 0 : ~~+gb((E - +(~~E >>> 0)) / 4294967296) >>> 0 : 0)]; v[c >> 2] = F[0]; v[c + 4 >> 2] = F[1]; break; case 0: v[c >> 2] = a; break; case 2: C[c >>
              2] = a; break; case 4: x[c >> 0] = a ? 1 : 0; break; default: throw "internal emscriptenWebGLGetIndexed() error, bad type: " + d;
          }
        } else T(1281)
      } function ce(a) { var b = ba(a) + 1, c = Ba(b); h(a, c, b); return c }
      function de(a, b, c, d) { if (c) if (a = M.getUniform(N[a], P[b]), "number" == typeof a || "boolean" == typeof a) switch (d) { case 0: v[c >> 2] = a; break; case 2: C[c >> 2] = a; break; default: throw "internal emscriptenWebGLGetUniform() error, bad type: " + d; } else for (b = 0; b < a.length; b++)switch (d) { case 0: v[c + 4 * b >> 2] = a[b]; break; case 2: C[c + 4 * b >> 2] = a[b]; break; default: throw "internal emscriptenWebGLGetUniform() error, bad type: " + d; } else T(1281) }
      function ee(a, b, c, d) {
        if (c) if (a = M.getVertexAttrib(a, b), 34975 == b) v[c >> 2] = a.name; else if ("number" == typeof a || "boolean" == typeof a) switch (d) { case 0: v[c >> 2] = a; break; case 2: C[c >> 2] = a; break; case 5: v[c >> 2] = Math.fround(a); break; default: throw "internal emscriptenWebGLGetVertexAttrib() error, bad type: " + d; } else for (b = 0; b < a.length; b++)switch (d) {
          case 0: v[c + 4 * b >> 2] = a[b]; break; case 2: C[c + 4 * b >> 2] = a[b]; break; case 5: v[c + 4 * b >> 2] = Math.fround(a[b]); break; default: throw "internal emscriptenWebGLGetVertexAttrib() error, bad type: " +
            d;
        } else T(1281)
      } function fe(a) { a -= 5120; return 0 == a ? x : 1 == a ? z : 2 == a ? Ua : 4 == a ? v : 6 == a ? C : 5 == a || 28922 == a || 28520 == a || 30779 == a || 30782 == a ? B : Va } function ge(a) { return 31 - Math.clz32(a.BYTES_PER_ELEMENT) } function he(a, b, c, d, e) { a = fe(a); var f = ge(a), k = Rd; return a.subarray(e >> f, e + d * (c * ({ 5: 3, 6: 4, 8: 2, 29502: 3, 29504: 4, 26917: 2, 26918: 2, 29846: 3, 29847: 4 }[b - 6402] || 1) * (1 << f) + k - 1 & -k) >> f) } var ie = 0;
      function je(a, b, c, d) { a |= 0; b |= 0; c |= 0; d |= 0; var e = 0; ie = ie + 1 | 0; for (v[a >> 2] = ie; (e | 0) < (d | 0);) { if (0 == (v[c + (e << 3) >> 2] | 0)) return v[c + (e << 3) >> 2] = ie, v[c + ((e << 3) + 4) >> 2] = b, v[c + ((e << 3) + 8) >> 2] = 0, ua = d | 0, c | 0; e = e + 1 | 0 } d = 2 * d | 0; c = ke(c | 0, 8 * (d + 1 | 0) | 0) | 0; c = je(a | 0, b | 0, c | 0, d | 0) | 0; ua = d | 0; return c | 0 } var le = {};
      function pe() { if (!qe) { var a = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: ("object" === typeof navigator && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8", _: ea }, b; for (b in le) a[b] = le[b]; var c = []; for (b in a) c.push(b + "=" + a[b]); qe = c } return qe } var qe; function re(a) { return 0 === a % 4 && (0 !== a % 100 || 0 === a % 400) } function se(a, b) { for (var c = 0, d = 0; d <= b; c += a[d++]); return c } var te = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], ue = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      function ve(a, b) { for (a = new Date(a.getTime()); 0 < b;) { var c = a.getMonth(), d = (re(a.getFullYear()) ? te : ue)[c]; if (b > d - a.getDate()) b -= d - a.getDate() + 1, a.setDate(1), 11 > c ? a.setMonth(c + 1) : (a.setMonth(0), a.setFullYear(a.getFullYear() + 1)); else { a.setDate(a.getDate() + b); break } } return a }
      function we(a, b, c, d) {
        function e(a, b, c) { for (a = "number" === typeof a ? a.toString() : a || ""; a.length < b;)a = c[0] + a; return a } function f(a, b) { return e(a, b, "0") } function k(a, b) { function c(a) { return 0 > a ? -1 : 0 < a ? 1 : 0 } var d; 0 === (d = c(a.getFullYear() - b.getFullYear())) && 0 === (d = c(a.getMonth() - b.getMonth())) && (d = c(a.getDate() - b.getDate())); return d } function l(a) {
          switch (a.getDay()) {
            case 0: return new Date(a.getFullYear() - 1, 11, 29); case 1: return a; case 2: return new Date(a.getFullYear(), 0, 3); case 3: return new Date(a.getFullYear(),
              0, 2); case 4: return new Date(a.getFullYear(), 0, 1); case 5: return new Date(a.getFullYear() - 1, 11, 31); case 6: return new Date(a.getFullYear() - 1, 11, 30)
          }
        } function m(a) { a = ve(new Date(a.Gk + 1900, 0, 1), a.Ll); var b = l(new Date(a.getFullYear() + 1, 0, 4)); return 0 >= k(l(new Date(a.getFullYear(), 0, 4)), a) ? 0 >= k(b, a) ? a.getFullYear() + 1 : a.getFullYear() : a.getFullYear() - 1 } var q = v[d + 40 >> 2]; d = {
          bn: v[d >> 2], an: v[d + 4 >> 2], Jl: v[d + 8 >> 2], yl: v[d + 12 >> 2], nl: v[d + 16 >> 2], Gk: v[d + 20 >> 2], Kl: v[d + 24 >> 2], Ll: v[d + 28 >> 2], un: v[d + 32 >> 2], $m: v[d + 36 >> 2],
          cn: q ? A(q) : ""
        }; c = A(c); q = { "%c": "%a %b %d %H:%M:%S %Y", "%D": "%m/%d/%y", "%F": "%Y-%m-%d", "%h": "%b", "%r": "%I:%M:%S %p", "%R": "%H:%M", "%T": "%H:%M:%S", "%x": "%m/%d/%y", "%X": "%H:%M:%S", "%Ec": "%c", "%EC": "%C", "%Ex": "%m/%d/%y", "%EX": "%H:%M:%S", "%Ey": "%y", "%EY": "%Y", "%Od": "%d", "%Oe": "%e", "%OH": "%H", "%OI": "%I", "%Om": "%m", "%OM": "%M", "%OS": "%S", "%Ou": "%u", "%OU": "%U", "%OV": "%V", "%Ow": "%w", "%OW": "%W", "%Oy": "%y" }; for (var r in q) c = c.replace(new RegExp(r, "g"), q[r]); var w = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),
          y = "January February March April May June July August September October November December".split(" "); q = {
            "%a": function (a) { return w[a.Kl].substring(0, 3) }, "%A": function (a) { return w[a.Kl] }, "%b": function (a) { return y[a.nl].substring(0, 3) }, "%B": function (a) { return y[a.nl] }, "%C": function (a) { return f((a.Gk + 1900) / 100 | 0, 2) }, "%d": function (a) { return f(a.yl, 2) }, "%e": function (a) { return e(a.yl, 2, " ") }, "%g": function (a) { return m(a).toString().substring(2) }, "%G": function (a) { return m(a) }, "%H": function (a) {
              return f(a.Jl,
                2)
            }, "%I": function (a) { a = a.Jl; 0 == a ? a = 12 : 12 < a && (a -= 12); return f(a, 2) }, "%j": function (a) { return f(a.yl + se(re(a.Gk + 1900) ? te : ue, a.nl - 1), 3) }, "%m": function (a) { return f(a.nl + 1, 2) }, "%M": function (a) { return f(a.an, 2) }, "%n": function () { return "\n" }, "%p": function (a) { return 0 <= a.Jl && 12 > a.Jl ? "AM" : "PM" }, "%S": function (a) { return f(a.bn, 2) }, "%t": function () { return "\t" }, "%u": function (a) { return a.Kl || 7 }, "%U": function (a) {
              var b = new Date(a.Gk + 1900, 0, 1), c = 0 === b.getDay() ? b : ve(b, 7 - b.getDay()); a = new Date(a.Gk + 1900, a.nl, a.yl); return 0 >
                k(c, a) ? f(Math.ceil((31 - c.getDate() + (se(re(a.getFullYear()) ? te : ue, a.getMonth() - 1) - 31) + a.getDate()) / 7), 2) : 0 === k(c, b) ? "01" : "00"
            }, "%V": function (a) { var b = l(new Date(a.Gk + 1900, 0, 4)), c = l(new Date(a.Gk + 1901, 0, 4)), d = ve(new Date(a.Gk + 1900, 0, 1), a.Ll); return 0 > k(d, b) ? "53" : 0 >= k(c, d) ? "01" : f(Math.ceil((b.getFullYear() < a.Gk + 1900 ? a.Ll + 32 - b.getDate() : a.Ll + 1 - b.getDate()) / 7), 2) }, "%w": function (a) { return a.Kl }, "%W": function (a) {
              var b = new Date(a.Gk, 0, 1), c = 1 === b.getDay() ? b : ve(b, 0 === b.getDay() ? 1 : 7 - b.getDay() + 1); a = new Date(a.Gk +
                1900, a.nl, a.yl); return 0 > k(c, a) ? f(Math.ceil((31 - c.getDate() + (se(re(a.getFullYear()) ? te : ue, a.getMonth() - 1) - 31) + a.getDate()) / 7), 2) : 0 === k(c, b) ? "01" : "00"
            }, "%y": function (a) { return (a.Gk + 1900).toString().substring(2) }, "%Y": function (a) { return a.Gk + 1900 }, "%z": function (a) { a = a.$m; var b = 0 <= a; a = Math.abs(a) / 60; return (b ? "+" : "-") + String("0000" + (a / 60 * 100 + a % 60)).slice(-4) }, "%Z": function (a) { return a.cn }, "%%": function () { return "%" }
          }; for (r in q) 0 <= c.indexOf(r) && (c = c.replace(new RegExp(r, "g"), q[r](d))); r = xe(c, !1); if (r.length >
            b) return 0; x.set(r, a); return r.length - 1
      } Hb = g.InternalError = Gb("InternalError"); for (var ye = Array(256), ze = 0; 256 > ze; ++ze)ye[ze] = String.fromCharCode(ze); Nb = ye; Ob = g.BindingError = Gb("BindingError"); Yb.prototype.isAliasOf = function (a) { if (!(this instanceof Yb && a instanceof Yb)) return !1; var b = this.qk.Ak.uk, c = this.qk.wk, d = a.qk.Ak.uk; for (a = a.qk.wk; b.Pk;)c = b.zl(c), b = b.Pk; for (; d.Pk;)a = d.zl(a), d = d.Pk; return b === d && c === a };
      Yb.prototype.clone = function () { this.qk.wk || Qb(this); if (this.qk.wl) return this.qk.count.value += 1, this; var a = Ub(Object.create(Object.getPrototypeOf(this), { qk: { value: Pb(this.qk) } })); a.qk.count.value += 1; a.qk.ll = !1; return a }; Yb.prototype["delete"] = function () { this.qk.wk || Qb(this); this.qk.ll && !this.qk.wl && J("Object already scheduled for deletion"); Sb(this); Tb(this.qk); this.qk.wl || (this.qk.Jk = void 0, this.qk.wk = void 0) }; Yb.prototype.isDeleted = function () { return !this.qk.wk };
      Yb.prototype.deleteLater = function () { this.qk.wk || Qb(this); this.qk.ll && !this.qk.wl && J("Object already scheduled for deletion"); Wb.push(this); 1 === Wb.length && Vb && Vb(Xb); this.qk.ll = !0; return this }; nc.prototype.Bm = function (a) { this.km && (a = this.km(a)); return a }; nc.prototype.em = function (a) { this.Mk && this.Mk(a) }; nc.prototype.argPackAdvance = 8; nc.prototype.readValueFromPointer = Ab; nc.prototype.deleteObject = function (a) { if (null !== a) a["delete"]() };
      nc.prototype.fromWireType = function (a) {
        function b() { return this.Hl ? mc(this.uk.ml, { Ak: this.Pm, wk: c, Nk: this, Jk: a }) : mc(this.uk.ml, { Ak: this, wk: a }) } var c = this.Bm(a); if (!c) return this.em(a), null; var d = lc(this.uk, c); if (void 0 !== d) { if (0 === d.qk.count.value) return d.qk.wk = c, d.qk.Jk = a, d.clone(); d = d.clone(); this.em(a); return d } d = this.uk.Am(c); d = Zb[d]; if (!d) return b.call(this); d = this.Gl ? d.rm : d.pointerType; var e = jc(c, this.uk, d.uk); return null === e ? b.call(this) : this.Hl ? mc(d.uk.ml, { Ak: d, wk: e, Nk: this, Jk: a }) : mc(d.uk.ml,
          { Ak: d, wk: e })
      }; g.getInheritedInstanceCount = function () { return Object.keys(kc).length }; g.getLiveInheritedInstances = function () { var a = [], b; for (b in kc) kc.hasOwnProperty(b) && a.push(kc[b]); return a }; g.flushPendingDeletes = Xb; g.setDelayFunction = function (a) { Vb = a; Wb.length && Vb && Vb(Xb) }; pc = g.UnboundTypeError = Gb("UnboundTypeError"); g.count_emval_handles = function () { for (var a = 0, b = 5; b < L.length; ++b)void 0 !== L[b] && ++a; return a }; g.get_first_emval = function () { for (var a = 5; a < L.length; ++a)if (void 0 !== L[a]) return L[a]; return null };
      ja ? Ic = function () { var a = process.hrtime(); return 1E3 * a[0] + a[1] / 1E6 } : "undefined" !== typeof dateNow ? Ic = dateNow : Ic = function () { return performance.now() }; g.requestFullscreen = function (a, b, c) { sd(a, b, c) }; g.requestAnimationFrame = function (a) { Qc(a) }; g.setCanvasSize = function (a, b, c) { ud(g.canvas, a, b); c || vd() }; g.pauseMainLoop = function () { Nc = null; Tc++ }; g.resumeMainLoop = function () { Tc++; var a = Kc, b = Lc, c = Mc; Mc = null; Rc(c); Jc(a, b); Nc() };
      g.getUserMedia = function () { window.getUserMedia || (window.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia); window.getUserMedia(void 0) }; g.createContext = function (a, b, c, d) { return ld(a, b, c, d) }; for (var M, Ae = new Float32Array(256), Be = 0; 256 > Be; Be++)U[Be] = Ae.subarray(0, Be + 1); var Ce = new Int32Array(256); for (Be = 0; 256 > Be; Be++)Td[Be] = Ce.subarray(0, Be + 1); for (var De = 0; 32 > De; De++)Zd.push(Array(De)); function xe(a, b) { var c = Array(ba(a) + 1); a = Ta(a, c, 0, c.length); b && (c.length = a); return c }
      var We = {
        Le: function (a) { return Ba(a) }, Ae: function (a) { "uncaught_exception" in Ee ? Ee.dn++ : Ee.dn = 1; throw a; }, K: function () { }, Jg: function () { ub(63); return -1 }, Kg: function (a, b) { wb = b; try { var c = xb.Sl(), d = G(), e = G(); G(); var f = G(); G(); return (void 0).read(c, x, d, e, f) } catch (k) { return p(k), -k.Vk } }, Ig: function (a, b) {
          wb = b; try {
            var c = G(), d = G(), e = G(), f = G(), k = G(); a: {
              var l = G(); l <<= 12; a = !1; if (0 !== (f & 16) && 0 !== c % 16384) var m = -28; else {
                if (0 !== (f & 32)) {
                  var q = Fe(16384, d); if (!q) { m = -48; break a } c = q; e = d; var r = 0; c |= 0; e |= 0; var w; var y = c +
                    e | 0; r = (r | 0) & 255; if (67 <= (e | 0)) { for (; 0 != (c & 3);)x[c >> 0] = r, c = c + 1 | 0; var t = y & -4 | 0; var D = r | r << 8 | r << 16 | r << 24; for (w = t - 64 | 0; (c | 0) <= (w | 0);)v[c >> 2] = D, v[c + 4 >> 2] = D, v[c + 8 >> 2] = D, v[c + 12 >> 2] = D, v[c + 16 >> 2] = D, v[c + 20 >> 2] = D, v[c + 24 >> 2] = D, v[c + 28 >> 2] = D, v[c + 32 >> 2] = D, v[c + 36 >> 2] = D, v[c + 40 >> 2] = D, v[c + 44 >> 2] = D, v[c + 48 >> 2] = D, v[c + 52 >> 2] = D, v[c + 56 >> 2] = D, v[c + 60 >> 2] = D, c = c + 64 | 0; for (; (c | 0) < (t | 0);)v[c >> 2] = D, c = c + 4 | 0 } for (; (c | 0) < (y | 0);)x[c >> 0] = r, c = c + 1 | 0; a = !0
                } else {
                  r = (void 0).Cm(k); if (!r) { m = -8; break a } var W = (void 0).pn(r, z, c, d, l, e, f); q = W.wk; a =
                    W.dm
                } xb.im[q] = { Mm: q, Lm: d, dm: a, fd: k, flags: f, offset: l }; m = q
              }
            } return m
          } catch (hb) { return p(hb), -hb.Vk }
        }, U: function (a, b) { wb = b; try { var c = A(G()), d = G(); return xb.tm((void 0).stat, c, d) } catch (e) { return p(e), -e.Vk } }, Og: function (a, b) { wb = b; try { var c = xb.Sl(), d = G(); return xb.tm((void 0).stat, c.path, d) } catch (e) { return p(e), -e.Vk } }, S: function (a, b) { wb = b; return 0 }, T: function (a, b) { wb = b; try { var c = A(G()), d = G(), e = G(); return (void 0).open(c, d, e).fd } catch (f) { return p(f), -f.Vk } }, Ng: function (a, b) { wb = b; return 0 }, Hg: function (a,
          b) { wb = b; try { var c = G(); var d = G(); if (-1 === c || 0 === d) var e = -28; else { var f = xb.im[c]; if (f && d === f.Lm) { var k = (void 0).Cm(f.fd); xb.hn(c, k, d, f.flags, f.offset); (void 0).qn(k); xb.im[c] = null; f.dm && sc(f.Mm) } e = 0 } return e } catch (l) { return p(l), -l.Vk } }, B: function () { }, E: function (a) {
            var b = yb[a]; delete yb[a]; var c = b.elements, d = c.length, e = c.map(function (a) { return a.Vl }).concat(c.map(function (a) { return a.Zl })), f = b.xl, k = b.Mk; H([a], e, function (a) {
              c.forEach(function (b, c) {
                var e = a[c], f = b.Tl, k = b.Ul, l = a[c + d], m = b.Yl, q = b.$l; b.read =
                  function (a) { return e.fromWireType(f(k, a)) }; b.write = function (a, b) { var c = []; m(q, a, l.toWireType(c, b)); zb(c) }
              }); return [{ name: b.name, fromWireType: function (a) { for (var b = Array(d), e = 0; e < d; ++e)b[e] = c[e].read(a); k(a); return b }, toWireType: function (a, e) { if (d !== e.length) throw new TypeError("Incorrect number of tuple elements for " + b.name + ": expected=" + d + ", actual=" + e.length); for (var l = f(), m = 0; m < d; ++m)c[m].write(l, e[m]); null !== a && a.push(k, l); return l }, argPackAdvance: 8, readValueFromPointer: Ab, Ik: k }]
            })
          }, w: function (a) {
            var b =
              Lb[a]; delete Lb[a]; var c = b.xl, d = b.Mk, e = b.gm, f = e.map(function (a) { return a.Vl }).concat(e.map(function (a) { return a.Zl })); H([a], f, function (a) {
                var f = {}; e.forEach(function (b, c) { var d = a[c], k = b.Tl, l = b.Ul, m = a[c + e.length], q = b.Yl, W = b.$l; f[b.wm] = { read: function (a) { return d.fromWireType(k(l, a)) }, write: function (a, b) { var c = []; q(W, a, m.toWireType(c, b)); zb(c) } } }); return [{
                  name: b.name, fromWireType: function (a) { var b = {}, c; for (c in f) b[c] = f[c].read(a); d(a); return b }, toWireType: function (a, b) {
                    for (var e in f) if (!(e in b)) throw new TypeError("Missing field");
                    var k = c(); for (e in f) f[e].write(k, b[e]); null !== a && a.push(d, k); return k
                  }, argPackAdvance: 8, readValueFromPointer: Ab, Ik: d
                }]
              })
          }, zg: function (a, b, c, d, e) { var f = Mb(c); b = I(b); Jb(a, { name: b, fromWireType: function (a) { return !!a }, toWireType: function (a, b) { return b ? d : e }, argPackAdvance: 8, readValueFromPointer: function (a) { if (1 === c) var d = x; else if (2 === c) d = Ua; else if (4 === c) d = v; else throw new TypeError("Unknown boolean type size: " + b); return this.fromWireType(d[a >> f]) }, Ik: null }) }, l: function (a, b, c, d, e, f, k, l, m, q, r, w, y) {
            r =
            I(r); f = K(e, f); l && (l = K(k, l)); q && (q = K(m, q)); y = K(w, y); var t = Eb(r); ac(t, function () { tc("Cannot construct " + r + " due to unbound types", [d]) }); H([a, b, c], d ? [d] : [], function (b) {
              b = b[0]; if (d) { var c = b.uk; var e = c.ml } else e = Yb.prototype; b = Fb(t, function () {
                if (Object.getPrototypeOf(this) !== k) throw new Ob("Use 'new' to construct " + r); if (void 0 === m.Zk) throw new Ob(r + " has no accessible constructor"); var a = m.Zk[arguments.length]; if (void 0 === a) throw new Ob("Tried to invoke ctor of " + r + " with invalid number of parameters (" +
                  arguments.length + ") - expected (" + Object.keys(m.Zk).toString() + ") parameters instead!"); return a.apply(this, arguments)
              }); var k = Object.create(e, { constructor: { value: b } }); b.prototype = k; var m = new bc(r, b, k, y, c, f, l, q); c = new nc(r, m, !0, !1, !1); e = new nc(r + "*", m, !1, !1, !1); var w = new nc(r + " const*", m, !1, !0, !1); Zb[a] = { pointerType: e, rm: w }; oc(t, b); return [c, e, w]
            })
          }, q: function (a, b, c, d, e, f, k) {
            var l = wc(c, d); b = I(b); f = K(e, f); H([], [a], function (a) {
              function d() { tc("Cannot call " + e + " due to unbound types", l) } a = a[0]; var e =
                a.name + "." + b, m = a.uk.constructor; void 0 === m[b] ? (d.kl = c - 1, m[b] = d) : ($b(m, b, e), m[b].Dk[c - 1] = d); H([], l, function (a) { a = [a[0], null].concat(a.slice(1)); a = vc(e, a, null, f, k); void 0 === m[b].Dk ? (a.kl = c - 1, m[b] = a) : m[b].Dk[c - 1] = a; return [] }); return []
            })
          }, y: function (a, b, c, d, e, f) {
            assert(0 < b); var k = wc(b, c); e = K(d, e); var l = [f], m = []; H([], [a], function (a) {
              a = a[0]; var c = "constructor " + a.name; void 0 === a.uk.Zk && (a.uk.Zk = []); if (void 0 !== a.uk.Zk[b - 1]) throw new Ob("Cannot register multiple constructors with identical number of parameters (" +
                (b - 1) + ") for class '" + a.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!"); a.uk.Zk[b - 1] = function () { tc("Cannot construct " + a.name + " due to unbound types", k) }; H([], k, function (d) { a.uk.Zk[b - 1] = function () { arguments.length !== b - 1 && J(c + " called with " + arguments.length + " arguments, expected " + (b - 1)); m.length = 0; l.length = b; for (var a = 1; a < b; ++a)l[a] = d[a].toWireType(m, arguments[a - 1]); a = e.apply(null, l); zb(m); return d[0].fromWireType(a) }; return [] }); return []
            })
          },
        d: function (a, b, c, d, e, f, k, l) { var m = wc(c, d); b = I(b); f = K(e, f); H([], [a], function (a) { function d() { tc("Cannot call " + e + " due to unbound types", m) } a = a[0]; var e = a.name + "." + b; l && a.uk.Qm.push(b); var q = a.uk.ml, t = q[b]; void 0 === t || void 0 === t.Dk && t.className !== a.name && t.kl === c - 2 ? (d.kl = c - 2, d.className = a.name, q[b] = d) : ($b(q, b, e), q[b].Dk[c - 2] = d); H([], m, function (d) { d = vc(e, d, a, f, k); void 0 === q[b].Dk ? (d.kl = c - 2, q[b] = d) : q[b].Dk[c - 2] = d; return [] }); return [] }) }, M: function (a, b, c) {
          a = I(a); H([], [b], function (b) {
            b = b[0]; g[a] = b.fromWireType(c);
            return []
          })
        }, xg: function (a, b) { b = I(b); Jb(a, { name: b, fromWireType: function (a) { var b = L[a].value; yc(a); return b }, toWireType: function (a, b) { return hc(b) }, argPackAdvance: 8, readValueFromPointer: Ab, Ik: null }) }, o: function (a, b, c, d) { function e() { } c = Mb(c); b = I(b); e.values = {}; Jb(a, { name: b, constructor: e, fromWireType: function (a) { return this.constructor.values[a] }, toWireType: function (a, b) { return b.value }, argPackAdvance: 8, readValueFromPointer: zc(b, c, d), Ik: null }); ac(b, e) }, n: function (a, b, c) {
          var d = Ac(a, "enum"); b = I(b); a = d.constructor;
          d = Object.create(d.constructor.prototype, { value: { value: c }, constructor: { value: Fb(d.name + "_" + b, function () { }) } }); a.values[c] = d; a[b] = d
        }, Q: function (a, b, c) { c = Mb(c); b = I(b); Jb(a, { name: b, fromWireType: function (a) { return a }, toWireType: function (a, b) { if ("number" !== typeof b && "boolean" !== typeof b) throw new TypeError('Cannot convert "' + ec(b) + '" to ' + this.name); return b }, argPackAdvance: 8, readValueFromPointer: Bc(b, c), Ik: null }) }, m: function (a, b, c, d, e, f) {
          var k = wc(b, c); a = I(a); e = K(d, e); ac(a, function () {
            tc("Cannot call " +
              a + " due to unbound types", k)
          }, b - 1); H([], k, function (c) { c = [c[0], null].concat(c.slice(1)); oc(a, vc(a, c, null, e, f), b - 1); return [] })
        }, A: function (a, b, c, d, e) {
          function f(a) { return a } b = I(b); -1 === e && (e = 4294967295); var k = Mb(c); if (0 === d) { var l = 32 - 8 * c; f = function (a) { return a << l >>> l } } var m = -1 != b.indexOf("unsigned"); Jb(a, {
            name: b, fromWireType: f, toWireType: function (a, c) {
              if ("number" !== typeof c && "boolean" !== typeof c) throw new TypeError('Cannot convert "' + ec(c) + '" to ' + this.name); if (c < d || c > e) throw new TypeError('Passing a number "' +
                ec(c) + '" from JS side to C/C++ side to an argument of type "' + b + '", which is outside the valid range [' + d + ", " + e + "]!"); return m ? c >>> 0 : c | 0
            }, argPackAdvance: 8, readValueFromPointer: Cc(b, k, 0 !== d), Ik: null
          })
        }, z: function (a, b, c) { function d(a) { a >>= 2; var b = B; return new e(b.buffer, b[a + 1], b[a]) } var e = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array][b]; c = I(c); Jb(a, { name: c, fromWireType: d, argPackAdvance: 8, readValueFromPointer: d }, { Em: !0 }) }, v: function (a, b, c, d, e, f, k, l, m,
          q, r, w) { c = I(c); f = K(e, f); l = K(k, l); q = K(m, q); w = K(r, w); H([a], [b], function (a) { a = a[0]; return [new nc(c, a.uk, !1, !1, !0, a, d, f, l, q, w)] }) }, R: function (a, b) {
            b = I(b); var c = "std::string" === b; Jb(a, {
              name: b, fromWireType: function (a) {
                var b = B[a >> 2]; if (c) { var d = z[a + 4 + b], k = 0; 0 != d && (k = d, z[a + 4 + b] = 0); var l = a + 4; for (d = 0; d <= b; ++d) { var m = a + 4 + d; if (0 == z[m]) { l = A(l); if (void 0 === q) var q = l; else q += String.fromCharCode(0), q += l; l = m + 1 } } 0 != k && (z[a + 4 + b] = k) } else { q = Array(b); for (d = 0; d < b; ++d)q[d] = String.fromCharCode(z[a + 4 + d]); q = q.join("") } sc(a);
                return q
              }, toWireType: function (a, b) {
              b instanceof ArrayBuffer && (b = new Uint8Array(b)); var d = "string" === typeof b; d || b instanceof Uint8Array || b instanceof Uint8ClampedArray || b instanceof Int8Array || J("Cannot pass non-string to std::string"); var e = (c && d ? function () { return ba(b) } : function () { return b.length })(), l = Ba(4 + e + 1); B[l >> 2] = e; if (c && d) h(b, l + 4, e + 1); else if (d) for (d = 0; d < e; ++d) { var m = b.charCodeAt(d); 255 < m && (sc(l), J("String has UTF-16 code units that do not fit in 8 bits")); z[l + 4 + d] = m } else for (d = 0; d < e; ++d)z[l +
                4 + d] = b[d]; null !== a && a.push(sc, l); return l
              }, argPackAdvance: 8, readValueFromPointer: Ab, Ik: function (a) { sc(a) }
            })
          }, yg: function (a, b, c) {
            c = I(c); if (2 === b) { var d = function () { return Va }; var e = 1 } else 4 === b && (d = function () { return B }, e = 2); Jb(a, {
              name: c, fromWireType: function (a) { for (var b = d(), c = B[a >> 2], f = Array(c), q = a + 4 >> e, r = 0; r < c; ++r)f[r] = String.fromCharCode(b[q + r]); sc(a); return f.join("") }, toWireType: function (a, c) {
                var f = c.length, k = Ba(4 + f * b), q = d(); B[k >> 2] = f; for (var r = k + 4 >> e, w = 0; w < f; ++w)q[r + w] = c.charCodeAt(w); null !==
                  a && a.push(sc, k); return k
              }, argPackAdvance: 8, readValueFromPointer: Ab, Ik: function (a) { sc(a) }
            })
          }, G: function (a, b, c, d, e, f) { yb[a] = { name: I(b), xl: K(c, d), Mk: K(e, f), elements: [] } }, F: function (a, b, c, d, e, f, k, l, m) { yb[a].elements.push({ Vl: b, Tl: K(c, d), Ul: e, Zl: f, Yl: K(k, l), $l: m }) }, x: function (a, b, c, d, e, f) { Lb[a] = { name: I(b), xl: K(c, d), Mk: K(e, f), gm: [] } }, j: function (a, b, c, d, e, f, k, l, m, q) { Lb[a].gm.push({ wm: I(b), Vl: c, Tl: K(d, e), Ul: f, Zl: k, Yl: K(l, m), $l: q }) }, Ag: function (a, b) {
            b = I(b); Jb(a, {
              Gm: !0, name: b, argPackAdvance: 0, fromWireType: function () { },
              toWireType: function () { }
            })
          }, D: function (a, b, c, d) { a = Fc[a]; b || J("Cannot use deleted val. handle = " + b); b = L[b].value; c = Ec(c); a(b, c, null, d) }, ta: yc, C: function (a, b) {
            b = Hc(a, b); for (var c = b[0], d = c.name + "_$" + b.slice(1).map(function (a) { return a.name }).join("_") + "$", e = ["retType"], f = [c], k = "", l = 0; l < a - 1; ++l)k += (0 !== l ? ", " : "") + "arg" + l, e.push("argType" + l), f.push(b[1 + l]); d = "return function " + Eb("methodCaller_" + d) + "(handle, name, destructors, args) {\n"; var m = 0; for (l = 0; l < a - 1; ++l)d += "    var arg" + l + " = argType" + l + ".readValueFromPointer(args" +
              (m ? "+" + m : "") + ");\n", m += b[l + 1].argPackAdvance; d += "    var rv = handle[name](" + k + ");\n"; for (l = 0; l < a - 1; ++l)b[l + 1].deleteObject && (d += "    argType" + l + ".deleteObject(arg" + l + ");\n"); c.Gm || (d += "    return retType.toWireType(destructors, rv);\n"); e.push(d + "};\n"); a = uc(e).apply(null, f); return Gc(a)
          }, pf: function (a) { 4 < a && (L[a].Xl += 1) }, Ea: function () { return hc([]) }, Za: function (a) { return hc(Ec(a)) }, I: function (a, b) { a = Ac(a, "_emval_take_value"); a = a.readValueFromPointer(b); return hc(a) }, e: function () { p() }, Dg: function (a,
            b) { if (0 === a) a = Date.now(); else if (1 === a) a = Ic(); else return ub(28), -1; v[b >> 2] = a / 1E3 | 0; v[b + 4 >> 2] = a % 1E3 * 1E6 | 0; return 0 }, Xc: function () { return 0 }, Tg: function (a) { return Ge(a) }, Mc: function (a, b) { if (62E3 != a) return 0; if (zd[b]) return zd[b]; switch (b) { case 12371: a = Aa(xe("Emscripten")); break; case 12372: a = Aa(xe("1.4 Emscripten EGL")); break; case 12373: a = Aa(xe("")); break; case 12429: a = Aa(xe("OpenGL_ES")); break; default: return 0 }return zd[b] = a }, bg: function (a) { M.activeTexture(a) }, ag: function (a, b) { M.attachShader(N[a], Q[b]) },
        $c: function (a, b) { M.beginQuery(a, Kd[b]) }, rg: function (a, b) { M.Lk.beginQueryEXT(a, Jd[b]) }, Gc: function (a) { M.beginTransformFeedback(a) }, $f: function (a, b, c) { M.bindAttribLocation(N[a], b, A(c)) }, _f: function (a, b) { 35051 == a ? M.$k = b : 35052 == a && (M.Ck = b); M.bindBuffer(a, Fd[b]) }, Dc: function (a, b, c) { M.bindBufferBase(a, b, Fd[c]) }, Ec: function (a, b, c, d, e) { M.bindBufferRange(a, b, Fd[c], d, e) }, Zf: function (a, b) { M.bindFramebuffer(a, Gd[b]) }, Yf: function (a, b) { M.bindRenderbuffer(a, Hd[b]) }, Gb: function (a, b) { M.bindSampler(a, Ld[b]) }, Xf: function (a,
          b) { M.bindTexture(a, O[b]) }, xb: function (a, b) { M.bindTransformFeedback(a, Md[b]) }, Lc: function (a) { M.bindVertexArray(Id[a]) }, jg: function (a) { M.bindVertexArray(Id[a]) }, Wf: function (a, b, c, d) { M.blendColor(a, b, c, d) }, Vf: function (a) { M.blendEquation(a) }, Uf: function (a, b) { M.blendEquationSeparate(a, b) }, Tf: function (a, b) { M.blendFunc(a, b) }, Sf: function (a, b, c, d) { M.blendFuncSeparate(a, b, c, d) }, Pc: function (a, b, c, d, e, f, k, l, m, q) { M.blitFramebuffer(a, b, c, d, e, f, k, l, m, q) }, Rf: function (a, b, c, d) {
            2 <= R.version ? c ? M.bufferData(a, z, d, c,
              b) : M.bufferData(a, b, d) : M.bufferData(a, c ? z.subarray(c, c + b) : b, d)
          }, Qf: function (a, b, c, d) { 2 <= R.version ? M.bufferSubData(a, b, z, d, c) : M.bufferSubData(a, b, z.subarray(d, d + c)) }, Pf: function (a) { return M.checkFramebufferStatus(a) }, Of: function (a) { M.clear(a) }, dc: function (a, b, c, d) { M.clearBufferfi(a, b, c, d) }, ec: function (a, b, c) { M.clearBufferfv(a, b, C, c >> 2) }, hc: function (a, b, c) { M.clearBufferiv(a, b, v, c >> 2) }, gc: function (a, b, c) { M.clearBufferuiv(a, b, B, c >> 2) }, Nf: function (a, b, c, d) { M.clearColor(a, b, c, d) }, Mf: function (a) { M.clearDepth(a) },
        Lf: function (a) { M.clearStencil(a) }, Qb: function (a, b, c, d) { c >>>= 0; d >>>= 0; return M.clientWaitSync(Nd[a], b, 4294967295 == c && 4294967295 == d ? -1 : +(c >>> 0) + 4294967296 * +(d >>> 0)) }, Kf: function (a, b, c, d) { M.colorMask(!!a, !!b, !!c, !!d) }, Jf: function (a) { M.compileShader(Q[a]) }, If: function (a, b, c, d, e, f, k, l) { 2 <= R.version ? M.Ck ? M.compressedTexImage2D(a, b, c, d, e, f, k, l) : M.compressedTexImage2D(a, b, c, d, e, f, z, l, k) : M.compressedTexImage2D(a, b, c, d, e, f, l ? z.subarray(l, l + k) : null) }, ed: function (a, b, c, d, e, f, k, l, m) {
          M.Ck ? M.compressedTexImage3D(a,
            b, c, d, e, f, k, l, m) : M.compressedTexImage3D(a, b, c, d, e, f, k, z, m, l)
        }, Hf: function (a, b, c, d, e, f, k, l, m) { 2 <= R.version ? M.Ck ? M.compressedTexSubImage2D(a, b, c, d, e, f, k, l, m) : M.compressedTexSubImage2D(a, b, c, d, e, f, k, z, m, l) : M.compressedTexSubImage2D(a, b, c, d, e, f, k, m ? z.subarray(m, m + l) : null) }, dd: function (a, b, c, d, e, f, k, l, m, q, r) { M.Ck ? M.compressedTexSubImage3D(a, b, c, d, e, f, k, l, m, q, r) : M.compressedTexSubImage3D(a, b, c, d, e, f, k, l, m, z, r, q) }, bc: function (a, b, c, d, e) { M.copyBufferSubData(a, b, c, d, e) }, Gf: function (a, b, c, d, e, f, k, l) {
          M.copyTexImage2D(a,
            b, c, d, e, f, k, l)
        }, Ff: function (a, b, c, d, e, f, k, l) { M.copyTexSubImage2D(a, b, c, d, e, f, k, l) }, fd: function (a, b, c, d, e, f, k, l, m) { M.copyTexSubImage3D(a, b, c, d, e, f, k, l, m) }, Ef: function () { var a = Sd(N), b = M.createProgram(); b.name = a; N[a] = b; return a }, Df: function (a) { var b = Sd(Q); Q[b] = M.createShader(a); return b }, Cf: function (a) { M.cullFace(a) }, Bf: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2], e = Fd[d]; e && (M.deleteBuffer(e), e.name = 0, Fd[d] = null, d == Xd && (Xd = 0), d == Yd && (Yd = 0), d == M.$k && (M.$k = 0), d == M.Ck && (M.Ck = 0)) } }, Af: function (a,
          b) { for (var c = 0; c < a; ++c) { var d = v[b + 4 * c >> 2], e = Gd[d]; e && (M.deleteFramebuffer(e), e.name = 0, Gd[d] = null) } }, zf: function (a) { if (a) { var b = N[a]; b ? (M.deleteProgram(b), b.name = 0, N[a] = null, Od[a] = null) : T(1281) } }, bd: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2], e = Kd[d]; e && (M.deleteQuery(e), Kd[d] = null) } }, tg: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2], e = Jd[d]; e && (M.Lk.deleteQueryEXT(e), Jd[d] = null) } }, yf: function (a, b) {
            for (var c = 0; c < a; c++) {
              var d = v[b + 4 * c >> 2], e = Hd[d]; e && (M.deleteRenderbuffer(e), e.name = 0, Hd[d] =
                null)
            }
          }, Ib: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2], e = Ld[d]; e && (M.deleteSampler(e), e.name = 0, Ld[d] = null) } }, xf: function (a) { if (a) { var b = Q[a]; b ? (M.deleteShader(b), Q[a] = null) : T(1281) } }, Rb: function (a) { if (a) { var b = Nd[a]; b ? (M.deleteSync(b), b.name = 0, Nd[a] = null) : T(1281) } }, wf: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2], e = O[d]; e && (M.deleteTexture(e), e.name = 0, O[d] = null) } }, wb: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2], e = Md[d]; e && (M.deleteTransformFeedback(e), e.name = 0, Md[d] = null) } },
        Kc: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2]; M.deleteVertexArray(Id[d]); Id[d] = null } }, ig: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2]; M.deleteVertexArray(Id[d]); Id[d] = null } }, vf: function (a) { M.depthFunc(a) }, uf: function (a) { M.depthMask(!!a) }, tf: function (a, b) { M.depthRange(a, b) }, sf: function (a, b) { M.detachShader(N[a], Q[b]) }, rf: function (a) { M.disable(a) }, qf: function (a) { M.disableVertexAttribArray(a) }, of: function (a, b, c) { M.drawArrays(a, b, c) }, Vb: function (a, b, c, d) { M.drawArraysInstanced(a, b, c, d) },
        eg: function (a, b, c, d) { M.drawArraysInstanced(a, b, c, d) }, fb: function (a, b, c, d) { M.drawArraysInstanced(a, b, c, d) }, nd: function (a, b, c, d) { M.drawArraysInstanced(a, b, c, d) }, gb: function (a, b, c, d) { M.drawArraysInstanced(a, b, c, d) }, Wc: function (a, b) { for (var c = Zd[a], d = 0; d < a; d++)c[d] = v[b + 4 * d >> 2]; M.drawBuffers(c) }, ld: function (a, b) { for (var c = Zd[a], d = 0; d < a; d++)c[d] = v[b + 4 * d >> 2]; M.drawBuffers(c) }, fg: function (a, b) { for (var c = Zd[a], d = 0; d < a; d++)c[d] = v[b + 4 * d >> 2]; M.drawBuffers(c) }, nf: function (a, b, c, d) { M.drawElements(a, b, c, d) }, Ub: function (a,
          b, c, d, e) { M.drawElementsInstanced(a, b, c, d, e) }, dg: function (a, b, c, d, e) { M.drawElementsInstanced(a, b, c, d, e) }, cb: function (a, b, c, d, e) { M.drawElementsInstanced(a, b, c, d, e) }, db: function (a, b, c, d, e) { M.drawElementsInstanced(a, b, c, d, e) }, md: function (a, b, c, d, e) { M.drawElementsInstanced(a, b, c, d, e) }, jd: function (a, b, c, d, e, f) { $d(a, d, e, f) }, mf: function (a) { M.enable(a) }, lf: function (a) { M.enableVertexAttribArray(a) }, _c: function (a) { M.endQuery(a) }, qg: function (a) { M.Lk.endQueryEXT(a) }, Fc: function () { M.endTransformFeedback() }, Tb: function (a,
            b) { return (a = M.fenceSync(a, b)) ? (b = Sd(Nd), a.name = b, Nd[b] = a, b) : 0 }, kf: function () { M.finish() }, jf: function () { M.flush() }, hf: function (a, b, c, d) { M.framebufferRenderbuffer(a, b, c, Hd[d]) }, gf: function (a, b, c, d, e) { M.framebufferTexture2D(a, b, c, O[d], e) }, Nc: function (a, b, c, d, e) { M.framebufferTextureLayer(a, b, O[c], d, e) }, ff: function (a) { M.frontFace(a) }, ef: function (a, b) { V(a, b, "createBuffer", Fd) }, cf: function (a, b) { V(a, b, "createFramebuffer", Gd) }, cd: function (a, b) { V(a, b, "createQuery", Kd) }, ug: function (a, b) {
              for (var c = 0; c < a; c++) {
                var d =
                  M.Lk.createQueryEXT(); if (!d) { for (T(1282); c < a;)v[b + 4 * c++ >> 2] = 0; break } var e = Sd(Jd); d.name = e; Jd[e] = d; v[b + 4 * c >> 2] = e
              }
            }, bf: function (a, b) { V(a, b, "createRenderbuffer", Hd) }, Jb: function (a, b) { V(a, b, "createSampler", Ld) }, af: function (a, b) { V(a, b, "createTexture", O) }, vb: function (a, b) { V(a, b, "createTransformFeedback", Md) }, Jc: function (a, b) { V(a, b, "createVertexArray", Id) }, hg: function (a, b) { V(a, b, "createVertexArray", Id) }, df: function (a) { M.generateMipmap(a) }, $e: function (a, b, c, d, e, f, k) {
              a = N[a]; if (a = M.getActiveAttrib(a, b)) c = 0 <
                c && k ? h(a.name, k, c) : 0, d && (v[d >> 2] = c), e && (v[e >> 2] = a.size), f && (v[f >> 2] = a.type)
            }, _e: function (a, b, c, d, e, f, k) { a = N[a]; if (a = M.getActiveUniform(a, b)) c = 0 < c && k ? h(a.name, k, c) : 0, d && (v[d >> 2] = c), e && (v[e >> 2] = a.size), f && (v[f >> 2] = a.type) }, Yb: function (a, b, c, d, e) { a = N[a]; if (a = M.getActiveUniformBlockName(a, b)) e && 0 < c ? (c = h(a, e, c), d && (v[d >> 2] = c)) : d && (v[d >> 2] = 0) }, Zb: function (a, b, c, d) {
              if (d) switch (a = N[a], c) {
                case 35393: a = M.getActiveUniformBlockName(a, b); v[d >> 2] = a.length + 1; break; default: if (a = M.getActiveUniformBlockParameter(a,
                  b, c)) if ("number" == typeof a) v[d >> 2] = a; else for (b = 0; b < a.length; b++)v[d + 4 * b >> 2] = a[b]
              } else T(1281)
            }, $b: function (a, b, c, d, e) { if (e) if (0 < b && 0 == c) T(1281); else { a = N[a]; for (var f = [], k = 0; k < b; k++)f.push(v[c + 4 * k >> 2]); if (a = M.getActiveUniforms(a, f, d)) for (b = a.length, k = 0; k < b; k++)v[e + 4 * k >> 2] = a[k] } else T(1281) }, Ze: function (a, b, c, d) { a = M.getAttachedShaders(N[a]); var e = a.length; e > b && (e = b); v[c >> 2] = e; for (b = 0; b < e; ++b)v[d + 4 * b >> 2] = Q.indexOf(a[b]) }, Ye: function (a, b) { return M.getAttribLocation(N[a], A(b)) }, Xe: function (a, b) {
              ae(a,
                b, 4)
            }, Kb: function (a, b, c) { c ? (F = [M.getBufferParameter(a, b) >>> 0, (E = M.getBufferParameter(a, b), 1 <= +fb(E) ? 0 < E ? (kb(+jb(E / 4294967296), 4294967295) | 0) >>> 0 : ~~+gb((E - +(~~E >>> 0)) / 4294967296) >>> 0 : 0)], v[c >> 2] = F[0], v[c + 4 >> 2] = F[1]) : T(1281) }, We: function (a, b, c) { c ? v[c >> 2] = M.getBufferParameter(a, b) : T(1281) }, Ve: function () { var a = M.getError() || Ed; Ed = 0; return a }, Ue: function (a, b) { ae(a, b, 2) }, rc: function (a, b) { return M.getFragDataLocation(N[a], A(b)) }, Te: function (a, b, c, d) {
              a = M.getFramebufferAttachmentParameter(a, b, c); if (a instanceof
                WebGLRenderbuffer || a instanceof WebGLTexture) a = a.name | 0; v[d >> 2] = a
            }, Mb: function (a, b, c) { be(a, b, c, 1) }, Ob: function (a, b) { ae(a, b, 1) }, Hc: function (a, b, c) { be(a, b, c, 0) }, Se: function (a, b) { ae(a, b, 0) }, jb: function (a, b, c, d, e) { if (0 > d) T(1281); else if (e) { if (a = M.getInternalformatParameter(a, b, c), null !== a) for (b = 0; b < a.length && b < d; ++b)v[e + b >> 2] = a[b] } else T(1281) }, rb: function () { T(1282) }, Qe: function (a, b, c, d) { a = M.getProgramInfoLog(N[a]); null === a && (a = "(unknown error)"); b = 0 < b && d ? h(a, d, b) : 0; c && (v[c >> 2] = b) }, Re: function (a, b, c) {
              if (c) if (a >=
                Dd) T(1281); else {
                  var d = Od[a]; if (d) if (35716 == b) a = M.getProgramInfoLog(N[a]), null === a && (a = "(unknown error)"), v[c >> 2] = a.length + 1; else if (35719 == b) v[c >> 2] = d.Il; else if (35722 == b) { if (-1 == d.Qk) { a = N[a]; var e = M.getProgramParameter(a, 35721); for (b = d.Qk = 0; b < e; ++b)d.Qk = Math.max(d.Qk, M.getActiveAttrib(a, b).name.length + 1) } v[c >> 2] = d.Qk } else if (35381 == b) { if (-1 == d.Rk) for (a = N[a], e = M.getProgramParameter(a, 35382), b = d.Rk = 0; b < e; ++b)d.Rk = Math.max(d.Rk, M.getActiveUniformBlockName(a, b).length + 1); v[c >> 2] = d.Rk } else v[c >> 2] = M.getProgramParameter(N[a],
                    b); else T(1282)
              } else T(1281)
            }, lg: function (a, b, c) { if (c) { a = M.Lk.getQueryObjectEXT(Jd[a], b); var d; "boolean" == typeof a ? d = a ? 1 : 0 : d = a; F = [d >>> 0, (E = d, 1 <= +fb(E) ? 0 < E ? (kb(+jb(E / 4294967296), 4294967295) | 0) >>> 0 : ~~+gb((E - +(~~E >>> 0)) / 4294967296) >>> 0 : 0)]; v[c >> 2] = F[0]; v[c + 4 >> 2] = F[1] } else T(1281) }, ng: function (a, b, c) { if (c) { a = M.Lk.getQueryObjectEXT(Jd[a], b); var d; "boolean" == typeof a ? d = a ? 1 : 0 : d = a; v[c >> 2] = d } else T(1281) }, kg: function (a, b, c) {
              if (c) {
                a = M.Lk.getQueryObjectEXT(Jd[a], b); var d; "boolean" == typeof a ? d = a ? 1 : 0 : d = a; F = [d >>>
                  0, (E = d, 1 <= +fb(E) ? 0 < E ? (kb(+jb(E / 4294967296), 4294967295) | 0) >>> 0 : ~~+gb((E - +(~~E >>> 0)) / 4294967296) >>> 0 : 0)]; v[c >> 2] = F[0]; v[c + 4 >> 2] = F[1]
              } else T(1281)
            }, Yc: function (a, b, c) { if (c) { a = M.getQueryParameter(Kd[a], b); var d; "boolean" == typeof a ? d = a ? 1 : 0 : d = a; v[c >> 2] = d } else T(1281) }, mg: function (a, b, c) { if (c) { a = M.Lk.getQueryObjectEXT(Jd[a], b); var d; "boolean" == typeof a ? d = a ? 1 : 0 : d = a; v[c >> 2] = d } else T(1281) }, Zc: function (a, b, c) { c ? v[c >> 2] = M.getQuery(a, b) : T(1281) }, og: function (a, b, c) { c ? v[c >> 2] = M.Lk.getQueryEXT(a, b) : T(1281) }, Pe: function (a,
              b, c) { c ? v[c >> 2] = M.getRenderbufferParameter(a, b) : T(1281) }, zb: function (a, b, c) { c ? (a = Ld[a], C[c >> 2] = M.getSamplerParameter(a, b)) : T(1281) }, Bb: function (a, b, c) { c ? (a = Ld[a], v[c >> 2] = M.getSamplerParameter(a, b)) : T(1281) }, Ne: function (a, b, c, d) { a = M.getShaderInfoLog(Q[a]); null === a && (a = "(unknown error)"); b = 0 < b && d ? h(a, d, b) : 0; c && (v[c >> 2] = b) }, Me: function (a, b, c, d) { a = M.getShaderPrecisionFormat(a, b); v[c >> 2] = a.rangeMin; v[c + 4 >> 2] = a.rangeMax; v[d >> 2] = a.precision }, Ke: function (a, b, c, d) {
                if (a = M.getShaderSource(Q[a])) b = 0 < b && d ? h(a,
                  d, b) : 0, c && (v[c >> 2] = b)
              }, Oe: function (a, b, c) { c ? 35716 == b ? (a = M.getShaderInfoLog(Q[a]), null === a && (a = "(unknown error)"), v[c >> 2] = a.length + 1) : 35720 == b ? (a = M.getShaderSource(Q[a]), v[c >> 2] = null === a || 0 == a.length ? 0 : a.length + 1) : v[c >> 2] = M.getShaderParameter(Q[a], b) : T(1281) }, Je: function (a) {
                if (Pd[a]) return Pd[a]; switch (a) {
                  case 7939: var b = M.getSupportedExtensions() || []; b = b.concat(b.map(function (a) { return "GL_" + a })); b = ce(b.join(" ")); break; case 7936: case 7937: case 37445: case 37446: (b = M.getParameter(a)) || T(1280); b = ce(b);
                    break; case 7938: b = M.getParameter(7938); b = 2 <= R.version ? "OpenGL ES 3.0 (" + b + ")" : "OpenGL ES 2.0 (" + b + ")"; b = ce(b); break; case 35724: b = M.getParameter(35724); var c = b.match(/^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/); null !== c && (3 == c[1].length && (c[1] += "0"), b = "OpenGL ES GLSL ES " + c[1] + " (" + b + ")"); b = ce(b); break; default: return T(1280), 0
                }return Pd[a] = b
              }, cc: function (a, b) {
                if (2 > R.version) return T(1282), 0; var c = Qd[a]; if (c) return 0 > b || b >= c.length ? (T(1281), 0) : c[b]; switch (a) {
                  case 7939: return c = M.getSupportedExtensions() ||
                    [], c = c.concat(c.map(function (a) { return "GL_" + a })), c = c.map(function (a) { return ce(a) }), c = Qd[a] = c, 0 > b || b >= c.length ? (T(1281), 0) : c[b]; default: return T(1280), 0
                }
              }, Nb: function (a, b, c, d, e) { 0 > c ? T(1281) : e ? (a = M.getSyncParameter(Nd[a], b), v[d >> 2] = a, null !== a && d && (v[d >> 2] = 1)) : T(1281) }, Ie: function (a, b, c) { c ? C[c >> 2] = M.getTexParameter(a, b) : T(1281) }, He: function (a, b, c) { c ? v[c >> 2] = M.getTexParameter(a, b) : T(1281) }, Ac: function (a, b, c, d, e, f, k) {
                a = N[a]; if (a = M.getTransformFeedbackVarying(a, b)) k && 0 < c ? (c = h(a.name, k, c), d && (v[d >> 2] = c)) :
                  d && (v[d >> 2] = 0), e && (v[e >> 2] = a.size), f && (v[f >> 2] = a.type)
              }, _b: function (a, b) { return M.getUniformBlockIndex(N[a], A(b)) }, ac: function (a, b, c, d) { if (d) if (0 < b && (0 == c || 0 == d)) T(1281); else { a = N[a]; for (var e = [], f = 0; f < b; f++)e.push(A(v[c + 4 * f >> 2])); if (a = M.getUniformIndices(a, e)) for (b = a.length, f = 0; f < b; f++)v[d + 4 * f >> 2] = a[f] } else T(1281) }, Ee: function (a, b) {
                b = A(b); var c = 0; if ("]" == b[b.length - 1]) { var d = b.lastIndexOf("["); c = "]" != b[d + 1] ? parseInt(b.slice(d + 1)) : 0; b = b.slice(0, d) } return (a = Od[a] && Od[a].am[b]) && 0 <= c && c < a[0] ? a[1] + c :
                  -1
              }, Ge: function (a, b, c) { de(a, b, c, 2) }, Fe: function (a, b, c) { de(a, b, c, 0) }, sc: function (a, b, c) { de(a, b, c, 0) }, yc: function (a, b, c) { ee(a, b, c, 0) }, xc: function (a, b, c) { ee(a, b, c, 0) }, Be: function (a, b, c) { c ? v[c >> 2] = M.getVertexAttribOffset(a, b) : T(1281) }, De: function (a, b, c) { ee(a, b, c, 2) }, Ce: function (a, b, c) { ee(a, b, c, 5) }, ze: function (a, b) { M.hint(a, b) }, nb: function (a, b, c) { for (var d = Zd[b], e = 0; e < b; e++)d[e] = v[c + 4 * e >> 2]; M.invalidateFramebuffer(a, d) }, mb: function (a, b, c, d, e, f, k) {
                for (var l = Zd[b], m = 0; m < b; m++)l[m] = v[c + 4 * m >> 2]; M.invalidateSubFramebuffer(a,
                  l, d, e, f, k)
              }, ye: function (a) { return (a = Fd[a]) ? M.isBuffer(a) : 0 }, xe: function (a) { return M.isEnabled(a) }, we: function (a) { return (a = Gd[a]) ? M.isFramebuffer(a) : 0 }, ve: function (a) { return (a = N[a]) ? M.isProgram(a) : 0 }, ad: function (a) { return (a = Kd[a]) ? M.isQuery(a) : 0 }, sg: function (a) { return (a = Jd[a]) ? M.Lk.isQueryEXT(a) : 0 }, ue: function (a) { return (a = Hd[a]) ? M.isRenderbuffer(a) : 0 }, Hb: function (a) { return (a = Ld[a]) ? M.isSampler(a) : 0 }, te: function (a) { return (a = Q[a]) ? M.isShader(a) : 0 }, Sb: function (a) { return (a = Nd[a]) ? M.isSync(a) : 0 }, se: function (a) {
                return (a =
                  O[a]) ? M.isTexture(a) : 0
              }, ub: function (a) { return M.isTransformFeedback(Md[a]) }, Ic: function (a) { return (a = Id[a]) ? M.isVertexArray(a) : 0 }, gg: function (a) { return (a = Id[a]) ? M.isVertexArray(a) : 0 }, re: function (a) { M.lineWidth(a) }, qe: function (a) { M.linkProgram(N[a]); Wd(a) }, tb: function () { M.pauseTransformFeedback() }, pe: function (a, b) { 3317 == a && (Rd = b); M.pixelStorei(a, b) }, oe: function (a, b) { M.polygonOffset(a, b) }, qb: function () { T(1280) }, ob: function () { T(1280) }, pg: function (a, b) { M.Lk.queryCounterEXT(Jd[a], b) }, kd: function (a) { M.readBuffer(a) },
        ne: function (a, b, c, d, e, f, k) { if (2 <= R.version) if (M.$k) M.readPixels(a, b, c, d, e, f, k); else { var l = fe(f); M.readPixels(a, b, c, d, e, f, l, k >> ge(l)) } else (k = he(f, e, c, d, k)) ? M.readPixels(a, b, c, d, e, f, k) : T(1280) }, me: function () { }, le: function (a, b, c, d) { M.renderbufferStorage(a, b, c, d) }, Oc: function (a, b, c, d, e) { M.renderbufferStorageMultisample(a, b, c, d, e) }, sb: function () { M.resumeTransformFeedback() }, ke: function (a, b) { M.sampleCoverage(a, !!b) }, Db: function (a, b, c) { M.samplerParameterf(Ld[a], b, c) }, Cb: function (a, b, c) {
          M.samplerParameterf(Ld[a],
            b, C[c >> 2])
        }, Fb: function (a, b, c) { M.samplerParameteri(Ld[a], b, c) }, Eb: function (a, b, c) { M.samplerParameteri(Ld[a], b, v[c >> 2]) }, je: function (a, b, c, d) { M.scissor(a, b, c, d) }, ie: function () { T(1280) }, he: function (a, b, c, d) { b = Ud(b, c, d); M.shaderSource(Q[a], b) }, ge: function (a, b, c) { M.stencilFunc(a, b, c) }, fe: function (a, b, c, d) { M.stencilFuncSeparate(a, b, c, d) }, ee: function (a) { M.stencilMask(a) }, de: function (a, b) { M.stencilMaskSeparate(a, b) }, ce: function (a, b, c) { M.stencilOp(a, b, c) }, be: function (a, b, c, d) { M.stencilOpSeparate(a, b, c, d) },
        ae: function (a, b, c, d, e, f, k, l, m) { if (2 <= R.version) if (M.Ck) M.texImage2D(a, b, c, d, e, f, k, l, m); else if (m) { var q = fe(l); M.texImage2D(a, b, c, d, e, f, k, l, q, m >> ge(q)) } else M.texImage2D(a, b, c, d, e, f, k, l, null); else M.texImage2D(a, b, c, d, e, f, k, l, m ? he(l, k, d, e, m) : null) }, id: function (a, b, c, d, e, f, k, l, m, q) { if (M.Ck) M.texImage3D(a, b, c, d, e, f, k, l, m, q); else if (q) { var r = fe(m); M.texImage3D(a, b, c, d, e, f, k, l, m, r, q >> ge(r)) } else M.texImage3D(a, b, c, d, e, f, k, l, m, null) }, $d: function (a, b, c) { M.texParameterf(a, b, c) }, _d: function (a, b, c) {
          M.texParameterf(a,
            b, C[c >> 2])
        }, Zd: function (a, b, c) { M.texParameteri(a, b, c) }, Yd: function (a, b, c) { M.texParameteri(a, b, v[c >> 2]) }, lb: function (a, b, c, d, e) { M.texStorage2D(a, b, c, d, e) }, kb: function (a, b, c, d, e, f) { M.texStorage3D(a, b, c, d, e, f) }, Wd: function (a, b, c, d, e, f, k, l, m) { if (2 <= R.version) if (M.Ck) M.texSubImage2D(a, b, c, d, e, f, k, l, m); else if (m) { var q = fe(l); M.texSubImage2D(a, b, c, d, e, f, k, l, q, m >> ge(q)) } else M.texSubImage2D(a, b, c, d, e, f, k, l, null); else q = null, m && (q = he(l, k, e, f, m)), M.texSubImage2D(a, b, c, d, e, f, k, l, q) }, hd: function (a, b, c, d, e, f,
          k, l, m, q, r) { if (M.Ck) M.texSubImage3D(a, b, c, d, e, f, k, l, m, q, r); else if (r) { var w = fe(q); M.texSubImage3D(a, b, c, d, e, f, k, l, m, q, w, r >> ge(w)) } else M.texSubImage3D(a, b, c, d, e, f, k, l, m, q, null) }, Cc: function (a, b, c, d) { a = N[a]; for (var e = [], f = 0; f < b; f++)e.push(A(v[c + 4 * f >> 2])); M.transformFeedbackVaryings(a, e, d) }, Vd: function (a, b) { M.uniform1f(P[a], b) }, Ud: function (a, b, c) {
            if (2 <= R.version) M.uniform1fv(P[a], C, c >> 2, b); else {
              if (256 >= b) for (var d = U[b - 1], e = 0; e < b; ++e)d[e] = C[c + 4 * e >> 2]; else d = C.subarray(c >> 2, c + 4 * b >> 2); M.uniform1fv(P[a],
                d)
            }
          }, Td: function (a, b) { M.uniform1i(P[a], b) }, Sd: function (a, b, c) { if (2 <= R.version) M.uniform1iv(P[a], v, c >> 2, b); else { if (256 >= b) for (var d = Td[b - 1], e = 0; e < b; ++e)d[e] = v[c + 4 * e >> 2]; else d = v.subarray(c >> 2, c + 4 * b >> 2); M.uniform1iv(P[a], d) } }, pc: function (a, b) { M.uniform1ui(P[a], b) }, lc: function (a, b, c) { M.uniform1uiv(P[a], B, c >> 2, b) }, Rd: function (a, b, c) { M.uniform2f(P[a], b, c) }, Qd: function (a, b, c) {
            if (2 <= R.version) M.uniform2fv(P[a], C, c >> 2, 2 * b); else {
              if (256 >= 2 * b) for (var d = U[2 * b - 1], e = 0; e < 2 * b; e += 2)d[e] = C[c + 4 * e >> 2], d[e + 1] = C[c + (4 *
                e + 4) >> 2]; else d = C.subarray(c >> 2, c + 8 * b >> 2); M.uniform2fv(P[a], d)
            }
          }, Pd: function (a, b, c) { M.uniform2i(P[a], b, c) }, Od: function (a, b, c) { if (2 <= R.version) M.uniform2iv(P[a], v, c >> 2, 2 * b); else { if (256 >= 2 * b) for (var d = Td[2 * b - 1], e = 0; e < 2 * b; e += 2)d[e] = v[c + 4 * e >> 2], d[e + 1] = v[c + (4 * e + 4) >> 2]; else d = v.subarray(c >> 2, c + 8 * b >> 2); M.uniform2iv(P[a], d) } }, oc: function (a, b, c) { M.uniform2ui(P[a], b, c) }, kc: function (a, b, c) { M.uniform2uiv(P[a], B, c >> 2, 2 * b) }, Nd: function (a, b, c, d) { M.uniform3f(P[a], b, c, d) }, Md: function (a, b, c) {
            if (2 <= R.version) M.uniform3fv(P[a],
              C, c >> 2, 3 * b); else { if (256 >= 3 * b) for (var d = U[3 * b - 1], e = 0; e < 3 * b; e += 3)d[e] = C[c + 4 * e >> 2], d[e + 1] = C[c + (4 * e + 4) >> 2], d[e + 2] = C[c + (4 * e + 8) >> 2]; else d = C.subarray(c >> 2, c + 12 * b >> 2); M.uniform3fv(P[a], d) }
          }, Ld: function (a, b, c, d) { M.uniform3i(P[a], b, c, d) }, Kd: function (a, b, c) { if (2 <= R.version) M.uniform3iv(P[a], v, c >> 2, 3 * b); else { if (256 >= 3 * b) for (var d = Td[3 * b - 1], e = 0; e < 3 * b; e += 3)d[e] = v[c + 4 * e >> 2], d[e + 1] = v[c + (4 * e + 4) >> 2], d[e + 2] = v[c + (4 * e + 8) >> 2]; else d = v.subarray(c >> 2, c + 12 * b >> 2); M.uniform3iv(P[a], d) } }, nc: function (a, b, c, d) {
            M.uniform3ui(P[a],
              b, c, d)
          }, jc: function (a, b, c) { M.uniform3uiv(P[a], B, c >> 2, 3 * b) }, Jd: function (a, b, c, d, e) { M.uniform4f(P[a], b, c, d, e) }, Id: function (a, b, c) { if (2 <= R.version) M.uniform4fv(P[a], C, c >> 2, 4 * b); else { if (256 >= 4 * b) for (var d = U[4 * b - 1], e = 0; e < 4 * b; e += 4)d[e] = C[c + 4 * e >> 2], d[e + 1] = C[c + (4 * e + 4) >> 2], d[e + 2] = C[c + (4 * e + 8) >> 2], d[e + 3] = C[c + (4 * e + 12) >> 2]; else d = C.subarray(c >> 2, c + 16 * b >> 2); M.uniform4fv(P[a], d) } }, Hd: function (a, b, c, d, e) { M.uniform4i(P[a], b, c, d, e) }, Gd: function (a, b, c) {
            if (2 <= R.version) M.uniform4iv(P[a], v, c >> 2, 4 * b); else {
              if (256 >= 4 * b) for (var d =
                Td[4 * b - 1], e = 0; e < 4 * b; e += 4)d[e] = v[c + 4 * e >> 2], d[e + 1] = v[c + (4 * e + 4) >> 2], d[e + 2] = v[c + (4 * e + 8) >> 2], d[e + 3] = v[c + (4 * e + 12) >> 2]; else d = v.subarray(c >> 2, c + 16 * b >> 2); M.uniform4iv(P[a], d)
            }
          }, mc: function (a, b, c, d, e) { M.uniform4ui(P[a], b, c, d, e) }, ic: function (a, b, c) { M.uniform4uiv(P[a], B, c >> 2, 4 * b) }, Xb: function (a, b, c) { a = N[a]; M.uniformBlockBinding(a, b, c) }, Fd: function (a, b, c, d) {
            if (2 <= R.version) M.uniformMatrix2fv(P[a], !!c, C, d >> 2, 4 * b); else {
              if (256 >= 4 * b) for (var e = U[4 * b - 1], f = 0; f < 4 * b; f += 4)e[f] = C[d + 4 * f >> 2], e[f + 1] = C[d + (4 * f + 4) >> 2], e[f + 2] =
                C[d + (4 * f + 8) >> 2], e[f + 3] = C[d + (4 * f + 12) >> 2]; else e = C.subarray(d >> 2, d + 16 * b >> 2); M.uniformMatrix2fv(P[a], !!c, e)
            }
          }, Vc: function (a, b, c, d) { M.uniformMatrix2x3fv(P[a], !!c, C, d >> 2, 6 * b) }, Tc: function (a, b, c, d) { M.uniformMatrix2x4fv(P[a], !!c, C, d >> 2, 8 * b) }, Ed: function (a, b, c, d) {
            if (2 <= R.version) M.uniformMatrix3fv(P[a], !!c, C, d >> 2, 9 * b); else {
              if (256 >= 9 * b) for (var e = U[9 * b - 1], f = 0; f < 9 * b; f += 9)e[f] = C[d + 4 * f >> 2], e[f + 1] = C[d + (4 * f + 4) >> 2], e[f + 2] = C[d + (4 * f + 8) >> 2], e[f + 3] = C[d + (4 * f + 12) >> 2], e[f + 4] = C[d + (4 * f + 16) >> 2], e[f + 5] = C[d + (4 * f + 20) >> 2], e[f +
                6] = C[d + (4 * f + 24) >> 2], e[f + 7] = C[d + (4 * f + 28) >> 2], e[f + 8] = C[d + (4 * f + 32) >> 2]; else e = C.subarray(d >> 2, d + 36 * b >> 2); M.uniformMatrix3fv(P[a], !!c, e)
            }
          }, Uc: function (a, b, c, d) { M.uniformMatrix3x2fv(P[a], !!c, C, d >> 2, 6 * b) }, Rc: function (a, b, c, d) { M.uniformMatrix3x4fv(P[a], !!c, C, d >> 2, 12 * b) }, Dd: function (a, b, c, d) {
            if (2 <= R.version) M.uniformMatrix4fv(P[a], !!c, C, d >> 2, 16 * b); else {
              if (256 >= 16 * b) for (var e = U[16 * b - 1], f = 0; f < 16 * b; f += 16)e[f] = C[d + 4 * f >> 2], e[f + 1] = C[d + (4 * f + 4) >> 2], e[f + 2] = C[d + (4 * f + 8) >> 2], e[f + 3] = C[d + (4 * f + 12) >> 2], e[f + 4] = C[d + (4 * f + 16) >>
                2], e[f + 5] = C[d + (4 * f + 20) >> 2], e[f + 6] = C[d + (4 * f + 24) >> 2], e[f + 7] = C[d + (4 * f + 28) >> 2], e[f + 8] = C[d + (4 * f + 32) >> 2], e[f + 9] = C[d + (4 * f + 36) >> 2], e[f + 10] = C[d + (4 * f + 40) >> 2], e[f + 11] = C[d + (4 * f + 44) >> 2], e[f + 12] = C[d + (4 * f + 48) >> 2], e[f + 13] = C[d + (4 * f + 52) >> 2], e[f + 14] = C[d + (4 * f + 56) >> 2], e[f + 15] = C[d + (4 * f + 60) >> 2]; else e = C.subarray(d >> 2, d + 64 * b >> 2); M.uniformMatrix4fv(P[a], !!c, e)
            }
          }, Sc: function (a, b, c, d) { M.uniformMatrix4x2fv(P[a], !!c, C, d >> 2, 8 * b) }, Qc: function (a, b, c, d) { M.uniformMatrix4x3fv(P[a], !!c, C, d >> 2, 12 * b) }, Bd: function (a) { M.useProgram(N[a]) },
        Ad: function (a) { M.validateProgram(N[a]) }, zd: function (a, b) { M.vertexAttrib1f(a, b) }, yd: function (a, b) { M.vertexAttrib1f(a, C[b >> 2]) }, xd: function (a, b, c) { M.vertexAttrib2f(a, b, c) }, wd: function (a, b) { M.vertexAttrib2f(a, C[b >> 2], C[b + 4 >> 2]) }, vd: function (a, b, c, d) { M.vertexAttrib3f(a, b, c, d) }, ud: function (a, b) { M.vertexAttrib3f(a, C[b >> 2], C[b + 4 >> 2], C[b + 8 >> 2]) }, td: function (a, b, c, d, e) { M.vertexAttrib4f(a, b, c, d, e) }, sd: function (a, b) { M.vertexAttrib4f(a, C[b >> 2], C[b + 4 >> 2], C[b + 8 >> 2], C[b + 12 >> 2]) }, yb: function (a, b) {
          M.vertexAttribDivisor(a,
            b)
        }, cg: function (a, b) { M.vertexAttribDivisor(a, b) }, hb: function (a, b) { M.vertexAttribDivisor(a, b) }, od: function (a, b) { M.vertexAttribDivisor(a, b) }, ib: function (a, b) { M.vertexAttribDivisor(a, b) }, wc: function (a, b, c, d, e) { M.vertexAttribI4i(a, b, c, d, e) }, uc: function (a, b) { M.vertexAttribI4i(a, v[b >> 2], v[b + 4 >> 2], v[b + 8 >> 2], v[b + 12 >> 2]) }, vc: function (a, b, c, d, e) { M.vertexAttribI4ui(a, b, c, d, e) }, tc: function (a, b) { M.vertexAttribI4ui(a, B[b >> 2], B[b + 4 >> 2], B[b + 8 >> 2], B[b + 12 >> 2]) }, zc: function (a, b, c, d, e) {
          M.vertexAttribIPointer(a, b, c, d,
            e)
        }, qd: function (a, b, c, d, e, f) { M.vertexAttribPointer(a, b, c, !!d, e, f) }, pd: function (a, b, c, d) { M.viewport(a, b, c, d) }, Pb: function (a, b, c, d) { c >>>= 0; d >>>= 0; M.waitSync(Nd[a], b, 4294967295 == c && 4294967295 == d ? -1 : +(c >>> 0) + 4294967296 * +(d >>> 0)) }, f: function (a, b) { X(a, b || 1); throw "longjmp"; }, vg: function (a, b, c) { z.set(z.subarray(b, b + c), a) }, wg: function (a) {
          var b = x.length; if (2147418112 < a) return !1; for (var c = 1; 4 >= c; c *= 2) {
            var d = b * (1 + .2 / c); d = Math.min(d, a + 100663296); d = Math.max(16777216, a, d); 0 < d % 65536 && (d += 65536 - d % 65536); a: {
              try {
                xa.grow(Math.min(2147418112,
                  d) - buffer.byteLength + 65535 >> 16); Xa(xa.buffer); var e = 1; break a
              } catch (f) { } e = void 0
            } if (e) return !0
          } return !1
        }, ia: function () { return R ? R.handle : 0 }, Z: function (a) { return od(a) ? 0 : -5 }, Fg: function (a, b) { var c = 0; pe().forEach(function (d, e) { var f = b + c; e = v[a + 4 * e >> 2] = f; for (f = 0; f < d.length; ++f)x[e++ >> 0] = d.charCodeAt(f); x[e >> 0] = 0; c += d.length + 1 }); return 0 }, Gg: function (a, b) { var c = pe(); v[a >> 2] = c.length; var d = 0; c.forEach(function (a) { d += a.length + 1 }); v[b >> 2] = d; return 0 }, gd: function (a) {
          if (!wa && (za = !0, g.onExit)) g.onExit(a); fa(a,
            new qa(a))
        }, L: function () { return 0 }, Eg: function (a, b) { try { var c = xb.Sl(a), d = c.tty ? 2 : (void 0).mn(c.mode) ? 3 : (void 0).nn(c.mode) ? 7 : 4; x[b >> 0] = d; return 0 } catch (e) { return p(e), e.Vk } }, Lg: function (a, b, c, d) { try { var e = xb.Sl(a), f = xb.jn(e, b, c); v[d >> 2] = f; return 0 } catch (k) { return p(k), k.Vk } }, bb: function () { return 0 }, Mg: function (a, b, c, d) {
          try { for (var e = 0, f = 0; f < c; f++) { for (var k = v[b + 8 * f >> 2], l = v[b + (8 * f + 4) >> 2], m = 0; m < l; m++) { var q = z[k + m], r = vb[a]; 0 === q || 10 === q ? ((1 === a ? ra : u)(Da(r, 0)), r.length = 0) : r.push(q) } e += l } v[d >> 2] = e; return 0 } catch (w) {
            return p(w),
              w.Vk
          }
        }, a: function () { return ua | 0 }, Bc: function (a) { M.activeTexture(a) }, qc: function (a, b) { M.attachShader(N[a], Q[b]) }, fc: function (a, b, c) { M.bindAttribLocation(N[a], b, A(c)) }, Wb: function (a, b) { 35051 == a ? M.$k = b : 35052 == a && (M.Ck = b); M.bindBuffer(a, Fd[b]) }, Lb: function (a, b) { M.bindFramebuffer(a, Gd[b]) }, Ab: function (a, b) { M.bindRenderbuffer(a, Hd[b]) }, pb: function (a, b) { M.bindTexture(a, O[b]) }, eb: function (a, b, c, d) { M.blendColor(a, b, c, d) }, ab: function (a) { M.blendEquation(a) }, $a: function (a, b) { M.blendFunc(a, b) }, _a: function (a, b,
          c, d) { 2 <= R.version ? c ? M.bufferData(a, z, d, c, b) : M.bufferData(a, b, d) : M.bufferData(a, c ? z.subarray(c, c + b) : b, d) }, Ya: function (a, b, c, d) { 2 <= R.version ? M.bufferSubData(a, b, z, d, c) : M.bufferSubData(a, b, z.subarray(d, d + c)) }, Xa: function (a) { return M.checkFramebufferStatus(a) }, O: function (a) { M.clear(a) }, Y: function (a, b, c, d) { M.clearColor(a, b, c, d) }, P: function (a) { M.clearStencil(a) }, Wa: function (a, b, c, d) { M.colorMask(!!a, !!b, !!c, !!d) }, Va: function (a) { M.compileShader(Q[a]) }, Ua: function (a, b, c, d, e, f, k, l) {
            2 <= R.version ? M.Ck ? M.compressedTexImage2D(a,
              b, c, d, e, f, k, l) : M.compressedTexImage2D(a, b, c, d, e, f, z, l, k) : M.compressedTexImage2D(a, b, c, d, e, f, l ? z.subarray(l, l + k) : null)
          }, Ta: function (a, b, c, d, e, f, k, l, m) { 2 <= R.version ? M.Ck ? M.compressedTexSubImage2D(a, b, c, d, e, f, k, l, m) : M.compressedTexSubImage2D(a, b, c, d, e, f, k, z, m, l) : M.compressedTexSubImage2D(a, b, c, d, e, f, k, m ? z.subarray(m, m + l) : null) }, Sa: function (a, b, c, d, e, f, k, l) { M.copyTexSubImage2D(a, b, c, d, e, f, k, l) }, Ra: function () { var a = Sd(N), b = M.createProgram(); b.name = a; N[a] = b; return a }, Qa: function (a) {
            var b = Sd(Q); Q[b] = M.createShader(a);
            return b
          }, Pa: function (a) { M.cullFace(a) }, Oa: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2], e = Fd[d]; e && (M.deleteBuffer(e), e.name = 0, Fd[d] = null, d == Xd && (Xd = 0), d == Yd && (Yd = 0), d == M.$k && (M.$k = 0), d == M.Ck && (M.Ck = 0)) } }, Na: function (a, b) { for (var c = 0; c < a; ++c) { var d = v[b + 4 * c >> 2], e = Gd[d]; e && (M.deleteFramebuffer(e), e.name = 0, Gd[d] = null) } }, Ma: function (a) { if (a) { var b = N[a]; b ? (M.deleteProgram(b), b.name = 0, N[a] = null, Od[a] = null) : T(1281) } }, La: function (a, b) {
            for (var c = 0; c < a; c++) {
              var d = v[b + 4 * c >> 2], e = Hd[d]; e && (M.deleteRenderbuffer(e),
                e.name = 0, Hd[d] = null)
            }
          }, Ka: function (a) { if (a) { var b = Q[a]; b ? (M.deleteShader(b), Q[a] = null) : T(1281) } }, Ja: function (a, b) { for (var c = 0; c < a; c++) { var d = v[b + 4 * c >> 2], e = O[d]; e && (M.deleteTexture(e), e.name = 0, O[d] = null) } }, Ia: function (a) { M.depthMask(!!a) }, Ha: function (a) { M.disable(a) }, Ga: function (a) { M.disableVertexAttribArray(a) }, Fa: function (a, b, c) { M.drawArrays(a, b, c) }, Da: $d, Ca: function (a) { M.enable(a) }, Ba: function (a) { M.enableVertexAttribArray(a) }, Aa: function () { M.finish() }, za: function () { M.flush() }, ya: function (a, b, c,
            d) { M.framebufferRenderbuffer(a, b, c, Hd[d]) }, xa: function (a, b, c, d, e) { M.framebufferTexture2D(a, b, c, O[d], e) }, wa: function (a) { M.frontFace(a) }, va: function (a, b) { V(a, b, "createBuffer", Fd) }, ua: function (a, b) { V(a, b, "createFramebuffer", Gd) }, sa: function (a, b) { V(a, b, "createRenderbuffer", Hd) }, ra: function (a, b) { V(a, b, "createTexture", O) }, qa: function (a) { M.generateMipmap(a) }, pa: function (a, b, c) { c ? v[c >> 2] = M.getBufferParameter(a, b) : T(1281) }, oa: function () { var a = M.getError() || Ed; Ed = 0; return a }, na: function (a, b, c, d) {
              a = M.getFramebufferAttachmentParameter(a,
                b, c); if (a instanceof WebGLRenderbuffer || a instanceof WebGLTexture) a = a.name | 0; v[d >> 2] = a
            }, J: function (a, b) { ae(a, b, 0) }, ma: function (a, b, c, d) { a = M.getProgramInfoLog(N[a]); null === a && (a = "(unknown error)"); b = 0 < b && d ? h(a, d, b) : 0; c && (v[c >> 2] = b) }, la: function (a, b, c) {
              if (c) if (a >= Dd) T(1281); else {
                var d = Od[a]; if (d) if (35716 == b) a = M.getProgramInfoLog(N[a]), null === a && (a = "(unknown error)"), v[c >> 2] = a.length + 1; else if (35719 == b) v[c >> 2] = d.Il; else if (35722 == b) {
                  if (-1 == d.Qk) {
                    a = N[a]; var e = M.getProgramParameter(a, 35721); for (b = d.Qk =
                      0; b < e; ++b)d.Qk = Math.max(d.Qk, M.getActiveAttrib(a, b).name.length + 1)
                  } v[c >> 2] = d.Qk
                } else if (35381 == b) { if (-1 == d.Rk) for (a = N[a], e = M.getProgramParameter(a, 35382), b = d.Rk = 0; b < e; ++b)d.Rk = Math.max(d.Rk, M.getActiveUniformBlockName(a, b).length + 1); v[c >> 2] = d.Rk } else v[c >> 2] = M.getProgramParameter(N[a], b); else T(1282)
              } else T(1281)
            }, ka: function (a, b, c) { c ? v[c >> 2] = M.getRenderbufferParameter(a, b) : T(1281) }, ja: function (a, b, c, d) { a = M.getShaderInfoLog(Q[a]); null === a && (a = "(unknown error)"); b = 0 < b && d ? h(a, d, b) : 0; c && (v[c >> 2] = b) },
        ha: function (a, b, c, d) { a = M.getShaderPrecisionFormat(a, b); v[c >> 2] = a.rangeMin; v[c + 4 >> 2] = a.rangeMax; v[d >> 2] = a.precision }, ga: function (a, b, c) { c ? 35716 == b ? (a = M.getShaderInfoLog(Q[a]), null === a && (a = "(unknown error)"), v[c >> 2] = a.length + 1) : 35720 == b ? (a = M.getShaderSource(Q[a]), v[c >> 2] = null === a || 0 == a.length ? 0 : a.length + 1) : v[c >> 2] = M.getShaderParameter(Q[a], b) : T(1281) }, fa: function (a) {
          if (Pd[a]) return Pd[a]; switch (a) {
            case 7939: var b = M.getSupportedExtensions() || []; b = b.concat(b.map(function (a) { return "GL_" + a })); b = ce(b.join(" "));
              break; case 7936: case 7937: case 37445: case 37446: (b = M.getParameter(a)) || T(1280); b = ce(b); break; case 7938: b = M.getParameter(7938); b = 2 <= R.version ? "OpenGL ES 3.0 (" + b + ")" : "OpenGL ES 2.0 (" + b + ")"; b = ce(b); break; case 35724: b = M.getParameter(35724); var c = b.match(/^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/); null !== c && (3 == c[1].length && (c[1] += "0"), b = "OpenGL ES GLSL ES " + c[1] + " (" + b + ")"); b = ce(b); break; default: return T(1280), 0
          }return Pd[a] = b
        }, ea: function (a, b) {
          b = A(b); var c = 0; if ("]" == b[b.length - 1]) {
            var d = b.lastIndexOf("[");
            c = "]" != b[d + 1] ? parseInt(b.slice(d + 1)) : 0; b = b.slice(0, d)
          } return (a = Od[a] && Od[a].am[b]) && 0 <= c && c < a[0] ? a[1] + c : -1
        }, da: function (a) { return (a = O[a]) ? M.isTexture(a) : 0 }, ca: function (a) { M.lineWidth(a) }, ba: function (a) { M.linkProgram(N[a]); Wd(a) }, aa: function (a, b) { 3317 == a && (Rd = b); M.pixelStorei(a, b) }, $: function (a, b, c, d, e, f, k) { if (2 <= R.version) if (M.$k) M.readPixels(a, b, c, d, e, f, k); else { var l = fe(f); M.readPixels(a, b, c, d, e, f, l, k >> ge(l)) } else (k = he(f, e, c, d, k)) ? M.readPixels(a, b, c, d, e, f, k) : T(1280) }, _: function (a, b, c, d) {
          M.renderbufferStorage(a,
            b, c, d)
        }, Fh: function (a, b, c, d) { M.scissor(a, b, c, d) }, Eh: function (a, b, c, d) { b = Ud(b, c, d); M.shaderSource(Q[a], b) }, Dh: function (a, b, c) { M.stencilFunc(a, b, c) }, Ch: function (a, b, c, d) { M.stencilFuncSeparate(a, b, c, d) }, Bh: function (a) { M.stencilMask(a) }, Ah: function (a, b) { M.stencilMaskSeparate(a, b) }, zh: function (a, b, c) { M.stencilOp(a, b, c) }, yh: function (a, b, c, d) { M.stencilOpSeparate(a, b, c, d) }, xh: function (a, b, c, d, e, f, k, l, m) {
          if (2 <= R.version) if (M.Ck) M.texImage2D(a, b, c, d, e, f, k, l, m); else if (m) {
            var q = fe(l); M.texImage2D(a, b, c, d, e,
              f, k, l, q, m >> ge(q))
          } else M.texImage2D(a, b, c, d, e, f, k, l, null); else M.texImage2D(a, b, c, d, e, f, k, l, m ? he(l, k, d, e, m) : null)
        }, wh: function (a, b, c) { M.texParameterf(a, b, c) }, vh: function (a, b, c) { M.texParameterf(a, b, C[c >> 2]) }, uh: function (a, b, c) { M.texParameteri(a, b, c) }, th: function (a, b, c) { M.texParameteri(a, b, v[c >> 2]) }, sh: function (a, b, c, d, e, f, k, l, m) {
          if (2 <= R.version) if (M.Ck) M.texSubImage2D(a, b, c, d, e, f, k, l, m); else if (m) { var q = fe(l); M.texSubImage2D(a, b, c, d, e, f, k, l, q, m >> ge(q)) } else M.texSubImage2D(a, b, c, d, e, f, k, l, null); else q =
            null, m && (q = he(l, k, e, f, m)), M.texSubImage2D(a, b, c, d, e, f, k, l, q)
        }, rh: function (a, b) { M.uniform1f(P[a], b) }, qh: function (a, b, c) { if (2 <= R.version) M.uniform1fv(P[a], C, c >> 2, b); else { if (256 >= b) for (var d = U[b - 1], e = 0; e < b; ++e)d[e] = C[c + 4 * e >> 2]; else d = C.subarray(c >> 2, c + 4 * b >> 2); M.uniform1fv(P[a], d) } }, ph: function (a, b) { M.uniform1i(P[a], b) }, oh: function (a, b, c) { if (2 <= R.version) M.uniform1iv(P[a], v, c >> 2, b); else { if (256 >= b) for (var d = Td[b - 1], e = 0; e < b; ++e)d[e] = v[c + 4 * e >> 2]; else d = v.subarray(c >> 2, c + 4 * b >> 2); M.uniform1iv(P[a], d) } }, nh: function (a,
          b, c) { M.uniform2f(P[a], b, c) }, mh: function (a, b, c) { if (2 <= R.version) M.uniform2fv(P[a], C, c >> 2, 2 * b); else { if (256 >= 2 * b) for (var d = U[2 * b - 1], e = 0; e < 2 * b; e += 2)d[e] = C[c + 4 * e >> 2], d[e + 1] = C[c + (4 * e + 4) >> 2]; else d = C.subarray(c >> 2, c + 8 * b >> 2); M.uniform2fv(P[a], d) } }, lh: function (a, b, c) { M.uniform2i(P[a], b, c) }, kh: function (a, b, c) { if (2 <= R.version) M.uniform2iv(P[a], v, c >> 2, 2 * b); else { if (256 >= 2 * b) for (var d = Td[2 * b - 1], e = 0; e < 2 * b; e += 2)d[e] = v[c + 4 * e >> 2], d[e + 1] = v[c + (4 * e + 4) >> 2]; else d = v.subarray(c >> 2, c + 8 * b >> 2); M.uniform2iv(P[a], d) } }, jh: function (a,
            b, c, d) { M.uniform3f(P[a], b, c, d) }, ih: function (a, b, c) { if (2 <= R.version) M.uniform3fv(P[a], C, c >> 2, 3 * b); else { if (256 >= 3 * b) for (var d = U[3 * b - 1], e = 0; e < 3 * b; e += 3)d[e] = C[c + 4 * e >> 2], d[e + 1] = C[c + (4 * e + 4) >> 2], d[e + 2] = C[c + (4 * e + 8) >> 2]; else d = C.subarray(c >> 2, c + 12 * b >> 2); M.uniform3fv(P[a], d) } }, hh: function (a, b, c, d) { M.uniform3i(P[a], b, c, d) }, gh: function (a, b, c) {
              if (2 <= R.version) M.uniform3iv(P[a], v, c >> 2, 3 * b); else {
                if (256 >= 3 * b) for (var d = Td[3 * b - 1], e = 0; e < 3 * b; e += 3)d[e] = v[c + 4 * e >> 2], d[e + 1] = v[c + (4 * e + 4) >> 2], d[e + 2] = v[c + (4 * e + 8) >> 2]; else d =
                  v.subarray(c >> 2, c + 12 * b >> 2); M.uniform3iv(P[a], d)
              }
            }, fh: function (a, b, c, d, e) { M.uniform4f(P[a], b, c, d, e) }, eh: function (a, b, c) { if (2 <= R.version) M.uniform4fv(P[a], C, c >> 2, 4 * b); else { if (256 >= 4 * b) for (var d = U[4 * b - 1], e = 0; e < 4 * b; e += 4)d[e] = C[c + 4 * e >> 2], d[e + 1] = C[c + (4 * e + 4) >> 2], d[e + 2] = C[c + (4 * e + 8) >> 2], d[e + 3] = C[c + (4 * e + 12) >> 2]; else d = C.subarray(c >> 2, c + 16 * b >> 2); M.uniform4fv(P[a], d) } }, dh: function (a, b, c, d, e) { M.uniform4i(P[a], b, c, d, e) }, ch: function (a, b, c) {
              if (2 <= R.version) M.uniform4iv(P[a], v, c >> 2, 4 * b); else {
                if (256 >= 4 * b) for (var d =
                  Td[4 * b - 1], e = 0; e < 4 * b; e += 4)d[e] = v[c + 4 * e >> 2], d[e + 1] = v[c + (4 * e + 4) >> 2], d[e + 2] = v[c + (4 * e + 8) >> 2], d[e + 3] = v[c + (4 * e + 12) >> 2]; else d = v.subarray(c >> 2, c + 16 * b >> 2); M.uniform4iv(P[a], d)
              }
            }, bh: function (a, b, c, d) { if (2 <= R.version) M.uniformMatrix2fv(P[a], !!c, C, d >> 2, 4 * b); else { if (256 >= 4 * b) for (var e = U[4 * b - 1], f = 0; f < 4 * b; f += 4)e[f] = C[d + 4 * f >> 2], e[f + 1] = C[d + (4 * f + 4) >> 2], e[f + 2] = C[d + (4 * f + 8) >> 2], e[f + 3] = C[d + (4 * f + 12) >> 2]; else e = C.subarray(d >> 2, d + 16 * b >> 2); M.uniformMatrix2fv(P[a], !!c, e) } }, ah: function (a, b, c, d) {
              if (2 <= R.version) M.uniformMatrix3fv(P[a],
                !!c, C, d >> 2, 9 * b); else { if (256 >= 9 * b) for (var e = U[9 * b - 1], f = 0; f < 9 * b; f += 9)e[f] = C[d + 4 * f >> 2], e[f + 1] = C[d + (4 * f + 4) >> 2], e[f + 2] = C[d + (4 * f + 8) >> 2], e[f + 3] = C[d + (4 * f + 12) >> 2], e[f + 4] = C[d + (4 * f + 16) >> 2], e[f + 5] = C[d + (4 * f + 20) >> 2], e[f + 6] = C[d + (4 * f + 24) >> 2], e[f + 7] = C[d + (4 * f + 28) >> 2], e[f + 8] = C[d + (4 * f + 32) >> 2]; else e = C.subarray(d >> 2, d + 36 * b >> 2); M.uniformMatrix3fv(P[a], !!c, e) }
            }, $g: function (a, b, c, d) {
              if (2 <= R.version) M.uniformMatrix4fv(P[a], !!c, C, d >> 2, 16 * b); else {
                if (256 >= 16 * b) for (var e = U[16 * b - 1], f = 0; f < 16 * b; f += 16)e[f] = C[d + 4 * f >> 2], e[f + 1] = C[d +
                  (4 * f + 4) >> 2], e[f + 2] = C[d + (4 * f + 8) >> 2], e[f + 3] = C[d + (4 * f + 12) >> 2], e[f + 4] = C[d + (4 * f + 16) >> 2], e[f + 5] = C[d + (4 * f + 20) >> 2], e[f + 6] = C[d + (4 * f + 24) >> 2], e[f + 7] = C[d + (4 * f + 28) >> 2], e[f + 8] = C[d + (4 * f + 32) >> 2], e[f + 9] = C[d + (4 * f + 36) >> 2], e[f + 10] = C[d + (4 * f + 40) >> 2], e[f + 11] = C[d + (4 * f + 44) >> 2], e[f + 12] = C[d + (4 * f + 48) >> 2], e[f + 13] = C[d + (4 * f + 52) >> 2], e[f + 14] = C[d + (4 * f + 56) >> 2], e[f + 15] = C[d + (4 * f + 60) >> 2]; else e = C.subarray(d >> 2, d + 64 * b >> 2); M.uniformMatrix4fv(P[a], !!c, e)
              }
            }, _g: function (a) { M.useProgram(N[a]) }, Zg: function (a, b) { M.vertexAttrib1f(a, b) }, Yg: function (a,
              b) { M.vertexAttrib2f(a, C[b >> 2], C[b + 4 >> 2]) }, Xg: function (a, b) { M.vertexAttrib3f(a, C[b >> 2], C[b + 4 >> 2], C[b + 8 >> 2]) }, Wg: function (a, b) { M.vertexAttrib4f(a, C[b >> 2], C[b + 4 >> 2], C[b + 8 >> 2], C[b + 12 >> 2]) }, Vg: function (a, b, c, d, e, f) { M.vertexAttribPointer(a, b, c, !!d, e, f) }, Ug: function (a, b, c, d) { M.viewport(a, b, c, d) }, k: He, t: Ie, g: Je, H: Ke, Sg: Le, X: Me, W: Ne, V: Oe, h: Pe, i: Qe, s: Re, u: Se, Rg: Te, Pg: Ue, Qg: Ve, memory: xa, Cg: function () { return 0 }, p: function (a) { a = +a; return 0 <= a ? +jb(a + .5) : +gb(a - .5) }, r: je, Xd: function () { }, N: function () { }, Cd: function () { },
        rd: function () { }, b: function (a) { ua = a | 0 }, Bg: function (a, b, c, d) { return we(a, b, c, d) }, table: ya, c: function (a, b, c) { a |= 0; b |= 0; c |= 0; for (var d = 0, e; (d | 0) < (c | 0);) { e = v[b + (d << 3) >> 2] | 0; if (0 == (e | 0)) break; if ((e | 0) == (a | 0)) return v[b + ((d << 3) + 4) >> 2] | 0; d = d + 1 | 0 } return 0 }
      }, Xe = function () {
        function a(a) { g.asm = a.exports; lb--; g.monitorRunDependencies && g.monitorRunDependencies(lb); 0 == lb && (null !== mb && (clearInterval(mb), mb = null), nb && (a = nb, nb = null, a())) } function b(b) { a(b.instance) } function c(a) {
          return sb().then(function (a) {
            return WebAssembly.instantiate(a,
              d)
          }).then(a, function (a) { u("failed to asynchronously prepare wasm: " + a); p(a) })
        } var d = { env: We, wasi_snapshot_preview1: We }; lb++; g.monitorRunDependencies && g.monitorRunDependencies(lb); if (g.instantiateWasm) try { return g.instantiateWasm(d, a) } catch (e) { return u("Module.instantiateWasm callback failed with error: " + e), !1 } (function () {
          if (va || "function" !== typeof WebAssembly.instantiateStreaming || ob() || "function" !== typeof fetch) return c(b); fetch(pb, { credentials: "same-origin" }).then(function (a) {
            return WebAssembly.instantiateStreaming(a,
              d).then(b, function (a) { u("wasm streaming compile failed: " + a); u("falling back to ArrayBuffer instantiation"); c(b) })
          })
        })(); return {}
      }(); g.asm = Xe;
      var tb = g.___wasm_call_ctors = function () { return (tb = g.___wasm_call_ctors = g.asm.Gh).apply(null, arguments) }, Ba = g._malloc = function () { return (Ba = g._malloc = g.asm.Hh).apply(null, arguments) }, sc = g._free = function () { return (sc = g._free = g.asm.Ih).apply(null, arguments) }, ke = g._realloc = function () { return (ke = g._realloc = g.asm.Jh).apply(null, arguments) }, X = g._setThrew = function () { return (X = g._setThrew = g.asm.Kh).apply(null, arguments) }, Ee = g.__ZSt18uncaught_exceptionv = function () {
        return (Ee = g.__ZSt18uncaught_exceptionv = g.asm.Lh).apply(null,
          arguments)
      }, rc = g.___getTypeName = function () { return (rc = g.___getTypeName = g.asm.Mh).apply(null, arguments) }; g.___embind_register_native_and_builtin_types = function () { return (g.___embind_register_native_and_builtin_types = g.asm.Nh).apply(null, arguments) };
      var Ge = g._emscripten_GetProcAddress = function () { return (Ge = g._emscripten_GetProcAddress = g.asm.Oh).apply(null, arguments) }, Fe = g._memalign = function () { return (Fe = g._memalign = g.asm.Ph).apply(null, arguments) }, Ye = g.dynCall_v = function () { return (Ye = g.dynCall_v = g.asm.Qh).apply(null, arguments) }, Ze = g.dynCall_vi = function () { return (Ze = g.dynCall_vi = g.asm.Rh).apply(null, arguments) }, $e = g.dynCall_vii = function () { return ($e = g.dynCall_vii = g.asm.Sh).apply(null, arguments) }, af = g.dynCall_viii = function () {
        return (af = g.dynCall_viii =
          g.asm.Th).apply(null, arguments)
      }, bf = g.dynCall_viiii = function () { return (bf = g.dynCall_viiii = g.asm.Uh).apply(null, arguments) }, cf = g.dynCall_viiiii = function () { return (cf = g.dynCall_viiiii = g.asm.Vh).apply(null, arguments) }, df = g.dynCall_viiiiii = function () { return (df = g.dynCall_viiiiii = g.asm.Wh).apply(null, arguments) }, ef = g.dynCall_viiiiiiiii = function () { return (ef = g.dynCall_viiiiiiiii = g.asm.Xh).apply(null, arguments) }, ff = g.dynCall_ii = function () { return (ff = g.dynCall_ii = g.asm.Yh).apply(null, arguments) }, gf = g.dynCall_iii =
        function () { return (gf = g.dynCall_iii = g.asm.Zh).apply(null, arguments) }, hf = g.dynCall_iiii = function () { return (hf = g.dynCall_iiii = g.asm._h).apply(null, arguments) }, jf = g.dynCall_iiiii = function () { return (jf = g.dynCall_iiiii = g.asm.$h).apply(null, arguments) }, kf = g.dynCall_iiiiii = function () { return (kf = g.dynCall_iiiiii = g.asm.ai).apply(null, arguments) }, lf = g.dynCall_iiiiiii = function () { return (lf = g.dynCall_iiiiiii = g.asm.bi).apply(null, arguments) }, mf = g.dynCall_iiiiiiiiii = function () {
          return (mf = g.dynCall_iiiiiiiiii = g.asm.ci).apply(null,
            arguments)
        }, Y = g.stackSave = function () { return (Y = g.stackSave = g.asm.di).apply(null, arguments) }; g.stackAlloc = function () { return (g.stackAlloc = g.asm.ei).apply(null, arguments) }; var Z = g.stackRestore = function () { return (Z = g.stackRestore = g.asm.fi).apply(null, arguments) }; g.dynCall_i = function () { return (g.dynCall_i = g.asm.gi).apply(null, arguments) }; g.dynCall_vif = function () { return (g.dynCall_vif = g.asm.hi).apply(null, arguments) }; g.dynCall_viffi = function () { return (g.dynCall_viffi = g.asm.ii).apply(null, arguments) };
      g.dynCall_viifi = function () { return (g.dynCall_viifi = g.asm.ji).apply(null, arguments) }; g.dynCall_viiif = function () { return (g.dynCall_viiif = g.asm.ki).apply(null, arguments) }; g.dynCall_viiiiiiii = function () { return (g.dynCall_viiiiiiii = g.asm.li).apply(null, arguments) }; g.dynCall_viifiiiii = function () { return (g.dynCall_viifiiiii = g.asm.mi).apply(null, arguments) }; g.dynCall_viifiiiiii = function () { return (g.dynCall_viifiiiiii = g.asm.ni).apply(null, arguments) };
      g.dynCall_viififiiiii = function () { return (g.dynCall_viififiiiii = g.asm.oi).apply(null, arguments) }; g.dynCall_viififiiiiii = function () { return (g.dynCall_viififiiiiii = g.asm.pi).apply(null, arguments) }; g.dynCall_viiffii = function () { return (g.dynCall_viiffii = g.asm.qi).apply(null, arguments) }; g.dynCall_vifffi = function () { return (g.dynCall_vifffi = g.asm.ri).apply(null, arguments) }; g.dynCall_viiff = function () { return (g.dynCall_viiff = g.asm.si).apply(null, arguments) };
      g.dynCall_viiffi = function () { return (g.dynCall_viiffi = g.asm.ti).apply(null, arguments) }; g.dynCall_viffffi = function () { return (g.dynCall_viffffi = g.asm.ui).apply(null, arguments) }; g.dynCall_viiiifiii = function () { return (g.dynCall_viiiifiii = g.asm.vi).apply(null, arguments) }; g.dynCall_viiiffii = function () { return (g.dynCall_viiiffii = g.asm.wi).apply(null, arguments) }; g.dynCall_vifff = function () { return (g.dynCall_vifff = g.asm.xi).apply(null, arguments) };
      g.dynCall_viff = function () { return (g.dynCall_viff = g.asm.yi).apply(null, arguments) }; g.dynCall_iifii = function () { return (g.dynCall_iifii = g.asm.zi).apply(null, arguments) }; g.dynCall_vifii = function () { return (g.dynCall_vifii = g.asm.Ai).apply(null, arguments) }; g.dynCall_viif = function () { return (g.dynCall_viif = g.asm.Bi).apply(null, arguments) }; g.dynCall_fi = function () { return (g.dynCall_fi = g.asm.Ci).apply(null, arguments) }; g.dynCall_fii = function () { return (g.dynCall_fii = g.asm.Di).apply(null, arguments) };
      g.dynCall_iiffii = function () { return (g.dynCall_iiffii = g.asm.Ei).apply(null, arguments) }; g.dynCall_viffii = function () { return (g.dynCall_viffii = g.asm.Fi).apply(null, arguments) }; g.dynCall_iiifi = function () { return (g.dynCall_iiifi = g.asm.Gi).apply(null, arguments) }; g.dynCall_viffff = function () { return (g.dynCall_viffff = g.asm.Hi).apply(null, arguments) }; g.dynCall_iif = function () { return (g.dynCall_iif = g.asm.Ii).apply(null, arguments) }; g.dynCall_iiffi = function () { return (g.dynCall_iiffi = g.asm.Ji).apply(null, arguments) };
      g.dynCall_viifffffffffi = function () { return (g.dynCall_viifffffffffi = g.asm.Ki).apply(null, arguments) }; g.dynCall_viffffii = function () { return (g.dynCall_viffffii = g.asm.Li).apply(null, arguments) }; g.dynCall_vifffff = function () { return (g.dynCall_vifffff = g.asm.Mi).apply(null, arguments) }; g.dynCall_vifffiiff = function () { return (g.dynCall_vifffiiff = g.asm.Ni).apply(null, arguments) }; g.dynCall_iiff = function () { return (g.dynCall_iiff = g.asm.Oi).apply(null, arguments) };
      g.dynCall_viffffff = function () { return (g.dynCall_viffffff = g.asm.Pi).apply(null, arguments) }; g.dynCall_vifffffffff = function () { return (g.dynCall_vifffffffff = g.asm.Qi).apply(null, arguments) }; g.dynCall_iifff = function () { return (g.dynCall_iifff = g.asm.Ri).apply(null, arguments) }; g.dynCall_iifiii = function () { return (g.dynCall_iifiii = g.asm.Si).apply(null, arguments) }; g.dynCall_vifiii = function () { return (g.dynCall_vifiii = g.asm.Ti).apply(null, arguments) };
      g.dynCall_iiiif = function () { return (g.dynCall_iiiif = g.asm.Ui).apply(null, arguments) }; g.dynCall_iiiiiiiii = function () { return (g.dynCall_iiiiiiiii = g.asm.Vi).apply(null, arguments) }; g.dynCall_iiifiiiii = function () { return (g.dynCall_iiifiiiii = g.asm.Wi).apply(null, arguments) }; g.dynCall_iiifiiiiii = function () { return (g.dynCall_iiifiiiiii = g.asm.Xi).apply(null, arguments) }; g.dynCall_iiififiiiii = function () { return (g.dynCall_iiififiiiii = g.asm.Yi).apply(null, arguments) };
      g.dynCall_iiififiiiiii = function () { return (g.dynCall_iiififiiiiii = g.asm.Zi).apply(null, arguments) }; g.dynCall_viifffi = function () { return (g.dynCall_viifffi = g.asm._i).apply(null, arguments) }; g.dynCall_viiiff = function () { return (g.dynCall_viiiff = g.asm.$i).apply(null, arguments) }; g.dynCall_viiiffi = function () { return (g.dynCall_viiiffi = g.asm.aj).apply(null, arguments) }; g.dynCall_viiiiiii = function () { return (g.dynCall_viiiiiii = g.asm.bj).apply(null, arguments) };
      g.dynCall_viiffffi = function () { return (g.dynCall_viiffffi = g.asm.cj).apply(null, arguments) }; g.dynCall_viiiiifiii = function () { return (g.dynCall_viiiiifiii = g.asm.dj).apply(null, arguments) }; g.dynCall_viiiiffii = function () { return (g.dynCall_viiiiffii = g.asm.ej).apply(null, arguments) }; g.dynCall_iiiiiiii = function () { return (g.dynCall_iiiiiiii = g.asm.fj).apply(null, arguments) }; g.dynCall_viifff = function () { return (g.dynCall_viifff = g.asm.gj).apply(null, arguments) };
      g.dynCall_iiif = function () { return (g.dynCall_iiif = g.asm.hj).apply(null, arguments) }; g.dynCall_iiiffi = function () { return (g.dynCall_iiiffi = g.asm.ij).apply(null, arguments) }; g.dynCall_iiifff = function () { return (g.dynCall_iiifff = g.asm.jj).apply(null, arguments) }; g.dynCall_fiii = function () { return (g.dynCall_fiii = g.asm.kj).apply(null, arguments) }; g.dynCall_viiffff = function () { return (g.dynCall_viiffff = g.asm.lj).apply(null, arguments) };
      g.dynCall_viiifffffffffi = function () { return (g.dynCall_viiifffffffffi = g.asm.mj).apply(null, arguments) }; g.dynCall_viiffffii = function () { return (g.dynCall_viiffffii = g.asm.nj).apply(null, arguments) }; g.dynCall_viifffff = function () { return (g.dynCall_viifffff = g.asm.oj).apply(null, arguments) }; g.dynCall_viifffiiff = function () { return (g.dynCall_viifffiiff = g.asm.pj).apply(null, arguments) }; g.dynCall_iiiff = function () { return (g.dynCall_iiiff = g.asm.qj).apply(null, arguments) };
      g.dynCall_viiffffff = function () { return (g.dynCall_viiffffff = g.asm.rj).apply(null, arguments) }; g.dynCall_viifffffffff = function () { return (g.dynCall_viifffffffff = g.asm.sj).apply(null, arguments) }; g.dynCall_fiiiiii = function () { return (g.dynCall_fiiiiii = g.asm.tj).apply(null, arguments) }; g.dynCall_viiiiiff = function () { return (g.dynCall_viiiiiff = g.asm.uj).apply(null, arguments) }; g.dynCall_viiiiifiiiiii = function () { return (g.dynCall_viiiiifiiiiii = g.asm.vj).apply(null, arguments) };
      g.dynCall_iiifii = function () { return (g.dynCall_iiifii = g.asm.wj).apply(null, arguments) }; g.dynCall_ji = function () { return (g.dynCall_ji = g.asm.xj).apply(null, arguments) }; g.dynCall_iiji = function () { return (g.dynCall_iiji = g.asm.yj).apply(null, arguments) }; g.dynCall_iijjiii = function () { return (g.dynCall_iijjiii = g.asm.zj).apply(null, arguments) }; g.dynCall_iij = function () { return (g.dynCall_iij = g.asm.Aj).apply(null, arguments) }; g.dynCall_vijjjii = function () { return (g.dynCall_vijjjii = g.asm.Bj).apply(null, arguments) };
      g.dynCall_viiiiifi = function () { return (g.dynCall_viiiiifi = g.asm.Cj).apply(null, arguments) }; g.dynCall_viiiiiiifi = function () { return (g.dynCall_viiiiiiifi = g.asm.Dj).apply(null, arguments) }; g.dynCall_viiiiiiiiifi = function () { return (g.dynCall_viiiiiiiiifi = g.asm.Ej).apply(null, arguments) }; g.dynCall_viiiiiiiiiifi = function () { return (g.dynCall_viiiiiiiiiifi = g.asm.Fj).apply(null, arguments) }; g.dynCall_iiiiiiiiiiiiiii = function () { return (g.dynCall_iiiiiiiiiiiiiii = g.asm.Gj).apply(null, arguments) };
      g.dynCall_iidi = function () { return (g.dynCall_iidi = g.asm.Hj).apply(null, arguments) }; g.dynCall_viiiiiiiiiiiiiii = function () { return (g.dynCall_viiiiiiiiiiiiiii = g.asm.Ij).apply(null, arguments) }; g.dynCall_viji = function () { return (g.dynCall_viji = g.asm.Jj).apply(null, arguments) }; g.dynCall_vijiii = function () { return (g.dynCall_vijiii = g.asm.Kj).apply(null, arguments) }; g.dynCall_viiiiij = function () { return (g.dynCall_viiiiij = g.asm.Lj).apply(null, arguments) };
      g.dynCall_fiff = function () { return (g.dynCall_fiff = g.asm.Mj).apply(null, arguments) }; g.dynCall_viiiiiffii = function () { return (g.dynCall_viiiiiffii = g.asm.Nj).apply(null, arguments) }; g.dynCall_viiiiffi = function () { return (g.dynCall_viiiiffi = g.asm.Oj).apply(null, arguments) }; g.dynCall_di = function () { return (g.dynCall_di = g.asm.Pj).apply(null, arguments) }; g.dynCall_viijii = function () { return (g.dynCall_viijii = g.asm.Qj).apply(null, arguments) }; g.dynCall_jii = function () { return (g.dynCall_jii = g.asm.Rj).apply(null, arguments) };
      g.dynCall_vijii = function () { return (g.dynCall_vijii = g.asm.Sj).apply(null, arguments) }; g.dynCall_vij = function () { return (g.dynCall_vij = g.asm.Tj).apply(null, arguments) }; g.dynCall_viiiiff = function () { return (g.dynCall_viiiiff = g.asm.Uj).apply(null, arguments) }; g.dynCall_vffff = function () { return (g.dynCall_vffff = g.asm.Vj).apply(null, arguments) }; g.dynCall_vf = function () { return (g.dynCall_vf = g.asm.Wj).apply(null, arguments) }; g.dynCall_viiiiiiiiii = function () { return (g.dynCall_viiiiiiiiii = g.asm.Xj).apply(null, arguments) };
      g.dynCall_viiiiiiiiiii = function () { return (g.dynCall_viiiiiiiiiii = g.asm.Yj).apply(null, arguments) }; g.dynCall_iiiij = function () { return (g.dynCall_iiiij = g.asm.Zj).apply(null, arguments) }; g.dynCall_viiij = function () { return (g.dynCall_viiij = g.asm._j).apply(null, arguments) }; g.dynCall_iijj = function () { return (g.dynCall_iijj = g.asm.$j).apply(null, arguments) }; g.dynCall_iiiiiiiiiii = function () { return (g.dynCall_iiiiiiiiiii = g.asm.ak).apply(null, arguments) };
      g.dynCall_iiiiiiiiiiii = function () { return (g.dynCall_iiiiiiiiiiii = g.asm.bk).apply(null, arguments) }; g.dynCall_jiiii = function () { return (g.dynCall_jiiii = g.asm.ck).apply(null, arguments) }; g.dynCall_diiii = function () { return (g.dynCall_diiii = g.asm.dk).apply(null, arguments) }; g.dynCall_diiiiiiii = function () { return (g.dynCall_diiiiiiii = g.asm.ek).apply(null, arguments) }; g.dynCall_dii = function () { return (g.dynCall_dii = g.asm.fk).apply(null, arguments) };
      g.dynCall_diii = function () { return (g.dynCall_diii = g.asm.gk).apply(null, arguments) }; g.dynCall_jiii = function () { return (g.dynCall_jiii = g.asm.hk).apply(null, arguments) }; g.dynCall_jiji = function () { return (g.dynCall_jiji = g.asm.ik).apply(null, arguments) }; g.dynCall_iidiiii = function () { return (g.dynCall_iidiiii = g.asm.jk).apply(null, arguments) }; g.dynCall_iiiiij = function () { return (g.dynCall_iiiiij = g.asm.kk).apply(null, arguments) }; g.dynCall_iiiiid = function () { return (g.dynCall_iiiiid = g.asm.lk).apply(null, arguments) };
      g.dynCall_iiiiijj = function () { return (g.dynCall_iiiiijj = g.asm.mk).apply(null, arguments) }; g.dynCall_iiiiiijj = function () { return (g.dynCall_iiiiiijj = g.asm.nk).apply(null, arguments) }; g.dynCall_vff = function () { return (g.dynCall_vff = g.asm.ok).apply(null, arguments) }; g.dynCall_vfi = function () { return (g.dynCall_vfi = g.asm.pk).apply(null, arguments) }; function He(a, b) { var c = Y(); try { return ff(a, b) } catch (d) { Z(c); if (d !== d + 0 && "longjmp" !== d) throw d; X(1, 0) } }
      function Ie(a, b, c) { var d = Y(); try { return gf(a, b, c) } catch (e) { Z(d); if (e !== e + 0 && "longjmp" !== e) throw e; X(1, 0) } } function Qe(a, b, c) { var d = Y(); try { $e(a, b, c) } catch (e) { Z(d); if (e !== e + 0 && "longjmp" !== e) throw e; X(1, 0) } } function Je(a, b, c, d) { var e = Y(); try { return hf(a, b, c, d) } catch (f) { Z(e); if (f !== f + 0 && "longjmp" !== f) throw f; X(1, 0) } } function Pe(a, b) { var c = Y(); try { Ze(a, b) } catch (d) { Z(c); if (d !== d + 0 && "longjmp" !== d) throw d; X(1, 0) } }
      function Re(a, b, c, d) { var e = Y(); try { af(a, b, c, d) } catch (f) { Z(e); if (f !== f + 0 && "longjmp" !== f) throw f; X(1, 0) } } function Le(a, b, c, d, e, f) { var k = Y(); try { return kf(a, b, c, d, e, f) } catch (l) { Z(k); if (l !== l + 0 && "longjmp" !== l) throw l; X(1, 0) } } function Se(a, b, c, d, e) { var f = Y(); try { bf(a, b, c, d, e) } catch (k) { Z(f); if (k !== k + 0 && "longjmp" !== k) throw k; X(1, 0) } } function Me(a, b, c, d, e, f, k) { var l = Y(); try { return lf(a, b, c, d, e, f, k) } catch (m) { Z(l); if (m !== m + 0 && "longjmp" !== m) throw m; X(1, 0) } }
      function Ke(a, b, c, d, e) { var f = Y(); try { return jf(a, b, c, d, e) } catch (k) { Z(f); if (k !== k + 0 && "longjmp" !== k) throw k; X(1, 0) } } function Te(a, b, c, d, e, f) { var k = Y(); try { cf(a, b, c, d, e, f) } catch (l) { Z(k); if (l !== l + 0 && "longjmp" !== l) throw l; X(1, 0) } } function Ve(a, b, c, d, e, f, k, l, m, q) { var r = Y(); try { ef(a, b, c, d, e, f, k, l, m, q) } catch (w) { Z(r); if (w !== w + 0 && "longjmp" !== w) throw w; X(1, 0) } } function Ue(a, b, c, d, e, f, k) { var l = Y(); try { df(a, b, c, d, e, f, k) } catch (m) { Z(l); if (m !== m + 0 && "longjmp" !== m) throw m; X(1, 0) } }
      function Ne(a, b, c, d, e, f, k, l, m, q) { var r = Y(); try { return mf(a, b, c, d, e, f, k, l, m, q) } catch (w) { Z(r); if (w !== w + 0 && "longjmp" !== w) throw w; X(1, 0) } } function Oe(a) { var b = Y(); try { Ye(a) } catch (c) { Z(b); if (c !== c + 0 && "longjmp" !== c) throw c; X(1, 0) } } g.asm = Xe; var nf; g.then = function (a) { if (nf) a(g); else { var b = g.onRuntimeInitialized; g.onRuntimeInitialized = function () { b && b(); a(g) } } return g }; function qa(a) { this.name = "ExitStatus"; this.message = "Program terminated with exit(" + a + ")"; this.status = a } nb = function of() { nf || pf(); nf || (nb = of) };
      function pf() { function a() { if (!nf && (nf = !0, !za)) { db = !0; Za(ab); Za(bb); if (g.onRuntimeInitialized) g.onRuntimeInitialized(); if (g.postRun) for ("function" == typeof g.postRun && (g.postRun = [g.postRun]); g.postRun.length;)cb.unshift(g.postRun.shift()); Za(cb) } } if (!(0 < lb)) { if (g.preRun) for ("function" == typeof g.preRun && (g.preRun = [g.preRun]); g.preRun.length;)eb(); Za($a); 0 < lb || (g.setStatus ? (g.setStatus("Running..."), setTimeout(function () { setTimeout(function () { g.setStatus("") }, 1); a() }, 1)) : a()) } } g.run = pf;
      if (g.preInit) for ("function" == typeof g.preInit && (g.preInit = [g.preInit]); 0 < g.preInit.length;)g.preInit.pop()(); wa = !0; pf(); g.ready = function () { return new Promise(function (a, b) { g.onAbort = b; db ? a(g) : cb.unshift(function () { a(g) }) }) }; delete g.then;


      return CanvasKitInit
    }
  );
})();
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = CanvasKitInit;
else if (typeof define === 'function' && define['amd'])
  define([], function () { return CanvasKitInit; });
else if (typeof exports === 'object')
  exports["CanvasKitInit"] = CanvasKitInit;

(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if(!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    if(!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());

function extendPrototype(sources,destination){
    var i, len = sources.length, sourcePrototype;
    for (i = 0;i < len;i += 1) {
        sourcePrototype = sources[i].prototype;
        for (var attr in sourcePrototype) {
            if (sourcePrototype.hasOwnProperty(attr)) destination.prototype[attr] = sourcePrototype[attr];
        }
    }
}

function getDescriptor(object, prop) {
    return Object.getOwnPropertyDescriptor(object, prop);
}

function createProxyFunction(prototype) {
	function ProxyFunction(){}
	ProxyFunction.prototype = prototype;
	return ProxyFunction;
}
function bezFunction(){

    var easingFunctions = [];
    var math = Math;

    function pointOnLine2D(x1,y1, x2,y2, x3,y3){
        var det1 = (x1*y2) + (y1*x3) + (x2*y3) - (x3*y2) - (y3*x1) - (x2*y1);
        return det1 > -0.001 && det1 < 0.001;
    }

    function pointOnLine3D(x1,y1,z1, x2,y2,z2, x3,y3,z3){
        if(z1 === 0 && z2 === 0 && z3 === 0) {
            return pointOnLine2D(x1,y1, x2,y2, x3,y3);
        }
        var dist1 = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
        var dist2 = Math.sqrt(Math.pow(x3 - x1, 2) + Math.pow(y3 - y1, 2) + Math.pow(z3 - z1, 2));
        var dist3 = Math.sqrt(Math.pow(x3 - x2, 2) + Math.pow(y3 - y2, 2) + Math.pow(z3 - z2, 2));
        var diffDist;
        if(dist1 > dist2){
            if(dist1 > dist3){
                diffDist = dist1 - dist2 - dist3;
            } else {
                diffDist = dist3 - dist2 - dist1;
            }
        } else if(dist3 > dist2){
            diffDist = dist3 - dist2 - dist1;
        } else {
            diffDist = dist2 - dist1 - dist3;
        }
        return diffDist > -0.0001 && diffDist < 0.0001;
    }

    var getBezierLength = (function(){

        return function(pt1,pt2,pt3,pt4){
            var curveSegments = defaultCurveSegments;
            var k;
            var i, len;
            var ptCoord,perc,addedLength = 0;
            var ptDistance;
            var point = [],lastPoint = [];
            var lengthData = bezier_length_pool.newElement();
            len = pt3.length;
            for(k=0;k<curveSegments;k+=1){
                perc = k/(curveSegments-1);
                ptDistance = 0;
                for(i=0;i<len;i+=1){
                    ptCoord = bm_pow(1-perc,3)*pt1[i]+3*bm_pow(1-perc,2)*perc*pt3[i]+3*(1-perc)*bm_pow(perc,2)*pt4[i]+bm_pow(perc,3)*pt2[i];
                    point[i] = ptCoord;
                    if(lastPoint[i] !== null){
                        ptDistance += bm_pow(point[i] - lastPoint[i],2);
                    }
                    lastPoint[i] = point[i];
                }
                if(ptDistance){
                    ptDistance = bm_sqrt(ptDistance);
                    addedLength += ptDistance;
                }
                lengthData.percents[k] = perc;
                lengthData.lengths[k] = addedLength;
            }
            lengthData.addedLength = addedLength;
            return lengthData;
        };
    }());

    function getSegmentsLength(shapeData) {
        var segmentsLength = segments_length_pool.newElement();
        var closed = shapeData.c;
        var pathV = shapeData.v;
        var pathO = shapeData.o;
        var pathI = shapeData.i;
        var i, len = shapeData._length;
        var lengths = segmentsLength.lengths;
        var totalLength = 0;
        for(i=0;i<len-1;i+=1){
            lengths[i] = getBezierLength(pathV[i],pathV[i+1],pathO[i],pathI[i+1]);
            totalLength += lengths[i].addedLength;
        }
        if(closed && len){
            lengths[i] = getBezierLength(pathV[i],pathV[0],pathO[i],pathI[0]);
            totalLength += lengths[i].addedLength;
        }
        segmentsLength.totalLength = totalLength;
        return segmentsLength;
    }

    function BezierData(length){
        this.segmentLength = 0;
        this.points = new Array(length);
    }

    function PointData(partial,point){
        this.partialLength = partial;
        this.point = point;
    }

    var buildBezierData = (function(){

        var storedData = {};

        return function (pt1, pt2, pt3, pt4){
            var bezierName = (pt1[0]+'_'+pt1[1]+'_'+pt2[0]+'_'+pt2[1]+'_'+pt3[0]+'_'+pt3[1]+'_'+pt4[0]+'_'+pt4[1]).replace(/\./g, 'p');
            if(!storedData[bezierName]){
                var curveSegments = defaultCurveSegments;
                var k, i, len;
                var ptCoord,perc,addedLength = 0;
                var ptDistance;
                var point,lastPoint = null;
                if (pt1.length === 2 && (pt1[0] != pt2[0] || pt1[1] != pt2[1]) && pointOnLine2D(pt1[0],pt1[1],pt2[0],pt2[1],pt1[0]+pt3[0],pt1[1]+pt3[1]) && pointOnLine2D(pt1[0],pt1[1],pt2[0],pt2[1],pt2[0]+pt4[0],pt2[1]+pt4[1])){
                    curveSegments = 2;
                }
                var bezierData = new BezierData(curveSegments);
                len = pt3.length;
                for (k = 0; k < curveSegments; k += 1) {
                    point = createSizedArray(len);
                    perc = k / (curveSegments - 1);
                    ptDistance = 0;
                    for (i = 0; i < len; i += 1){
                        ptCoord = bm_pow(1-perc,3)*pt1[i]+3*bm_pow(1-perc,2)*perc*(pt1[i] + pt3[i])+3*(1-perc)*bm_pow(perc,2)*(pt2[i] + pt4[i])+bm_pow(perc,3)*pt2[i];
                        point[i] = ptCoord;
                        if(lastPoint !== null){
                            ptDistance += bm_pow(point[i] - lastPoint[i],2);
                        }
                    }
                    ptDistance = bm_sqrt(ptDistance);
                    addedLength += ptDistance;
                    bezierData.points[k] = new PointData(ptDistance, point);
                    lastPoint = point;
                }
                bezierData.segmentLength = addedLength;
                storedData[bezierName] = bezierData;
            }
            return storedData[bezierName];
        };
    }());

    function getDistancePerc(perc,bezierData){
        var percents = bezierData.percents;
        var lengths = bezierData.lengths;
        var len = percents.length;
        var initPos = bm_floor((len-1)*perc);
        var lengthPos = perc*bezierData.addedLength;
        var lPerc = 0;
        if(initPos === len - 1 || initPos === 0 || lengthPos === lengths[initPos]){
            return percents[initPos];
        }else{
            var dir = lengths[initPos] > lengthPos ? -1 : 1;
            var flag = true;
            while(flag){
                if(lengths[initPos] <= lengthPos && lengths[initPos+1] > lengthPos){
                    lPerc = (lengthPos - lengths[initPos]) / (lengths[initPos+1] - lengths[initPos]);
                    flag = false;
                }else{
                    initPos += dir;
                }
                if(initPos < 0 || initPos >= len - 1){
                    //FIX for TypedArrays that don't store floating point values with enough accuracy
                    if(initPos === len - 1) {
                        return percents[initPos];
                    }
                    flag = false;
                }
            }
            return percents[initPos] + (percents[initPos+1] - percents[initPos])*lPerc;
        }
    }

    function getPointInSegment(pt1, pt2, pt3, pt4, percent, bezierData) {
        var t1 = getDistancePerc(percent,bezierData);
        var u0 = 1;
        var u1 = 1 - t1;
        var ptX = Math.round((u1*u1*u1* pt1[0] + (t1*u1*u1 + u1*t1*u1 + u1*u1*t1)* pt3[0] + (t1*t1*u1 + u1*t1*t1 + t1*u1*t1)*pt4[0] + t1*t1*t1* pt2[0])* 1000) / 1000;
        var ptY = Math.round((u1*u1*u1* pt1[1] + (t1*u1*u1 + u1*t1*u1 + u1*u1*t1)* pt3[1] + (t1*t1*u1 + u1*t1*t1 + t1*u1*t1)*pt4[1] + t1*t1*t1* pt2[1])* 1000) / 1000;
        return [ptX, ptY];
    }

    function getSegmentArray() {

    }

    var bezier_segment_points = createTypedArray('float32', 8);

    function getNewSegment(pt1,pt2,pt3,pt4,startPerc,endPerc, bezierData){

        startPerc = startPerc < 0 ? 0 : startPerc > 1 ? 1 : startPerc;
        var t0 = getDistancePerc(startPerc,bezierData);
        endPerc = endPerc > 1 ? 1 : endPerc;
        var t1 = getDistancePerc(endPerc,bezierData);
        var i, len = pt1.length;
        var u0 = 1 - t0;
        var u1 = 1 - t1;
        var u0u0u0 = u0*u0*u0;
        var t0u0u0_3 = t0*u0*u0*3;
        var t0t0u0_3 = t0*t0*u0*3;
        var t0t0t0 = t0*t0*t0;
        //
        var u0u0u1 = u0*u0*u1;
        var t0u0u1_3 = t0*u0*u1 + u0*t0*u1 + u0*u0*t1;
        var t0t0u1_3 = t0*t0*u1 + u0*t0*t1 + t0*u0*t1;
        var t0t0t1 = t0*t0*t1;
        //
        var u0u1u1 = u0*u1*u1;
        var t0u1u1_3 = t0*u1*u1 + u0*t1*u1 + u0*u1*t1;
        var t0t1u1_3 = t0*t1*u1 + u0*t1*t1 + t0*u1*t1;
        var t0t1t1 = t0*t1*t1;
        //
        var u1u1u1 = u1*u1*u1;
        var t1u1u1_3 = t1*u1*u1 + u1*t1*u1 + u1*u1*t1;
        var t1t1u1_3 = t1*t1*u1 + u1*t1*t1 + t1*u1*t1;
        var t1t1t1 = t1*t1*t1;
        for(i=0;i<len;i+=1){
            bezier_segment_points[i * 4] = Math.round((u0u0u0 * pt1[i] + t0u0u0_3 * pt3[i] + t0t0u0_3 * pt4[i] + t0t0t0 * pt2[i]) * 1000) / 1000;
            bezier_segment_points[i * 4 + 1] = Math.round((u0u0u1 * pt1[i] + t0u0u1_3 * pt3[i] + t0t0u1_3 * pt4[i] + t0t0t1 * pt2[i]) * 1000) / 1000;
            bezier_segment_points[i * 4 + 2] = Math.round((u0u1u1 * pt1[i] + t0u1u1_3 * pt3[i] + t0t1u1_3 * pt4[i] + t0t1t1 * pt2[i]) * 1000) / 1000;
            bezier_segment_points[i * 4 + 3] = Math.round((u1u1u1 * pt1[i] + t1u1u1_3 * pt3[i] + t1t1u1_3 * pt4[i] + t1t1t1 * pt2[i]) * 1000) / 1000;
        }

        return bezier_segment_points;
    }

    return {
        getSegmentsLength : getSegmentsLength,
        getNewSegment : getNewSegment,
        getPointInSegment : getPointInSegment,
        buildBezierData : buildBezierData,
        pointOnLine2D : pointOnLine2D,
        pointOnLine3D : pointOnLine3D
    };
}

var bez = bezFunction();
function dataFunctionManager(){

    //var tCanvasHelper = createTag('canvas').getContext('2d');

    function completeLayers(layers, comps, fontManager){
        var layerData;
        var animArray, lastFrame;
        var i, len = layers.length;
        var j, jLen, k, kLen;
        for(i=0;i<len;i+=1){
            layerData = layers[i];
            if(!('ks' in layerData) || layerData.completed){
                continue;
            }
            layerData.completed = true;
            if(layerData.tt){
                layers[i-1].td = layerData.tt;
            }
            animArray = [];
            lastFrame = -1;
            if(layerData.hasMask){
                var maskProps = layerData.masksProperties;
                jLen = maskProps.length;
                for(j=0;j<jLen;j+=1){
                    if(maskProps[j].pt.k.i){
                        convertPathsToAbsoluteValues(maskProps[j].pt.k);
                    }else{
                        kLen = maskProps[j].pt.k.length;
                        for(k=0;k<kLen;k+=1){
                            if(maskProps[j].pt.k[k].s){
                                convertPathsToAbsoluteValues(maskProps[j].pt.k[k].s[0]);
                            }
                            if(maskProps[j].pt.k[k].e){
                                convertPathsToAbsoluteValues(maskProps[j].pt.k[k].e[0]);
                            }
                        }
                    }
                }
            }
            if(layerData.ty===0){
                layerData.layers = findCompLayers(layerData.refId, comps);
                completeLayers(layerData.layers,comps, fontManager);
            }else if(layerData.ty === 4){
                completeShapes(layerData.shapes);
            }else if(layerData.ty == 5){
                completeText(layerData, fontManager);
            }
        }
    }

    function findCompLayers(id,comps){
        var i = 0, len = comps.length;
        while(i<len){
            if(comps[i].id === id){
                if(!comps[i].layers.__used) {
                    comps[i].layers.__used = true;
                    return comps[i].layers;
                }
                return JSON.parse(JSON.stringify(comps[i].layers));
            }
            i += 1;
        }
    }

    function completeShapes(arr){
        var i, len = arr.length;
        var j, jLen;
        var hasPaths = false;
        for(i=len-1;i>=0;i-=1){
            if(arr[i].ty == 'sh'){
                if(arr[i].ks.k.i){
                    convertPathsToAbsoluteValues(arr[i].ks.k);
                }else{
                    jLen = arr[i].ks.k.length;
                    for(j=0;j<jLen;j+=1){
                        if(arr[i].ks.k[j].s){
                            convertPathsToAbsoluteValues(arr[i].ks.k[j].s[0]);
                        }
                        if(arr[i].ks.k[j].e){
                            convertPathsToAbsoluteValues(arr[i].ks.k[j].e[0]);
                        }
                    }
                }
                hasPaths = true;
            }else if(arr[i].ty == 'gr'){
                completeShapes(arr[i].it);
            }
        }
        /*if(hasPaths){
            //mx: distance
            //ss: sensitivity
            //dc: decay
            arr.splice(arr.length-1,0,{
                "ty": "ms",
                "mx":20,
                "ss":10,
                 "dc":0.001,
                "maxDist":200
            });
        }*/
    }

    function convertPathsToAbsoluteValues(path){
        var i, len = path.i.length;
        for(i=0;i<len;i+=1){
            path.i[i][0] += path.v[i][0];
            path.i[i][1] += path.v[i][1];
            path.o[i][0] += path.v[i][0];
            path.o[i][1] += path.v[i][1];
        }
    }

    function checkVersion(minimum,animVersionString){
        var animVersion = animVersionString ? animVersionString.split('.') : [100,100,100];
        if(minimum[0]>animVersion[0]){
            return true;
        } else if(animVersion[0] > minimum[0]){
            return false;
        }
        if(minimum[1]>animVersion[1]){
            return true;
        } else if(animVersion[1] > minimum[1]){
            return false;
        }
        if(minimum[2]>animVersion[2]){
            return true;
        } else if(animVersion[2] > minimum[2]){
            return false;
        }
    }

    var checkText = (function(){
        var minimumVersion = [4,4,14];

        function updateTextLayer(textLayer){
            var documentData = textLayer.t.d;
            textLayer.t.d = {
                k: [
                    {
                        s:documentData,
                        t:0
                    }
                ]
            };
        }

        function iterateLayers(layers){
            var i, len = layers.length;
            for(i=0;i<len;i+=1){
                if(layers[i].ty === 5){
                    updateTextLayer(layers[i]);
                }
            }
        }

        return function (animationData){
            if(checkVersion(minimumVersion,animationData.v)){
                iterateLayers(animationData.layers);
                if(animationData.assets){
                    var i, len = animationData.assets.length;
                    for(i=0;i<len;i+=1){
                        if(animationData.assets[i].layers){
                            iterateLayers(animationData.assets[i].layers);

                        }
                    }
                }
            }
        };
    }());

    var checkChars = (function() {
        var minimumVersion = [4,7,99];
        return function (animationData){
            if(animationData.chars && !checkVersion(minimumVersion,animationData.v)){
                var i, len = animationData.chars.length, j, jLen, k, kLen;
                var pathData, paths;
                for(i = 0; i < len; i += 1) {
                    if(animationData.chars[i].data && animationData.chars[i].data.shapes) {
                        paths = animationData.chars[i].data.shapes[0].it;
                        jLen = paths.length;

                        for(j = 0; j < jLen; j += 1) {
                            pathData = paths[j].ks.k;
                            if(!pathData.__converted) {
                                convertPathsToAbsoluteValues(paths[j].ks.k);
                                pathData.__converted = true;
                            }
                        }
                    }
                }
            }
        };
    }());

    var checkColors = (function(){
        var minimumVersion = [4,1,9];

        function iterateShapes(shapes){
            var i, len = shapes.length;
            var j, jLen;
            for(i=0;i<len;i+=1){
                if(shapes[i].ty === 'gr'){
                    iterateShapes(shapes[i].it);
                }else if(shapes[i].ty === 'fl' || shapes[i].ty === 'st'){
                    if(shapes[i].c.k && shapes[i].c.k[0].i){
                        jLen = shapes[i].c.k.length;
                        for(j=0;j<jLen;j+=1){
                            if(shapes[i].c.k[j].s){
                                shapes[i].c.k[j].s[0] /= 255;
                                shapes[i].c.k[j].s[1] /= 255;
                                shapes[i].c.k[j].s[2] /= 255;
                                shapes[i].c.k[j].s[3] /= 255;
                            }
                            if(shapes[i].c.k[j].e){
                                shapes[i].c.k[j].e[0] /= 255;
                                shapes[i].c.k[j].e[1] /= 255;
                                shapes[i].c.k[j].e[2] /= 255;
                                shapes[i].c.k[j].e[3] /= 255;
                            }
                        }
                    } else {
                        shapes[i].c.k[0] /= 255;
                        shapes[i].c.k[1] /= 255;
                        shapes[i].c.k[2] /= 255;
                        shapes[i].c.k[3] /= 255;
                    }
                }
            }
        }

        function iterateLayers(layers){
            var i, len = layers.length;
            for(i=0;i<len;i+=1){
                if(layers[i].ty === 4){
                    iterateShapes(layers[i].shapes);
                }
            }
        }

        return function (animationData){
            if(checkVersion(minimumVersion,animationData.v)){
                iterateLayers(animationData.layers);
                if(animationData.assets){
                    var i, len = animationData.assets.length;
                    for(i=0;i<len;i+=1){
                        if(animationData.assets[i].layers){
                            iterateLayers(animationData.assets[i].layers);

                        }
                    }
                }
            }
        };
    }());

    var checkShapes = (function(){
        var minimumVersion = [4,4,18];



        function completeShapes(arr){
            var i, len = arr.length;
            var j, jLen;
            var hasPaths = false;
            for(i=len-1;i>=0;i-=1){
                if(arr[i].ty == 'sh'){
                    if(arr[i].ks.k.i){
                        arr[i].ks.k.c = arr[i].closed;
                    }else{
                        jLen = arr[i].ks.k.length;
                        for(j=0;j<jLen;j+=1){
                            if(arr[i].ks.k[j].s){
                                arr[i].ks.k[j].s[0].c = arr[i].closed;
                            }
                            if(arr[i].ks.k[j].e){
                                arr[i].ks.k[j].e[0].c = arr[i].closed;
                            }
                        }
                    }
                    hasPaths = true;
                }else if(arr[i].ty == 'gr'){
                    completeShapes(arr[i].it);
                }
            }
        }

        function iterateLayers(layers){
            var layerData;
            var i, len = layers.length;
            var j, jLen, k, kLen;
            for(i=0;i<len;i+=1){
                layerData = layers[i];
                if(layerData.hasMask){
                    var maskProps = layerData.masksProperties;
                    jLen = maskProps.length;
                    for(j=0;j<jLen;j+=1){
                        if(maskProps[j].pt.k.i){
                            maskProps[j].pt.k.c = maskProps[j].cl;
                        }else{
                            kLen = maskProps[j].pt.k.length;
                            for(k=0;k<kLen;k+=1){
                                if(maskProps[j].pt.k[k].s){
                                    maskProps[j].pt.k[k].s[0].c = maskProps[j].cl;
                                }
                                if(maskProps[j].pt.k[k].e){
                                    maskProps[j].pt.k[k].e[0].c = maskProps[j].cl;
                                }
                            }
                        }
                    }
                }
                if(layerData.ty === 4){
                    completeShapes(layerData.shapes);
                }
            }
        }

        return function (animationData){
            if(checkVersion(minimumVersion,animationData.v)){
                iterateLayers(animationData.layers);
                if(animationData.assets){
                    var i, len = animationData.assets.length;
                    for(i=0;i<len;i+=1){
                        if(animationData.assets[i].layers){
                            iterateLayers(animationData.assets[i].layers);

                        }
                    }
                }
            }
        };
    }());

    function completeData(animationData, fontManager){
        if(animationData.__complete){
            return;
        }
        checkColors(animationData);
        checkText(animationData);
        checkChars(animationData);
        checkShapes(animationData);
        completeLayers(animationData.layers, animationData.assets, fontManager);
        animationData.__complete = true;
        //blitAnimation(animationData, animationData.assets, fontManager);
    }

    function completeText(data, fontManager){
        if(data.t.a.length === 0 && !('m' in data.t.p)){
            data.singleShape = true;
        }
    }

    var moduleOb = {};
    moduleOb.completeData = completeData;
    moduleOb.checkColors = checkColors;
    moduleOb.checkChars = checkChars;
    moduleOb.checkShapes = checkShapes;
    moduleOb.completeLayers = completeLayers;

    return moduleOb;
}

var dataManager = dataFunctionManager();

var FontManager = (function () {

    var maxWaitingTime = 5000;
    var emptyChar = {
        w: 0,
        size: 0,
        shapes: []
    };
    var combinedCharacters = [];
    //Hindi characters
    combinedCharacters = combinedCharacters.concat([2304, 2305, 2306, 2307, 2362, 2363, 2364, 2364, 2366
        , 2367, 2368, 2369, 2370, 2371, 2372, 2373, 2374, 2375, 2376, 2377, 2378, 2379
        , 2380, 2381, 2382, 2383, 2387, 2388, 2389, 2390, 2391, 2402, 2403]);

    function setUpNode(font, family) {
        var parentNode = createTag('span');
        parentNode.style.fontFamily = family;
        var node = createTag('span');
        // Characters that vary significantly among different fonts
        node.innerHTML = 'giItT1WQy@!-/#';
        // Visible - so we can measure it - but not on the screen
        parentNode.style.position = 'absolute';
        parentNode.style.left = '-10000px';
        parentNode.style.top = '-10000px';
        // Large font size makes even subtle changes obvious
        parentNode.style.fontSize = '300px';
        // Reset any font properties
        parentNode.style.fontVariant = 'normal';
        parentNode.style.fontStyle = 'normal';
        parentNode.style.fontWeight = 'normal';
        parentNode.style.letterSpacing = '0';
        parentNode.appendChild(node);
        document.body.appendChild(parentNode);

        // Remember width with no applied web font
        var width = node.offsetWidth;
        node.style.fontFamily = font + ', ' + family;
        return { node: node, w: width, parent: parentNode };
    }

    function checkLoadedFonts() {
        var i, len = this.fonts.length;
        var node, w;
        var loadedCount = len;
        for (i = 0; i < len; i += 1) {
            if (this.fonts[i].loaded) {
                loadedCount -= 1;
                continue;
            }
            if (this.fonts[i].fOrigin === 'n' || this.fonts[i].origin === 0) {
                this.fonts[i].loaded = true;
            } else {
                node = this.fonts[i].monoCase.node;
                w = this.fonts[i].monoCase.w;
                if (node.offsetWidth !== w) {
                    loadedCount -= 1;
                    this.fonts[i].loaded = true;
                } else {
                    node = this.fonts[i].sansCase.node;
                    w = this.fonts[i].sansCase.w;
                    if (node.offsetWidth !== w) {
                        loadedCount -= 1;
                        this.fonts[i].loaded = true;
                    }
                }
                if (this.fonts[i].loaded) {
                    this.fonts[i].sansCase.parent.parentNode.removeChild(this.fonts[i].sansCase.parent);
                    this.fonts[i].monoCase.parent.parentNode.removeChild(this.fonts[i].monoCase.parent);
                }
            }
        }

        if (loadedCount !== 0 && Date.now() - this.initTime < maxWaitingTime) {
            setTimeout(this.checkLoadedFonts.bind(this), 20);
        } else {
            setTimeout(function () { this.isLoaded = true; }.bind(this), 0);

        }
    }

    function createHelper(def, fontData) {
        var tHelper = createNS('text');
        tHelper.style.fontSize = '100px';
        //tHelper.style.fontFamily = fontData.fFamily;
        tHelper.setAttribute('font-family', fontData.fFamily);
        tHelper.setAttribute('font-style', fontData.fStyle);
        tHelper.setAttribute('font-weight', fontData.fWeight);
        tHelper.textContent = '1';
        if (fontData.fClass) {
            tHelper.style.fontFamily = 'inherit';
            tHelper.setAttribute('class', fontData.fClass);
        } else {
            tHelper.style.fontFamily = fontData.fFamily;
        }
        def.appendChild(tHelper);
        var tCanvasHelper = createTag('canvas').getContext('2d');
        tCanvasHelper.font = fontData.fWeight + ' ' + fontData.fStyle + ' 100px ' + fontData.fFamily;
        //tCanvasHelper.font = ' 100px '+ fontData.fFamily;
        return tHelper;
    }

    function addFonts(fontData, defs) {
        if (!fontData) {
            this.isLoaded = true;
            return;
        }
        if (this.chars) {
            this.isLoaded = true;
            this.fonts = fontData.list;
            return;
        }


        var fontArr = fontData.list;
        var i, len = fontArr.length;
        var _pendingFonts = len;
        for (i = 0; i < len; i += 1) {
            var shouldLoadFont = true;
            var loadedSelector;
            var j;
            fontArr[i].loaded = false;
            fontArr[i].monoCase = setUpNode(fontArr[i].fFamily, 'monospace');
            fontArr[i].sansCase = setUpNode(fontArr[i].fFamily, 'sans-serif');
            if (!fontArr[i].fPath) {
                fontArr[i].loaded = true;
                _pendingFonts -= 1;
            } else if (fontArr[i].fOrigin === 'p' || fontArr[i].origin === 3) {
                loadedSelector = document.querySelectorAll('style[f-forigin="p"][f-family="' + fontArr[i].fFamily + '"], style[f-origin="3"][f-family="' + fontArr[i].fFamily + '"]');

                if (loadedSelector.length > 0) {
                    shouldLoadFont = false;
                }

                if (shouldLoadFont) {
                    var s = createTag('style');
                    s.setAttribute('f-forigin', fontArr[i].fOrigin);
                    s.setAttribute('f-origin', fontArr[i].origin);
                    s.setAttribute('f-family', fontArr[i].fFamily);
                    s.type = "text/css";
                    s.innerHTML = "@font-face {" + "font-family: " + fontArr[i].fFamily + "; font-style: normal; src: url('" + fontArr[i].fPath + "');}";
                    defs.appendChild(s);
                }
            } else if (fontArr[i].fOrigin === 'g' || fontArr[i].origin === 1) {
                loadedSelector = document.querySelectorAll('link[f-forigin="g"], link[f-origin="1"]');

                for (j = 0; j < loadedSelector.length; j++) {
                    if (loadedSelector[j].href.indexOf(fontArr[i].fPath) !== -1) {
                        // Font is already loaded
                        shouldLoadFont = false;
                    }
                }

                if (shouldLoadFont) {
                    var l = createTag('link');
                    l.setAttribute('f-forigin', fontArr[i].fOrigin);
                    l.setAttribute('f-origin', fontArr[i].origin);
                    l.type = "text/css";
                    l.rel = "stylesheet";
                    l.href = fontArr[i].fPath;
                    document.body.appendChild(l);
                }
            } else if (fontArr[i].fOrigin === 't' || fontArr[i].origin === 2) {
                loadedSelector = document.querySelectorAll('script[f-forigin="t"], script[f-origin="2"]');

                for (j = 0; j < loadedSelector.length; j++) {
                    if (fontArr[i].fPath === loadedSelector[j].src) {
                        // Font is already loaded
                        shouldLoadFont = false;
                    }
                }

                if (shouldLoadFont) {
                    var sc = createTag('link');
                    sc.setAttribute('f-forigin', fontArr[i].fOrigin);
                    sc.setAttribute('f-origin', fontArr[i].origin);
                    sc.setAttribute('rel', 'stylesheet');
                    sc.setAttribute('href', fontArr[i].fPath);
                    defs.appendChild(sc);
                }
            }
            fontArr[i].helper = createHelper(defs, fontArr[i]);
            fontArr[i].cache = {};
            this.fonts.push(fontArr[i]);
        }
        if (_pendingFonts === 0) {
            this.isLoaded = true;
        } else {
            //On some cases even if the font is loaded, it won't load correctly when measuring text on canvas.
            //Adding this timeout seems to fix it
            setTimeout(this.checkLoadedFonts.bind(this), 100);
        }
    }

    function addChars(chars) {
        if (!chars) {
            return;
        }
        if (!this.chars) {
            this.chars = [];
        }
        var i, len = chars.length;
        var j, jLen = this.chars.length, found;
        for (i = 0; i < len; i += 1) {
            j = 0;
            found = false;
            while (j < jLen) {
                if (this.chars[j].style === chars[i].style && this.chars[j].fFamily === chars[i].fFamily && this.chars[j].ch === chars[i].ch) {
                    found = true;
                }
                j += 1;
            }
            if (!found) {
                this.chars.push(chars[i]);
                jLen += 1;
            }
        }
    }

    function getCharData(char, style, font) {
        if (!this.chars) {
            return;
        }
        var i = 0, len = this.chars.length;
        while (i < len) {
            if (this.chars[i].ch === char && this.chars[i].style === style && this.chars[i].fFamily === font) {

                return this.chars[i];
            }
            i += 1;
        }
        if ((typeof char === 'string' && char.charCodeAt(0) !== 13 || !char) && console && console.warn) {
            console.warn('Missing character from exported characters list: ', char, style, font);
        }
        return emptyChar;
    }

    function measureText(char, fontName, size) {
        var fontData = this.getFontByName(fontName);
        var index = char.charCodeAt(0);
        if (!fontData.cache[index + 1]) {
            var tHelper = fontData.helper;
            //Canvas version
            //fontData.cache[index] = tHelper.measureText(char).width / 100;
            //SVG version
            //console.log(tHelper.getBBox().width)
            if (char === ' ') {
                tHelper.textContent = '|' + char + '|';
                var doubleSize = tHelper.getComputedTextLength();
                tHelper.textContent = '||';
                var singleSize = tHelper.getComputedTextLength();
                fontData.cache[index + 1] = (doubleSize - singleSize) / 100;
            } else {
                tHelper.textContent = char;
                fontData.cache[index + 1] = (tHelper.getComputedTextLength()) / 100;
            }
        }
        return fontData.cache[index + 1] * size;
    }

    function getFontByName(name) {
        var i = 0, len = this.fonts.length;
        while (i < len) {
            if (this.fonts[i].fName === name) {
                return this.fonts[i];
            }
            i += 1;
        }
        return this.fonts[0];
    }

    function getCombinedCharacterCodes() {
        return combinedCharacters;
    }

    function loaded() {
        return this.isLoaded;
    }

    var Font = function () {
        this.fonts = [];
        this.chars = null;
        this.typekitLoaded = 0;
        this.isLoaded = false;
        this.initTime = Date.now();
    };
    //TODO: for now I'm adding these methods to the Class and not the prototype. Think of a better way to implement it. 
    Font.getCombinedCharacterCodes = getCombinedCharacterCodes;

    Font.prototype.addChars = addChars;
    Font.prototype.addFonts = addFonts;
    Font.prototype.getCharData = getCharData;
    Font.prototype.getFontByName = getFontByName;
    Font.prototype.measureText = measureText;
    Font.prototype.checkLoadedFonts = checkLoadedFonts;
    Font.prototype.loaded = loaded;

    return Font;

}());
var PropertyFactory = (function(){

    var initFrame = initialDefaultFrame;
    var math_abs = Math.abs;

    function interpolateValue(frameNum, caching) {
        var offsetTime = this.offsetTime;
        var newValue;
        if (this.propType === 'multidimensional') {
            newValue = createTypedArray('float32', this.pv.length);
        }
        var iterationIndex = caching.lastIndex;
        var i = iterationIndex;
        var len = this.keyframes.length - 1, flag = true;
        var keyData, nextKeyData;

        while (flag) {
            keyData = this.keyframes[i];
            nextKeyData = this.keyframes[i + 1];
            if (i === len - 1 && frameNum >= nextKeyData.t - offsetTime){
                if(keyData.h){
                    keyData = nextKeyData;
                }
                iterationIndex = 0;
                break;
            }
            if ((nextKeyData.t - offsetTime) > frameNum){
                iterationIndex = i;
                break;
            }
            if (i < len - 1){
                i += 1;
            } else {
                iterationIndex = 0;
                flag = false;
            }
        }

        var k, kLen, perc, jLen, j, fnc;
        var nextKeyTime = nextKeyData.t - offsetTime;
        var keyTime = keyData.t - offsetTime;
        var endValue;
        if (keyData.to) {
            if (!keyData.bezierData) {
                keyData.bezierData = bez.buildBezierData(keyData.s, nextKeyData.s || keyData.e, keyData.to, keyData.ti);
            }
            var bezierData = keyData.bezierData;
            if (frameNum >= nextKeyTime || frameNum < keyTime) {
                var ind = frameNum >= nextKeyTime ? bezierData.points.length - 1 : 0;
                kLen = bezierData.points[ind].point.length;
                for (k = 0; k < kLen; k += 1) {
                    newValue[k] = bezierData.points[ind].point[k];
                }
                // caching._lastKeyframeIndex = -1;
            } else {
                if (keyData.__fnct) {
                    fnc = keyData.__fnct;
                } else {
                    fnc = BezierFactory.getBezierEasing(keyData.o.x, keyData.o.y, keyData.i.x, keyData.i.y, keyData.n).get;
                    keyData.__fnct = fnc;
                }
                perc = fnc((frameNum - keyTime) / (nextKeyTime - keyTime));
                var distanceInLine = bezierData.segmentLength*perc;

                var segmentPerc;
                var addedLength =  (caching.lastFrame < frameNum && caching._lastKeyframeIndex === i) ? caching._lastAddedLength : 0;
                j =  (caching.lastFrame < frameNum && caching._lastKeyframeIndex === i) ? caching._lastPoint : 0;
                flag = true;
                jLen = bezierData.points.length;
                while (flag) {
                    addedLength += bezierData.points[j].partialLength;
                    if (distanceInLine === 0 || perc === 0 || j === bezierData.points.length - 1) {
                        kLen = bezierData.points[j].point.length;
                        for (k = 0; k < kLen; k += 1) {
                            newValue[k] = bezierData.points[j].point[k];
                        }
                        break;
                    } else if (distanceInLine >= addedLength && distanceInLine < addedLength + bezierData.points[j + 1].partialLength) {
                        segmentPerc = (distanceInLine - addedLength) / bezierData.points[j + 1].partialLength;
                        kLen = bezierData.points[j].point.length;
                        for (k = 0; k < kLen; k += 1) {
                            newValue[k] = bezierData.points[j].point[k] + (bezierData.points[j + 1].point[k] - bezierData.points[j].point[k]) * segmentPerc;
                        }
                        break;
                    }
                    if (j < jLen - 1){
                        j += 1;
                    } else {
                        flag = false;
                    }
                }
                caching._lastPoint = j;
                caching._lastAddedLength = addedLength - bezierData.points[j].partialLength;
                caching._lastKeyframeIndex = i;
            }
        } else {
            var outX, outY, inX, inY, keyValue;
            len = keyData.s.length;
            endValue = nextKeyData.s || keyData.e;
            if (this.sh && keyData.h !== 1) {
                if (frameNum >= nextKeyTime) {
                    newValue[0] = endValue[0];
                    newValue[1] = endValue[1];
                    newValue[2] = endValue[2];
                } else if (frameNum <= keyTime) {
                    newValue[0] = keyData.s[0];
                    newValue[1] = keyData.s[1];
                    newValue[2] = keyData.s[2];
                } else {
                    var quatStart = createQuaternion(keyData.s);
                    var quatEnd = createQuaternion(endValue);
                    var time = (frameNum - keyTime) / (nextKeyTime - keyTime);
                    quaternionToEuler(newValue, slerp(quatStart, quatEnd, time));
                }
                
            } else {
                for(i = 0; i < len; i += 1) {
                    if (keyData.h !== 1) {
                        if (frameNum >= nextKeyTime) {
                            perc = 1;
                        } else if(frameNum < keyTime) {
                            perc = 0;
                        } else {
                            if(keyData.o.x.constructor === Array) {
                                if (!keyData.__fnct) {
                                    keyData.__fnct = [];
                                }
                                if (!keyData.__fnct[i]) {
                                    outX = (typeof keyData.o.x[i] === 'undefined') ? keyData.o.x[0] : keyData.o.x[i];
                                    outY = (typeof keyData.o.y[i] === 'undefined') ? keyData.o.y[0] : keyData.o.y[i];
                                    inX = (typeof keyData.i.x[i] === 'undefined') ? keyData.i.x[0] : keyData.i.x[i];
                                    inY = (typeof keyData.i.y[i] === 'undefined') ? keyData.i.y[0] : keyData.i.y[i];
                                    fnc = BezierFactory.getBezierEasing(outX, outY, inX, inY).get;
                                    keyData.__fnct[i] = fnc;
                                } else {
                                    fnc = keyData.__fnct[i];
                                }
                            } else {
                                if (!keyData.__fnct) {
                                    outX = keyData.o.x;
                                    outY = keyData.o.y;
                                    inX = keyData.i.x;
                                    inY = keyData.i.y;
                                    fnc = BezierFactory.getBezierEasing(outX, outY, inX, inY).get;
                                    keyData.__fnct = fnc;
                                } else {
                                    fnc = keyData.__fnct;
                                }
                            }
                            perc = fnc((frameNum - keyTime) / (nextKeyTime - keyTime ));
                        }
                    }

                    endValue = nextKeyData.s || keyData.e;
                    keyValue = keyData.h === 1 ? keyData.s[i] : keyData.s[i] + (endValue[i] - keyData.s[i]) * perc;

                    if (this.propType === 'multidimensional') {
                        newValue[i] = keyValue;
                    } else {
                        newValue = keyValue;
                    }
                }
            }
        }
        caching.lastIndex = iterationIndex;
        return newValue;
    }

    //based on @Toji's https://github.com/toji/gl-matrix/
    function slerp(a, b, t) {
        var out = [];
        var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3]

        var omega, cosom, sinom, scale0, scale1;

        cosom = ax * bx + ay * by + az * bz + aw * bw;
        if (cosom < 0.0) {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }
        if ((1.0 - cosom) > 0.000001) {
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {
            scale0 = 1.0 - t;
            scale1 = t;
        }
        out[0] = scale0 * ax + scale1 * bx;
        out[1] = scale0 * ay + scale1 * by;
        out[2] = scale0 * az + scale1 * bz;
        out[3] = scale0 * aw + scale1 * bw;

        return out;
    }

    function quaternionToEuler(out, quat) {
        var qx = quat[0];
        var qy = quat[1];
        var qz = quat[2];
        var qw = quat[3];
        var heading = Math.atan2(2*qy*qw-2*qx*qz , 1 - 2*qy*qy - 2*qz*qz)
        var attitude = Math.asin(2*qx*qy + 2*qz*qw) 
        var bank = Math.atan2(2*qx*qw-2*qy*qz , 1 - 2*qx*qx - 2*qz*qz);
        out[0] = heading/degToRads;
        out[1] = attitude/degToRads;
        out[2] = bank/degToRads;
    }

    function createQuaternion(values) {
        var heading = values[0] * degToRads;
        var attitude = values[1] * degToRads;
        var bank = values[2] * degToRads;
        var c1 = Math.cos(heading / 2);
        var c2 = Math.cos(attitude / 2);
        var c3 = Math.cos(bank / 2);
        var s1 = Math.sin(heading / 2);
        var s2 = Math.sin(attitude / 2);
        var s3 = Math.sin(bank / 2);
        var w = c1 * c2 * c3 - s1 * s2 * s3;
        var x = s1 * s2 * c3 + c1 * c2 * s3;
        var y = s1 * c2 * c3 + c1 * s2 * s3;
        var z = c1 * s2 * c3 - s1 * c2 * s3;

        return [x,y,z,w];
    }

    function getValueAtCurrentTime(){
        var frameNum = this.comp.renderedFrame - this.offsetTime;
        var initTime = this.keyframes[0].t - this.offsetTime;
        var endTime = this.keyframes[this.keyframes.length- 1].t-this.offsetTime;
        if(!(frameNum === this._caching.lastFrame || (this._caching.lastFrame !== initFrame && ((this._caching.lastFrame >= endTime && frameNum >= endTime) || (this._caching.lastFrame < initTime && frameNum < initTime))))){
            if(this._caching.lastFrame >= frameNum) {
                this._caching._lastKeyframeIndex = -1;
                this._caching.lastIndex = 0;
            }

            var renderResult = this.interpolateValue(frameNum, this._caching);
            this.pv = renderResult;
        }
        this._caching.lastFrame = frameNum;
        return this.pv;
    }

    function setVValue(val) {
        var multipliedValue;
        if(this.propType === 'unidimensional') {
            multipliedValue = val * this.mult;
            if(math_abs(this.v - multipliedValue) > 0.00001) {
                this.v = multipliedValue;
                this._mdf = true;
            }
        } else {
            var i = 0, len = this.v.length;
            while (i < len) {
                multipliedValue = val[i] * this.mult;
                if (math_abs(this.v[i] - multipliedValue) > 0.00001) {
                    this.v[i] = multipliedValue;
                    this._mdf = true;
                }
                i += 1;
            }
        }
    }

    function processEffectsSequence() {
        if (this.elem.globalData.frameId === this.frameId || !this.effectsSequence.length) {
            return;
        }
        if(this.lock) {
            this.setVValue(this.pv);
            return;
        }
        this.lock = true;
        this._mdf = this._isFirstFrame;
        var multipliedValue;
        var i, len = this.effectsSequence.length;
        var finalValue = this.kf ? this.pv : this.data.k;
        for(i = 0; i < len; i += 1) {
            finalValue = this.effectsSequence[i](finalValue);
        }
        this.setVValue(finalValue);
        this._isFirstFrame = false;
        this.lock = false;
        this.frameId = this.elem.globalData.frameId;
    }

    function addEffect(effectFunction) {
        this.effectsSequence.push(effectFunction);
        this.container.addDynamicProperty(this);
    }

    function ValueProperty(elem, data, mult, container){
        this.propType = 'unidimensional';
        this.mult = mult || 1;
        this.data = data;
        this.v = mult ? data.k * mult : data.k;
        this.pv = data.k;
        this._mdf = false;
        this.elem = elem;
        this.container = container;
        this.comp = elem.comp;
        this.k = false;
        this.kf = false;
        this.vel = 0;
        this.effectsSequence = [];
        this._isFirstFrame = true;
        this.getValue = processEffectsSequence;
        this.setVValue = setVValue;
        this.addEffect = addEffect;
    }

    function MultiDimensionalProperty(elem, data, mult, container) {
        this.propType = 'multidimensional';
        this.mult = mult || 1;
        this.data = data;
        this._mdf = false;
        this.elem = elem;
        this.container = container;
        this.comp = elem.comp;
        this.k = false;
        this.kf = false;
        this.frameId = -1;
        var i, len = data.k.length;
        this.v = createTypedArray('float32', len);
        this.pv = createTypedArray('float32', len);
        var arr = createTypedArray('float32', len);
        this.vel = createTypedArray('float32', len);
        for (i = 0; i < len; i += 1) {
            this.v[i] = data.k[i] * this.mult;
            this.pv[i] = data.k[i];
        }
        this._isFirstFrame = true;
        this.effectsSequence = [];
        this.getValue = processEffectsSequence;
        this.setVValue = setVValue;
        this.addEffect = addEffect;
    }

    function KeyframedValueProperty(elem, data, mult, container) {
        this.propType = 'unidimensional';
        this.keyframes = data.k;
        this.offsetTime = elem.data.st;
        this.frameId = -1;
        this._caching = {lastFrame: initFrame, lastIndex: 0, value: 0, _lastKeyframeIndex: -1};
        this.k = true;
        this.kf = true;
        this.data = data;
        this.mult = mult || 1;
        this.elem = elem;
        this.container = container;
        this.comp = elem.comp;
        this.v = initFrame;
        this.pv = initFrame;
        this._isFirstFrame = true;
        this.getValue = processEffectsSequence;
        this.setVValue = setVValue;
        this.interpolateValue = interpolateValue;
        this.effectsSequence = [getValueAtCurrentTime.bind(this)];
        this.addEffect = addEffect;
    }

    function KeyframedMultidimensionalProperty(elem, data, mult, container){
        this.propType = 'multidimensional';
        var i, len = data.k.length;
        var s, e,to,ti;
        for (i = 0; i < len - 1; i += 1) {
            if (data.k[i].to && data.k[i].s && data.k[i + 1] && data.k[i + 1].s) {
                s = data.k[i].s;
                e = data.k[i + 1].s;
                to = data.k[i].to;
                ti = data.k[i].ti;
                if((s.length === 2 && !(s[0] === e[0] && s[1] === e[1]) && bez.pointOnLine2D(s[0],s[1],e[0],e[1],s[0] + to[0],s[1] + to[1]) && bez.pointOnLine2D(s[0],s[1],e[0],e[1],e[0] + ti[0],e[1] + ti[1])) || (s.length === 3 && !(s[0] === e[0] && s[1] === e[1] && s[2] === e[2]) && bez.pointOnLine3D(s[0],s[1],s[2],e[0],e[1],e[2],s[0] + to[0],s[1] + to[1],s[2] + to[2]) && bez.pointOnLine3D(s[0],s[1],s[2],e[0],e[1],e[2],e[0] + ti[0],e[1] + ti[1],e[2] + ti[2]))){
                    data.k[i].to = null;
                    data.k[i].ti = null;
                }
                if(s[0] === e[0] && s[1] === e[1] && to[0] === 0 && to[1] === 0 && ti[0] === 0 && ti[1] === 0) {
                    if(s.length === 2 || (s[2] === e[2] && to[2] === 0 && ti[2] === 0)) {
                        data.k[i].to = null;
                        data.k[i].ti = null;
                    }
                }
            }
        }
        this.effectsSequence = [getValueAtCurrentTime.bind(this)];
        this.keyframes = data.k;
        this.offsetTime = elem.data.st;
        this.k = true;
        this.kf = true;
        this._isFirstFrame = true;
        this.mult = mult || 1;
        this.elem = elem;
        this.container = container;
        this.comp = elem.comp;
        this.getValue = processEffectsSequence;
        this.setVValue = setVValue;
        this.interpolateValue = interpolateValue;
        this.frameId = -1;
        var arrLen = data.k[0].s.length;
        this.v = createTypedArray('float32', arrLen);
        this.pv = createTypedArray('float32', arrLen);
        for (i = 0; i < arrLen; i += 1) {
            this.v[i] = initFrame;
            this.pv[i] = initFrame;
        }
        this._caching={lastFrame:initFrame,lastIndex:0,value:createTypedArray('float32', arrLen)};
        this.addEffect = addEffect;
    }

    function getProp(elem,data,type, mult, container) {
        var p;
        if(!data.k.length){
            p = new ValueProperty(elem,data, mult, container);
        }else if(typeof(data.k[0]) === 'number'){
            p = new MultiDimensionalProperty(elem,data, mult, container);
        }else{
            switch(type){
                case 0:
                    p = new KeyframedValueProperty(elem,data,mult, container);
                    break;
                case 1:
                    p = new KeyframedMultidimensionalProperty(elem,data,mult, container);
                    break;
            }
        }
        if(p.effectsSequence.length){
            container.addDynamicProperty(p);
        }
        return p;
    }

    var ob = {
        getProp: getProp
    };
    return ob;
}());
var TransformPropertyFactory = (function() {

    var defaultVector = [0,0]

    function applyToMatrix(mat) {
        var _mdf = this._mdf;
        this.iterateDynamicProperties();
        this._mdf = this._mdf || _mdf;
        if (this.a) {
            mat.translate(-this.a.v[0], -this.a.v[1], this.a.v[2]);
        }
        if (this.s) {
            mat.scale(this.s.v[0], this.s.v[1], this.s.v[2]);
        }
        if (this.sk) {
            mat.skewFromAxis(-this.sk.v, this.sa.v);
        }
        if (this.r) {
            mat.rotate(-this.r.v);
        } else {
            mat.rotateZ(-this.rz.v).rotateY(this.ry.v).rotateX(this.rx.v).rotateZ(-this.or.v[2]).rotateY(this.or.v[1]).rotateX(this.or.v[0]);
        }
        if (this.data.p.s) {
            if (this.data.p.z) {
                mat.translate(this.px.v, this.py.v, -this.pz.v);
            } else {
                mat.translate(this.px.v, this.py.v, 0);
            }
        } else {
            mat.translate(this.p.v[0], this.p.v[1], -this.p.v[2]);
        }
    }
    function processKeys(forceRender){
        if (this.elem.globalData.frameId === this.frameId) {
            return;
        }
        if(this._isDirty) {
            this.precalculateMatrix();
            this._isDirty = false;
        }

        this.iterateDynamicProperties();

        if (this._mdf || forceRender) {
            this.v.cloneFromProps(this.pre.props);
            if (this.appliedTransformations < 1) {
                this.v.translate(-this.a.v[0], -this.a.v[1], this.a.v[2]);
            }
            if(this.appliedTransformations < 2) {
                this.v.scale(this.s.v[0], this.s.v[1], this.s.v[2]);
            }
            if (this.sk && this.appliedTransformations < 3) {
                this.v.skewFromAxis(-this.sk.v, this.sa.v);
            }
            if (this.r && this.appliedTransformations < 4) {
                this.v.rotate(-this.r.v);
            } else if (!this.r && this.appliedTransformations < 4){
                this.v.rotateZ(-this.rz.v).rotateY(this.ry.v).rotateX(this.rx.v).rotateZ(-this.or.v[2]).rotateY(this.or.v[1]).rotateX(this.or.v[0]);
            }
            if (this.autoOriented) {
                var v1,v2, frameRate = this.elem.globalData.frameRate;
                if(this.p && this.p.keyframes && this.p.getValueAtTime) {
                    if (this.p._caching.lastFrame+this.p.offsetTime <= this.p.keyframes[0].t) {
                        v1 = this.p.getValueAtTime((this.p.keyframes[0].t + 0.01) / frameRate,0);
                        v2 = this.p.getValueAtTime(this.p.keyframes[0].t / frameRate, 0);
                    } else if(this.p._caching.lastFrame+this.p.offsetTime >= this.p.keyframes[this.p.keyframes.length - 1].t) {
                        v1 = this.p.getValueAtTime((this.p.keyframes[this.p.keyframes.length - 1].t / frameRate), 0);
                        v2 = this.p.getValueAtTime((this.p.keyframes[this.p.keyframes.length - 1].t - 0.05) / frameRate, 0);
                    } else {
                        v1 = this.p.pv;
                        v2 = this.p.getValueAtTime((this.p._caching.lastFrame+this.p.offsetTime - 0.01) / frameRate, this.p.offsetTime);
                    }
                } else if(this.px && this.px.keyframes && this.py.keyframes && this.px.getValueAtTime && this.py.getValueAtTime) {
                    v1 = [];
                    v2 = [];
                    var px = this.px, py = this.py, frameRate;
                    if (px._caching.lastFrame+px.offsetTime <= px.keyframes[0].t) {
                        v1[0] = px.getValueAtTime((px.keyframes[0].t + 0.01) / frameRate,0);
                        v1[1] = py.getValueAtTime((py.keyframes[0].t + 0.01) / frameRate,0);
                        v2[0] = px.getValueAtTime((px.keyframes[0].t) / frameRate,0);
                        v2[1] = py.getValueAtTime((py.keyframes[0].t) / frameRate,0);
                    } else if(px._caching.lastFrame+px.offsetTime >= px.keyframes[px.keyframes.length - 1].t) {
                        v1[0] = px.getValueAtTime((px.keyframes[px.keyframes.length - 1].t / frameRate),0);
                        v1[1] = py.getValueAtTime((py.keyframes[py.keyframes.length - 1].t / frameRate),0);
                        v2[0] = px.getValueAtTime((px.keyframes[px.keyframes.length - 1].t - 0.01) / frameRate,0);
                        v2[1] = py.getValueAtTime((py.keyframes[py.keyframes.length - 1].t - 0.01) / frameRate,0);
                    } else {
                        v1 = [px.pv, py.pv];
                        v2[0] = px.getValueAtTime((px._caching.lastFrame+px.offsetTime - 0.01) / frameRate,px.offsetTime);
                        v2[1] = py.getValueAtTime((py._caching.lastFrame+py.offsetTime - 0.01) / frameRate,py.offsetTime);
                    }
                } else {
                    v1 = v2 = defaultVector
                }
                this.v.rotate(-Math.atan2(v1[1] - v2[1], v1[0] - v2[0]));
            }
            if(this.data.p && this.data.p.s){
                if(this.data.p.z) {
                    this.v.translate(this.px.v, this.py.v, -this.pz.v);
                } else {
                    this.v.translate(this.px.v, this.py.v, 0);
                }
            }else{
                this.v.translate(this.p.v[0],this.p.v[1],-this.p.v[2]);
            }
        }
        this.frameId = this.elem.globalData.frameId;
    }

    function precalculateMatrix() {
        if(!this.a.k) {
            this.pre.translate(-this.a.v[0], -this.a.v[1], this.a.v[2]);
            this.appliedTransformations = 1;
        } else {
            return;
        }
        if(!this.s.effectsSequence.length) {
            this.pre.scale(this.s.v[0], this.s.v[1], this.s.v[2]);
            this.appliedTransformations = 2;
        } else {
            return;
        }
        if(this.sk) {
            if(!this.sk.effectsSequence.length && !this.sa.effectsSequence.length) {
                this.pre.skewFromAxis(-this.sk.v, this.sa.v);
            this.appliedTransformations = 3;
            } else {
                return;
            }
        }
        if (this.r) {
            if(!this.r.effectsSequence.length) {
                this.pre.rotate(-this.r.v);
                this.appliedTransformations = 4;
            } else {
                return;
            }
        } else if(!this.rz.effectsSequence.length && !this.ry.effectsSequence.length && !this.rx.effectsSequence.length && !this.or.effectsSequence.length) {
            this.pre.rotateZ(-this.rz.v).rotateY(this.ry.v).rotateX(this.rx.v).rotateZ(-this.or.v[2]).rotateY(this.or.v[1]).rotateX(this.or.v[0]);
            this.appliedTransformations = 4;
        }
    }

    function autoOrient(){
        //
        //var prevP = this.getValueAtTime();
    }

    function addDynamicProperty(prop) {
        this._addDynamicProperty(prop);
        this.elem.addDynamicProperty(prop);
        this._isDirty = true;
    }

    function TransformProperty(elem,data,container){
        this.elem = elem;
        this.frameId = -1;
        this.propType = 'transform';
        this.data = data;
        this.v = new Matrix();
        //Precalculated matrix with non animated properties
        this.pre = new Matrix();
        this.appliedTransformations = 0;
        this.initDynamicPropertyContainer(container || elem);
        if(data.p && data.p.s){
            this.px = PropertyFactory.getProp(elem,data.p.x,0,0,this);
            this.py = PropertyFactory.getProp(elem,data.p.y,0,0,this);
            if(data.p.z){
                this.pz = PropertyFactory.getProp(elem,data.p.z,0,0,this);
            }
        }else{
            this.p = PropertyFactory.getProp(elem,data.p || {k:[0,0,0]},1,0,this);
        }
        if(data.rx) {
            this.rx = PropertyFactory.getProp(elem, data.rx, 0, degToRads, this);
            this.ry = PropertyFactory.getProp(elem, data.ry, 0, degToRads, this);
            this.rz = PropertyFactory.getProp(elem, data.rz, 0, degToRads, this);
            if(data.or.k[0].ti) {
                var i, len = data.or.k.length;
                for(i=0;i<len;i+=1) {
                    data.or.k[i].to = data.or.k[i].ti = null;
                }
            }
            this.or = PropertyFactory.getProp(elem, data.or, 1, degToRads, this);
            //sh Indicates it needs to be capped between -180 and 180
            this.or.sh = true;
        } else {
            this.r = PropertyFactory.getProp(elem, data.r || {k: 0}, 0, degToRads, this);
        }
        if(data.sk){
            this.sk = PropertyFactory.getProp(elem, data.sk, 0, degToRads, this);
            this.sa = PropertyFactory.getProp(elem, data.sa, 0, degToRads, this);
        }
        this.a = PropertyFactory.getProp(elem,data.a || {k:[0,0,0]},1,0,this);
        this.s = PropertyFactory.getProp(elem,data.s || {k:[100,100,100]},1,0.01,this);
        // Opacity is not part of the transform properties, that's why it won't use this.dynamicProperties. That way transforms won't get updated if opacity changes.
        if(data.o){
            this.o = PropertyFactory.getProp(elem,data.o,0,0.01,elem);
        } else {
            this.o = {_mdf:false,v:1};
        }
        this._isDirty = true;
        if(!this.dynamicProperties.length){
            this.getValue(true);
        }
    }

    TransformProperty.prototype = {
        applyToMatrix: applyToMatrix,
        getValue: processKeys,
        precalculateMatrix: precalculateMatrix,
        autoOrient: autoOrient
    }

    extendPrototype([DynamicPropertyContainer], TransformProperty);
    TransformProperty.prototype.addDynamicProperty = addDynamicProperty;
    TransformProperty.prototype._addDynamicProperty = DynamicPropertyContainer.prototype.addDynamicProperty;

    function getTransformProperty(elem,data,container){
        return new TransformProperty(elem,data,container);
    }

    return {
        getTransformProperty: getTransformProperty
    };

}());
function ShapePath(){
	this.c = false;
	this._length = 0;
	this._maxLength = 8;
	this.v = createSizedArray(this._maxLength);
	this.o = createSizedArray(this._maxLength);
	this.i = createSizedArray(this._maxLength);
}

ShapePath.prototype.setPathData = function(closed, len) {
	this.c = closed;
	this.setLength(len);
	var i = 0;
	while(i < len){
		this.v[i] = point_pool.newElement();
		this.o[i] = point_pool.newElement();
		this.i[i] = point_pool.newElement();
		i += 1;
	}
};

ShapePath.prototype.setLength = function(len) {
	while(this._maxLength < len) {
		this.doubleArrayLength();
	}
	this._length = len;
};

ShapePath.prototype.doubleArrayLength = function() {
	this.v = this.v.concat(createSizedArray(this._maxLength));
	this.i = this.i.concat(createSizedArray(this._maxLength));
	this.o = this.o.concat(createSizedArray(this._maxLength));
	this._maxLength *= 2;
};

ShapePath.prototype.setXYAt = function(x, y, type, pos, replace) {
	var arr;
	this._length = Math.max(this._length, pos + 1);
	if(this._length >= this._maxLength) {
		this.doubleArrayLength();
	}
	switch(type){
		case 'v':
			arr = this.v;
			break;
		case 'i':
			arr = this.i;
			break;
		case 'o':
			arr = this.o;
			break;
	}
	if(!arr[pos] || (arr[pos] && !replace)){
		arr[pos] = point_pool.newElement();
	}
	arr[pos][0] = x;
	arr[pos][1] = y;
};

ShapePath.prototype.setTripleAt = function(vX,vY,oX,oY,iX,iY,pos, replace) {
	this.setXYAt(vX,vY,'v',pos, replace);
	this.setXYAt(oX,oY,'o',pos, replace);
	this.setXYAt(iX,iY,'i',pos, replace);
};

ShapePath.prototype.reverse = function() {
	var newPath = new ShapePath();
	newPath.setPathData(this.c, this._length);
	var vertices = this.v, outPoints = this.o, inPoints = this.i;
	var init = 0;
	if (this.c) {
		newPath.setTripleAt(vertices[0][0], vertices[0][1], inPoints[0][0], inPoints[0][1], outPoints[0][0], outPoints[0][1], 0, false);
        init = 1;
    }
    var cnt = this._length - 1;
    var len = this._length;

    var i;
    for (i = init; i < len; i += 1) {
    	newPath.setTripleAt(vertices[cnt][0], vertices[cnt][1], inPoints[cnt][0], inPoints[cnt][1], outPoints[cnt][0], outPoints[cnt][1], i, false);
        cnt -= 1;
    }
    return newPath;
};
var ShapePropertyFactory = (function(){

    var initFrame = -999999;

    function interpolateShape(frameNum, previousValue, caching) {
        var iterationIndex = caching.lastIndex;
        var keyPropS,keyPropE,isHold, j, k, jLen, kLen, perc, vertexValue;
        var kf = this.keyframes;
        if(frameNum < kf[0].t-this.offsetTime){
            keyPropS = kf[0].s[0];
            isHold = true;
            iterationIndex = 0;
        }else if(frameNum >= kf[kf.length - 1].t-this.offsetTime){
            keyPropS = kf[kf.length - 1].s ? kf[kf.length - 1].s[0] : kf[kf.length - 2].e[0];
            /*if(kf[kf.length - 1].s){
                keyPropS = kf[kf.length - 1].s[0];
            }else{
                keyPropS = kf[kf.length - 2].e[0];
            }*/
            isHold = true;
        }else{
            var i = iterationIndex;
            var len = kf.length- 1,flag = true,keyData,nextKeyData;
            while(flag){
                keyData = kf[i];
                nextKeyData = kf[i+1];
                if((nextKeyData.t - this.offsetTime) > frameNum){
                    break;
                }
                if(i < len - 1){
                    i += 1;
                }else{
                    flag = false;
                }
            }
            isHold = keyData.h === 1;
            iterationIndex = i;
            if(!isHold){
                if(frameNum >= nextKeyData.t-this.offsetTime){
                    perc = 1;
                }else if(frameNum < keyData.t-this.offsetTime){
                    perc = 0;
                }else{
                    var fnc;
                    if(keyData.__fnct){
                        fnc = keyData.__fnct;
                    }else{
                        fnc = BezierFactory.getBezierEasing(keyData.o.x,keyData.o.y,keyData.i.x,keyData.i.y).get;
                        keyData.__fnct = fnc;
                    }
                    perc = fnc((frameNum-(keyData.t-this.offsetTime))/((nextKeyData.t-this.offsetTime)-(keyData.t-this.offsetTime)));
                }
                keyPropE = nextKeyData.s ? nextKeyData.s[0] : keyData.e[0];
            }
            keyPropS = keyData.s[0];
        }
        jLen = previousValue._length;
        kLen = keyPropS.i[0].length;
        caching.lastIndex = iterationIndex;

        for(j=0;j<jLen;j+=1){
            for(k=0;k<kLen;k+=1){
                vertexValue = isHold ? keyPropS.i[j][k] :  keyPropS.i[j][k]+(keyPropE.i[j][k]-keyPropS.i[j][k])*perc;
                previousValue.i[j][k] = vertexValue;
                vertexValue = isHold ? keyPropS.o[j][k] :  keyPropS.o[j][k]+(keyPropE.o[j][k]-keyPropS.o[j][k])*perc;
                previousValue.o[j][k] = vertexValue;
                vertexValue = isHold ? keyPropS.v[j][k] :  keyPropS.v[j][k]+(keyPropE.v[j][k]-keyPropS.v[j][k])*perc;
                previousValue.v[j][k] = vertexValue;
            }
        }
    }

    function interpolateShapeCurrentTime(){
        var frameNum = this.comp.renderedFrame - this.offsetTime;
        var initTime = this.keyframes[0].t - this.offsetTime;
        var endTime = this.keyframes[this.keyframes.length - 1].t - this.offsetTime;
        var lastFrame = this._caching.lastFrame;
        if(!(lastFrame !== initFrame && ((lastFrame < initTime && frameNum < initTime) || (lastFrame > endTime && frameNum > endTime)))){
            ////
            this._caching.lastIndex = lastFrame < frameNum ? this._caching.lastIndex : 0;
            this.interpolateShape(frameNum, this.pv, this._caching);
            ////
        }
        this._caching.lastFrame = frameNum;
        return this.pv;
    }

    function resetShape(){
        this.paths = this.localShapeCollection;
    }

    function shapesEqual(shape1, shape2) {
        if(shape1._length !== shape2._length || shape1.c !== shape2.c){
            return false;
        }
        var i, len = shape1._length;
        for(i = 0; i < len; i += 1) {
            if(shape1.v[i][0] !== shape2.v[i][0] 
            || shape1.v[i][1] !== shape2.v[i][1] 
            || shape1.o[i][0] !== shape2.o[i][0] 
            || shape1.o[i][1] !== shape2.o[i][1] 
            || shape1.i[i][0] !== shape2.i[i][0] 
            || shape1.i[i][1] !== shape2.i[i][1]) {
                return false;
            }
        }
        return true;
    }

    function setVValue(newPath) {
        if(!shapesEqual(this.v, newPath)) {
            this.v = shape_pool.clone(newPath);
            this.localShapeCollection.releaseShapes();
            this.localShapeCollection.addShape(this.v);
            this._mdf = true;
            this.paths = this.localShapeCollection;
        }
    }

    function processEffectsSequence() {
        if (this.elem.globalData.frameId === this.frameId) {
            return;
        } else if (!this.effectsSequence.length) {
            this._mdf = false;
            return;
        }
        if (this.lock) {
            this.setVValue(this.pv);
            return;
        }
        this.lock = true;
        this._mdf = false;
        var finalValue = this.kf ? this.pv : this.data.ks ? this.data.ks.k : this.data.pt.k;
        var i, len = this.effectsSequence.length;
        for(i = 0; i < len; i += 1) {
            finalValue = this.effectsSequence[i](finalValue);
        }
        this.setVValue(finalValue);
        this.lock = false;
        this.frameId = this.elem.globalData.frameId;
    };

    function ShapeProperty(elem, data, type){
        this.propType = 'shape';
        this.comp = elem.comp;
        this.container = elem;
        this.elem = elem;
        this.data = data;
        this.k = false;
        this.kf = false;
        this._mdf = false;
        var pathData = type === 3 ? data.pt.k : data.ks.k;
        this.v = shape_pool.clone(pathData);
        this.pv = shape_pool.clone(this.v);
        this.localShapeCollection = shapeCollection_pool.newShapeCollection();
        this.paths = this.localShapeCollection;
        this.paths.addShape(this.v);
        this.reset = resetShape;
        this.effectsSequence = [];
    }

    function addEffect(effectFunction) {
        this.effectsSequence.push(effectFunction);
        this.container.addDynamicProperty(this);
    }

    ShapeProperty.prototype.interpolateShape = interpolateShape;
    ShapeProperty.prototype.getValue = processEffectsSequence;
    ShapeProperty.prototype.setVValue = setVValue;
    ShapeProperty.prototype.addEffect = addEffect;

    function KeyframedShapeProperty(elem,data,type){
        this.propType = 'shape';
        this.comp = elem.comp;
        this.elem = elem;
        this.container = elem;
        this.offsetTime = elem.data.st;
        this.keyframes = type === 3 ? data.pt.k : data.ks.k;
        this.k = true;
        this.kf = true;
        var i, len = this.keyframes[0].s[0].i.length;
        var jLen = this.keyframes[0].s[0].i[0].length;
        this.v = shape_pool.newElement();
        this.v.setPathData(this.keyframes[0].s[0].c, len);
        this.pv = shape_pool.clone(this.v);
        this.localShapeCollection = shapeCollection_pool.newShapeCollection();
        this.paths = this.localShapeCollection;
        this.paths.addShape(this.v);
        this.lastFrame = initFrame;
        this.reset = resetShape;
        this._caching = {lastFrame: initFrame, lastIndex: 0};
        this.effectsSequence = [interpolateShapeCurrentTime.bind(this)];
    }
    KeyframedShapeProperty.prototype.getValue = processEffectsSequence;
    KeyframedShapeProperty.prototype.interpolateShape = interpolateShape;
    KeyframedShapeProperty.prototype.setVValue = setVValue;
    KeyframedShapeProperty.prototype.addEffect = addEffect;

    var EllShapeProperty = (function(){

        var cPoint = roundCorner;

        function EllShapeProperty(elem,data) {
            /*this.v = {
                v: createSizedArray(4),
                i: createSizedArray(4),
                o: createSizedArray(4),
                c: true
            };*/
            this.v = shape_pool.newElement();
            this.v.setPathData(true, 4);
            this.localShapeCollection = shapeCollection_pool.newShapeCollection();
            this.paths = this.localShapeCollection;
            this.localShapeCollection.addShape(this.v);
            this.d = data.d;
            this.elem = elem;
            this.comp = elem.comp;
            this.frameId = -1;
            this.initDynamicPropertyContainer(elem);
            this.p = PropertyFactory.getProp(elem,data.p,1,0,this);
            this.s = PropertyFactory.getProp(elem,data.s,1,0,this);
            if(this.dynamicProperties.length){
                this.k = true;
            }else{
                this.k = false;
                this.convertEllToPath();
            }
        };

        EllShapeProperty.prototype = {
            reset: resetShape,
            getValue: function (){
                if(this.elem.globalData.frameId === this.frameId){
                    return;
                }
                this.frameId = this.elem.globalData.frameId;
                this.iterateDynamicProperties();

                if(this._mdf){
                    this.convertEllToPath();
                }
            },
            convertEllToPath: function() {
                var p0 = this.p.v[0], p1 = this.p.v[1], s0 = this.s.v[0]/2, s1 = this.s.v[1]/2;
                var _cw = this.d !== 3;
                var _v = this.v;
                _v.v[0][0] = p0;
                _v.v[0][1] = p1 - s1;
                _v.v[1][0] = _cw ? p0 + s0 : p0 - s0;
                _v.v[1][1] = p1;
                _v.v[2][0] = p0;
                _v.v[2][1] = p1 + s1;
                _v.v[3][0] = _cw ? p0 - s0 : p0 + s0;
                _v.v[3][1] = p1;
                _v.i[0][0] = _cw ? p0 - s0 * cPoint : p0 + s0 * cPoint;
                _v.i[0][1] = p1 - s1;
                _v.i[1][0] = _cw ? p0 + s0 : p0 - s0;
                _v.i[1][1] = p1 - s1 * cPoint;
                _v.i[2][0] = _cw ? p0 + s0 * cPoint : p0 - s0 * cPoint;
                _v.i[2][1] = p1 + s1;
                _v.i[3][0] = _cw ? p0 - s0 : p0 + s0;
                _v.i[3][1] = p1 + s1 * cPoint;
                _v.o[0][0] = _cw ? p0 + s0 * cPoint : p0 - s0 * cPoint;
                _v.o[0][1] = p1 - s1;
                _v.o[1][0] = _cw ? p0 + s0 : p0 - s0;
                _v.o[1][1] = p1 + s1 * cPoint;
                _v.o[2][0] = _cw ? p0 - s0 * cPoint : p0 + s0 * cPoint;
                _v.o[2][1] = p1 + s1;
                _v.o[3][0] = _cw ? p0 - s0 : p0 + s0;
                _v.o[3][1] = p1 - s1 * cPoint;
            }
        }

        extendPrototype([DynamicPropertyContainer], EllShapeProperty);

        return EllShapeProperty;
    }());

    var StarShapeProperty = (function() {

        function StarShapeProperty(elem,data) {
            this.v = shape_pool.newElement();
            this.v.setPathData(true, 0);
            this.elem = elem;
            this.comp = elem.comp;
            this.data = data;
            this.frameId = -1;
            this.d = data.d;
            this.initDynamicPropertyContainer(elem);
            if(data.sy === 1){
                this.ir = PropertyFactory.getProp(elem,data.ir,0,0,this);
                this.is = PropertyFactory.getProp(elem,data.is,0,0.01,this);
                this.convertToPath = this.convertStarToPath;
            } else {
                this.convertToPath = this.convertPolygonToPath;
            }
            this.pt = PropertyFactory.getProp(elem,data.pt,0,0,this);
            this.p = PropertyFactory.getProp(elem,data.p,1,0,this);
            this.r = PropertyFactory.getProp(elem,data.r,0,degToRads,this);
            this.or = PropertyFactory.getProp(elem,data.or,0,0,this);
            this.os = PropertyFactory.getProp(elem,data.os,0,0.01,this);
            this.localShapeCollection = shapeCollection_pool.newShapeCollection();
            this.localShapeCollection.addShape(this.v);
            this.paths = this.localShapeCollection;
            if(this.dynamicProperties.length){
                this.k = true;
            }else{
                this.k = false;
                this.convertToPath();
            }
        };

        StarShapeProperty.prototype = {
            reset: resetShape,
            getValue: function() {
                if(this.elem.globalData.frameId === this.frameId){
                    return;
                }
                this.frameId = this.elem.globalData.frameId;
                this.iterateDynamicProperties();
                if(this._mdf){
                    this.convertToPath();
                }
            },
            convertStarToPath: function() {
                var numPts = Math.floor(this.pt.v)*2;
                var angle = Math.PI*2/numPts;
                /*this.v.v.length = numPts;
                this.v.i.length = numPts;
                this.v.o.length = numPts;*/
                var longFlag = true;
                var longRad = this.or.v;
                var shortRad = this.ir.v;
                var longRound = this.os.v;
                var shortRound = this.is.v;
                var longPerimSegment = 2*Math.PI*longRad/(numPts*2);
                var shortPerimSegment = 2*Math.PI*shortRad/(numPts*2);
                var i, rad,roundness,perimSegment, currentAng = -Math.PI/ 2;
                currentAng += this.r.v;
                var dir = this.data.d === 3 ? -1 : 1;
                this.v._length = 0;
                for(i=0;i<numPts;i+=1){
                    rad = longFlag ? longRad : shortRad;
                    roundness = longFlag ? longRound : shortRound;
                    perimSegment = longFlag ? longPerimSegment : shortPerimSegment;
                    var x = rad * Math.cos(currentAng);
                    var y = rad * Math.sin(currentAng);
                    var ox = x === 0 && y === 0 ? 0 : y/Math.sqrt(x*x + y*y);
                    var oy = x === 0 && y === 0 ? 0 : -x/Math.sqrt(x*x + y*y);
                    x +=  + this.p.v[0];
                    y +=  + this.p.v[1];
                    this.v.setTripleAt(x,y,x-ox*perimSegment*roundness*dir,y-oy*perimSegment*roundness*dir,x+ox*perimSegment*roundness*dir,y+oy*perimSegment*roundness*dir, i, true);

                    /*this.v.v[i] = [x,y];
                    this.v.i[i] = [x+ox*perimSegment*roundness*dir,y+oy*perimSegment*roundness*dir];
                    this.v.o[i] = [x-ox*perimSegment*roundness*dir,y-oy*perimSegment*roundness*dir];
                    this.v._length = numPts;*/
                    longFlag = !longFlag;
                    currentAng += angle*dir;
                }
            },
            convertPolygonToPath: function() {
                var numPts = Math.floor(this.pt.v);
                var angle = Math.PI*2/numPts;
                var rad = this.or.v;
                var roundness = this.os.v;
                var perimSegment = 2*Math.PI*rad/(numPts*4);
                var i, currentAng = -Math.PI/ 2;
                var dir = this.data.d === 3 ? -1 : 1;
                currentAng += this.r.v;
                this.v._length = 0;
                for(i=0;i<numPts;i+=1){
                    var x = rad * Math.cos(currentAng);
                    var y = rad * Math.sin(currentAng);
                    var ox = x === 0 && y === 0 ? 0 : y/Math.sqrt(x*x + y*y);
                    var oy = x === 0 && y === 0 ? 0 : -x/Math.sqrt(x*x + y*y);
                    x +=  + this.p.v[0];
                    y +=  + this.p.v[1];
                    this.v.setTripleAt(x,y,x-ox*perimSegment*roundness*dir,y-oy*perimSegment*roundness*dir,x+ox*perimSegment*roundness*dir,y+oy*perimSegment*roundness*dir, i, true);
                    currentAng += angle*dir;
                }
                this.paths.length = 0;
                this.paths[0] = this.v;
            }

        }
        extendPrototype([DynamicPropertyContainer], StarShapeProperty);

        return StarShapeProperty;
    }());

    var RectShapeProperty = (function() {

         function RectShapeProperty(elem,data) {
            this.v = shape_pool.newElement();
            this.v.c = true;
            this.localShapeCollection = shapeCollection_pool.newShapeCollection();
            this.localShapeCollection.addShape(this.v);
            this.paths = this.localShapeCollection;
            this.elem = elem;
            this.comp = elem.comp;
            this.frameId = -1;
            this.d = data.d;
            this.initDynamicPropertyContainer(elem);
            this.p = PropertyFactory.getProp(elem,data.p,1,0,this);
            this.s = PropertyFactory.getProp(elem,data.s,1,0,this);
            this.r = PropertyFactory.getProp(elem,data.r,0,0,this);
            if(this.dynamicProperties.length){
                this.k = true;
            }else{
                this.k = false;
                this.convertRectToPath();
            }
        };

        RectShapeProperty.prototype = {
            convertRectToPath: function (){
                var p0 = this.p.v[0], p1 = this.p.v[1], v0 = this.s.v[0]/2, v1 = this.s.v[1]/2;
                var round = bm_min(v0,v1,this.r.v);
                var cPoint = round*(1-roundCorner);
                this.v._length = 0;

                if(this.d === 2 || this.d === 1) {
                    this.v.setTripleAt(p0+v0, p1-v1+round,p0+v0, p1-v1+round,p0+v0,p1-v1+cPoint,0, true);
                    this.v.setTripleAt(p0+v0, p1+v1-round,p0+v0, p1+v1-cPoint,p0+v0, p1+v1-round,1, true);
                    if(round!== 0){
                        this.v.setTripleAt(p0+v0-round, p1+v1,p0+v0-round,p1+v1,p0+v0-cPoint,p1+v1,2, true);
                        this.v.setTripleAt(p0-v0+round,p1+v1,p0-v0+cPoint,p1+v1,p0-v0+round,p1+v1,3, true);
                        this.v.setTripleAt(p0-v0,p1+v1-round,p0-v0,p1+v1-round,p0-v0,p1+v1-cPoint,4, true);
                        this.v.setTripleAt(p0-v0,p1-v1+round,p0-v0,p1-v1+cPoint,p0-v0,p1-v1+round,5, true);
                        this.v.setTripleAt(p0-v0+round,p1-v1,p0-v0+round,p1-v1,p0-v0+cPoint,p1-v1,6, true);
                        this.v.setTripleAt(p0+v0-round,p1-v1,p0+v0-cPoint,p1-v1,p0+v0-round,p1-v1,7, true);
                    } else {
                        this.v.setTripleAt(p0-v0,p1+v1,p0-v0+cPoint,p1+v1,p0-v0,p1+v1,2);
                        this.v.setTripleAt(p0-v0,p1-v1,p0-v0,p1-v1+cPoint,p0-v0,p1-v1,3);
                    }
                }else{
                    this.v.setTripleAt(p0+v0,p1-v1+round,p0+v0,p1-v1+cPoint,p0+v0,p1-v1+round,0, true);
                    if(round!== 0){
                        this.v.setTripleAt(p0+v0-round,p1-v1,p0+v0-round,p1-v1,p0+v0-cPoint,p1-v1,1, true);
                        this.v.setTripleAt(p0-v0+round,p1-v1,p0-v0+cPoint,p1-v1,p0-v0+round,p1-v1,2, true);
                        this.v.setTripleAt(p0-v0,p1-v1+round,p0-v0,p1-v1+round,p0-v0,p1-v1+cPoint,3, true);
                        this.v.setTripleAt(p0-v0,p1+v1-round,p0-v0,p1+v1-cPoint,p0-v0,p1+v1-round,4, true);
                        this.v.setTripleAt(p0-v0+round,p1+v1,p0-v0+round,p1+v1,p0-v0+cPoint,p1+v1,5, true);
                        this.v.setTripleAt(p0+v0-round,p1+v1,p0+v0-cPoint,p1+v1,p0+v0-round,p1+v1,6, true);
                        this.v.setTripleAt(p0+v0,p1+v1-round,p0+v0,p1+v1-round,p0+v0,p1+v1-cPoint,7, true);
                    } else {
                        this.v.setTripleAt(p0-v0,p1-v1,p0-v0+cPoint,p1-v1,p0-v0,p1-v1,1, true);
                        this.v.setTripleAt(p0-v0,p1+v1,p0-v0,p1+v1-cPoint,p0-v0,p1+v1,2, true);
                        this.v.setTripleAt(p0+v0,p1+v1,p0+v0-cPoint,p1+v1,p0+v0,p1+v1,3, true);

                    }
                }
            },
            getValue: function(frameNum){
                if(this.elem.globalData.frameId === this.frameId){
                    return;
                }
                this.frameId = this.elem.globalData.frameId;
                this.iterateDynamicProperties();
                if(this._mdf){
                    this.convertRectToPath();
                }

            },
            reset: resetShape
        }
        extendPrototype([DynamicPropertyContainer], RectShapeProperty);

        return RectShapeProperty;
    }());

    function getShapeProp(elem,data,type){
        var prop;
        if(type === 3 || type === 4){
            var dataProp = type === 3 ? data.pt : data.ks;
            var keys = dataProp.k;
            if(keys.length){
                prop = new KeyframedShapeProperty(elem, data, type);
            }else{
                prop = new ShapeProperty(elem, data, type);
            }
        }else if(type === 5){
            prop = new RectShapeProperty(elem, data);
        }else if(type === 6){
            prop = new EllShapeProperty(elem, data);
        }else if(type === 7){
            prop = new StarShapeProperty(elem, data);
        }
        if(prop.k){
            elem.addDynamicProperty(prop);
        }
        return prop;
    }

    function getConstructorFunction() {
        return ShapeProperty;
    }

    function getKeyframedConstructorFunction() {
        return KeyframedShapeProperty;
    }

    var ob = {};
    ob.getShapeProp = getShapeProp;
    ob.getConstructorFunction = getConstructorFunction;
    ob.getKeyframedConstructorFunction = getKeyframedConstructorFunction;
    return ob;
}());
var ShapeModifiers = (function(){
    var ob = {};
    var modifiers = {};
    ob.registerModifier = registerModifier;
    ob.getModifier = getModifier;

    function registerModifier(nm,factory){
        if(!modifiers[nm]){
            modifiers[nm] = factory;
        }
    }

    function getModifier(nm,elem, data){
        return new modifiers[nm](elem, data);
    }

    return ob;
}());

function ShapeModifier(){}
ShapeModifier.prototype.initModifierProperties = function(){};
ShapeModifier.prototype.addShapeToModifier = function(){};
ShapeModifier.prototype.addShape = function(data){
    if (!this.closed) {
        // Adding shape to dynamic properties. It covers the case where a shape has no effects applied, to reset it's _mdf state on every tick.
        data.sh.container.addDynamicProperty(data.sh);
        var shapeData = {shape:data.sh, data: data, localShapeCollection:shapeCollection_pool.newShapeCollection()};
        this.shapes.push(shapeData);
        this.addShapeToModifier(shapeData);
        if (this._isAnimated) {
            data.setAsAnimated();
        }
    }
};
ShapeModifier.prototype.init = function(elem,data){
    this.shapes = [];
    this.elem = elem;
    this.initDynamicPropertyContainer(elem);
    this.initModifierProperties(elem,data);
    this.frameId = initialDefaultFrame;
    this.closed = false;
    this.k = false;
    if(this.dynamicProperties.length){
        this.k = true;
    }else{
        this.getValue(true);
    }
};
ShapeModifier.prototype.processKeys = function(){
    if(this.elem.globalData.frameId === this.frameId){
        return;
    }
    this.frameId = this.elem.globalData.frameId;
    this.iterateDynamicProperties();
};

extendPrototype([DynamicPropertyContainer], ShapeModifier);
function TrimModifier(){
}
extendPrototype([ShapeModifier], TrimModifier);
TrimModifier.prototype.initModifierProperties = function(elem, data) {
    this.s = PropertyFactory.getProp(elem, data.s, 0, 0.01, this);
    this.e = PropertyFactory.getProp(elem, data.e, 0, 0.01, this);
    this.o = PropertyFactory.getProp(elem, data.o, 0, 0, this);
    this.sValue = 0;
    this.eValue = 0;
    this.getValue = this.processKeys;
    this.m = data.m;
    this._isAnimated = !!this.s.effectsSequence.length || !!this.e.effectsSequence.length || !!this.o.effectsSequence.length;
};

TrimModifier.prototype.addShapeToModifier = function(shapeData){
    shapeData.pathsData = [];
};

TrimModifier.prototype.calculateShapeEdges = function(s, e, shapeLength, addedLength, totalModifierLength) {
    var segments = [];
    if (e <= 1) {
        segments.push({
            s: s,
            e: e
        });
    } else if (s >= 1) {
        segments.push({
            s: s - 1,
            e: e - 1
        });
    } else {
        segments.push({
            s: s,
            e: 1
        });
        segments.push({
            s: 0,
            e: e - 1
        });
    }
    var shapeSegments = [];
    var i, len = segments.length, segmentOb;
    for (i = 0; i < len; i += 1) {
        segmentOb = segments[i];
        if (segmentOb.e * totalModifierLength < addedLength || segmentOb.s * totalModifierLength > addedLength + shapeLength) {
            
        } else {
            var shapeS, shapeE;
            if (segmentOb.s * totalModifierLength <= addedLength) {
                shapeS = 0;
            } else {
                shapeS = (segmentOb.s * totalModifierLength - addedLength) / shapeLength;
            }
            if(segmentOb.e * totalModifierLength >= addedLength + shapeLength) {
                shapeE = 1;
            } else {
                shapeE = ((segmentOb.e * totalModifierLength - addedLength) / shapeLength);
            }
            shapeSegments.push([shapeS, shapeE]);
        }
    }
    if (!shapeSegments.length) {
        shapeSegments.push([0, 0]);
    }
    return shapeSegments;
};

TrimModifier.prototype.releasePathsData = function(pathsData) {
    var i, len = pathsData.length;
    for (i = 0; i < len; i += 1) {
        segments_length_pool.release(pathsData[i]);
    }
    pathsData.length = 0;
    return pathsData;
};

TrimModifier.prototype.processShapes = function(_isFirstFrame) {
    var s, e;
    if (this._mdf || _isFirstFrame) {
        var o = (this.o.v % 360) / 360;
        if (o < 0) {
            o += 1;
        }
        s = (this.s.v > 1 ? 1 : this.s.v < 0 ? 0 : this.s.v) + o;
        e = (this.e.v > 1 ? 1 : this.e.v < 0 ? 0 : this.e.v) + o;
        if (s === e) {

        }
        if (s > e) {
            var _s = s;
            s = e;
            e = _s;
        }
        s = Math.round(s * 10000) * 0.0001;
        e = Math.round(e * 10000) * 0.0001;
        this.sValue = s;
        this.eValue = e;
    } else {
        s = this.sValue;
        e = this.eValue;
    }
    var shapePaths;
    var i, len = this.shapes.length, j, jLen;
    var pathsData, pathData, totalShapeLength, totalModifierLength = 0;

    if (e === s) {
        for (i = 0; i < len; i += 1) {
            this.shapes[i].localShapeCollection.releaseShapes();
            this.shapes[i].shape._mdf = true;
            this.shapes[i].shape.paths = this.shapes[i].localShapeCollection;
        }
    } else if (!((e === 1 && s === 0) || (e===0 && s === 1))){
        var segments = [], shapeData, localShapeCollection;
        for (i = 0; i < len; i += 1) {
            shapeData = this.shapes[i];
            // if shape hasn't changed and trim properties haven't changed, cached previous path can be used
            if (!shapeData.shape._mdf && !this._mdf && !_isFirstFrame && this.m !== 2) {
                shapeData.shape.paths = shapeData.localShapeCollection;
            } else {
                shapePaths = shapeData.shape.paths;
                jLen = shapePaths._length;
                totalShapeLength = 0;
                if (!shapeData.shape._mdf && shapeData.pathsData.length) {
                    totalShapeLength = shapeData.totalShapeLength;
                } else {
                    pathsData = this.releasePathsData(shapeData.pathsData);
                    for (j = 0; j < jLen; j += 1) {
                        pathData = bez.getSegmentsLength(shapePaths.shapes[j]);
                        pathsData.push(pathData);
                        totalShapeLength += pathData.totalLength;
                    }
                    shapeData.totalShapeLength = totalShapeLength;
                    shapeData.pathsData = pathsData;
                }

                totalModifierLength += totalShapeLength;
                shapeData.shape._mdf = true;
            }
        }
        var shapeS = s, shapeE = e, addedLength = 0, edges;
        for (i = len - 1; i >= 0; i -= 1) {
            shapeData = this.shapes[i];
            if (shapeData.shape._mdf) {
                localShapeCollection = shapeData.localShapeCollection;
                localShapeCollection.releaseShapes();
                //if m === 2 means paths are trimmed individually so edges need to be found for this specific shape relative to whoel group
                if (this.m === 2 && len > 1) {
                    edges = this.calculateShapeEdges(s, e, shapeData.totalShapeLength, addedLength, totalModifierLength);
                    addedLength += shapeData.totalShapeLength;
                } else {
                    edges = [[shapeS, shapeE]];
                }
                jLen = edges.length;
                for (j = 0; j < jLen; j += 1) {
                    shapeS = edges[j][0];
                    shapeE = edges[j][1];
                    segments.length = 0;
                    if (shapeE <= 1) {
                        segments.push({
                            s:shapeData.totalShapeLength * shapeS,
                            e:shapeData.totalShapeLength * shapeE
                        });
                    } else if (shapeS >= 1) {
                        segments.push({
                            s:shapeData.totalShapeLength * (shapeS - 1),
                            e:shapeData.totalShapeLength * (shapeE - 1)
                        });
                    } else {
                        segments.push({
                            s:shapeData.totalShapeLength * shapeS,
                            e:shapeData.totalShapeLength
                        });
                        segments.push({
                            s:0,
                            e:shapeData.totalShapeLength * (shapeE - 1)
                        });
                    }
                    var newShapesData = this.addShapes(shapeData,segments[0]);
                    if (segments[0].s !== segments[0].e) {
                        if (segments.length > 1) {
                            var lastShapeInCollection = shapeData.shape.paths.shapes[shapeData.shape.paths._length - 1];
                            if (lastShapeInCollection.c) {
                                var lastShape = newShapesData.pop();
                                this.addPaths(newShapesData, localShapeCollection);
                                newShapesData = this.addShapes(shapeData, segments[1], lastShape);
                            } else {
                                this.addPaths(newShapesData, localShapeCollection);
                                newShapesData = this.addShapes(shapeData, segments[1]);
                            }
                        } 
                        this.addPaths(newShapesData, localShapeCollection);
                    }
                    
                }
                shapeData.shape.paths = localShapeCollection;
            }
        }
    } else if (this._mdf) {
        for (i = 0; i < len; i += 1) {
            //Releasign Trim Cached paths data when no trim applied in case shapes are modified inbetween.
            //Don't remove this even if it's losing cached info.
            this.shapes[i].pathsData.length = 0;
            this.shapes[i].shape._mdf = true;
        }
    }
};

TrimModifier.prototype.addPaths = function(newPaths, localShapeCollection) {
    var i, len = newPaths.length;
    for (i = 0; i < len; i += 1) {
        localShapeCollection.addShape(newPaths[i]);
    }
};

TrimModifier.prototype.addSegment = function(pt1, pt2, pt3, pt4, shapePath, pos, newShape) {
    shapePath.setXYAt(pt2[0], pt2[1], 'o', pos);
    shapePath.setXYAt(pt3[0], pt3[1], 'i', pos + 1);
    if(newShape){
        shapePath.setXYAt(pt1[0], pt1[1], 'v', pos);
    }
    shapePath.setXYAt(pt4[0], pt4[1], 'v', pos + 1);
};

TrimModifier.prototype.addSegmentFromArray = function(points, shapePath, pos, newShape) {
    shapePath.setXYAt(points[1], points[5], 'o', pos);
    shapePath.setXYAt(points[2], points[6], 'i', pos + 1);
    if(newShape){
        shapePath.setXYAt(points[0], points[4], 'v', pos);
    }
    shapePath.setXYAt(points[3], points[7], 'v', pos + 1);
};

TrimModifier.prototype.addShapes = function(shapeData, shapeSegment, shapePath) {
    var pathsData = shapeData.pathsData;
    var shapePaths = shapeData.shape.paths.shapes;
    var i, len = shapeData.shape.paths._length, j, jLen;
    var addedLength = 0;
    var currentLengthData,segmentCount;
    var lengths;
    var segment;
    var shapes = [];
    var initPos;
    var newShape = true;
    if (!shapePath) {
        shapePath = shape_pool.newElement();
        segmentCount = 0;
        initPos = 0;
    } else {
        segmentCount = shapePath._length;
        initPos = shapePath._length;
    }
    shapes.push(shapePath);
    for (i = 0; i < len; i += 1) {
        lengths = pathsData[i].lengths;
        shapePath.c = shapePaths[i].c;
        jLen = shapePaths[i].c ? lengths.length : lengths.length + 1;
        for (j = 1; j < jLen; j +=1) {
            currentLengthData = lengths[j-1];
            if (addedLength + currentLengthData.addedLength < shapeSegment.s) {
                addedLength += currentLengthData.addedLength;
                shapePath.c = false;
            } else if(addedLength > shapeSegment.e) {
                shapePath.c = false;
                break;
            } else {
                if (shapeSegment.s <= addedLength && shapeSegment.e >= addedLength + currentLengthData.addedLength) {
                    this.addSegment(shapePaths[i].v[j - 1], shapePaths[i].o[j - 1], shapePaths[i].i[j], shapePaths[i].v[j], shapePath, segmentCount, newShape);
                    newShape = false;
                } else {
                    segment = bez.getNewSegment(shapePaths[i].v[j - 1], shapePaths[i].v[j], shapePaths[i].o[j - 1], shapePaths[i].i[j], (shapeSegment.s - addedLength)/currentLengthData.addedLength,(shapeSegment.e - addedLength)/currentLengthData.addedLength, lengths[j-1]);
                    this.addSegmentFromArray(segment, shapePath, segmentCount, newShape);
                    // this.addSegment(segment.pt1, segment.pt3, segment.pt4, segment.pt2, shapePath, segmentCount, newShape);
                    newShape = false;
                    shapePath.c = false;
                }
                addedLength += currentLengthData.addedLength;
                segmentCount += 1;
            }
        }
        if (shapePaths[i].c && lengths.length) {
            currentLengthData = lengths[j - 1];
            if (addedLength <= shapeSegment.e) {
                var segmentLength = lengths[j - 1].addedLength;
                if (shapeSegment.s <= addedLength && shapeSegment.e >= addedLength + segmentLength) {
                    this.addSegment(shapePaths[i].v[j - 1], shapePaths[i].o[j - 1], shapePaths[i].i[0], shapePaths[i].v[0], shapePath, segmentCount, newShape);
                    newShape = false;
                } else {
                    segment = bez.getNewSegment(shapePaths[i].v[j - 1], shapePaths[i].v[0], shapePaths[i].o[j - 1], shapePaths[i].i[0], (shapeSegment.s - addedLength) / segmentLength, (shapeSegment.e - addedLength) / segmentLength, lengths[j - 1]);
                    this.addSegmentFromArray(segment, shapePath, segmentCount, newShape);
                    // this.addSegment(segment.pt1, segment.pt3, segment.pt4, segment.pt2, shapePath, segmentCount, newShape);
                    newShape = false;
                    shapePath.c = false;
                }
            } else {
                shapePath.c = false;
            }
            addedLength += currentLengthData.addedLength;
            segmentCount += 1;
        }
        if (shapePath._length) {
            shapePath.setXYAt(shapePath.v[initPos][0], shapePath.v[initPos][1], 'i', initPos);
            shapePath.setXYAt(shapePath.v[shapePath._length - 1][0], shapePath.v[shapePath._length - 1][1],'o', shapePath._length - 1);
        }
        if (addedLength > shapeSegment.e) {
            break;
        }
        if (i < len - 1) {
            shapePath = shape_pool.newElement();
            newShape = true;
            shapes.push(shapePath);
            segmentCount = 0;
        }
    }
    return shapes;
};


ShapeModifiers.registerModifier('tm', TrimModifier);
function RoundCornersModifier(){}
extendPrototype([ShapeModifier],RoundCornersModifier);
RoundCornersModifier.prototype.initModifierProperties = function(elem,data){
    this.getValue = this.processKeys;
    this.rd = PropertyFactory.getProp(elem,data.r,0,null,this);
    this._isAnimated = !!this.rd.effectsSequence.length;
};

RoundCornersModifier.prototype.processPath = function(path, round){
    var cloned_path = shape_pool.newElement();
    cloned_path.c = path.c;
    var i, len = path._length;
    var currentV,currentI,currentO,closerV, newV,newO,newI,distance,newPosPerc,index = 0;
    var vX,vY,oX,oY,iX,iY;
    for(i=0;i<len;i+=1){
        currentV = path.v[i];
        currentO = path.o[i];
        currentI = path.i[i];
        if(currentV[0]===currentO[0] && currentV[1]===currentO[1] && currentV[0]===currentI[0] && currentV[1]===currentI[1]){
            if((i===0 || i === len - 1) && !path.c){
                cloned_path.setTripleAt(currentV[0],currentV[1],currentO[0],currentO[1],currentI[0],currentI[1],index);
                /*cloned_path.v[index] = currentV;
                cloned_path.o[index] = currentO;
                cloned_path.i[index] = currentI;*/
                index += 1;
            } else {
                if(i===0){
                    closerV = path.v[len-1];
                } else {
                    closerV = path.v[i-1];
                }
                distance = Math.sqrt(Math.pow(currentV[0]-closerV[0],2)+Math.pow(currentV[1]-closerV[1],2));
                newPosPerc = distance ? Math.min(distance/2,round)/distance : 0;
                vX = iX = currentV[0]+(closerV[0]-currentV[0])*newPosPerc;
                vY = iY = currentV[1]-(currentV[1]-closerV[1])*newPosPerc;
                oX = vX-(vX-currentV[0])*roundCorner;
                oY = vY-(vY-currentV[1])*roundCorner;
                cloned_path.setTripleAt(vX,vY,oX,oY,iX,iY,index);
                index += 1;

                if(i === len - 1){
                    closerV = path.v[0];
                } else {
                    closerV = path.v[i+1];
                }
                distance = Math.sqrt(Math.pow(currentV[0]-closerV[0],2)+Math.pow(currentV[1]-closerV[1],2));
                newPosPerc = distance ? Math.min(distance/2,round)/distance : 0;
                vX = oX = currentV[0]+(closerV[0]-currentV[0])*newPosPerc;
                vY = oY = currentV[1]+(closerV[1]-currentV[1])*newPosPerc;
                iX = vX-(vX-currentV[0])*roundCorner;
                iY = vY-(vY-currentV[1])*roundCorner;
                cloned_path.setTripleAt(vX,vY,oX,oY,iX,iY,index);
                index += 1;
            }
        } else {
            cloned_path.setTripleAt(path.v[i][0],path.v[i][1],path.o[i][0],path.o[i][1],path.i[i][0],path.i[i][1],index);
            index += 1;
        }
    }
    return cloned_path;
};

RoundCornersModifier.prototype.processShapes = function(_isFirstFrame){
    var shapePaths;
    var i, len = this.shapes.length;
    var j, jLen;
    var rd = this.rd.v;

    if(rd !== 0){
        var shapeData, newPaths, localShapeCollection;
        for(i=0;i<len;i+=1){
            shapeData = this.shapes[i];
            newPaths = shapeData.shape.paths;
            localShapeCollection = shapeData.localShapeCollection;
            if(!(!shapeData.shape._mdf && !this._mdf && !_isFirstFrame)){
                localShapeCollection.releaseShapes();
                shapeData.shape._mdf = true;
                shapePaths = shapeData.shape.paths.shapes;
                jLen = shapeData.shape.paths._length;
                for(j=0;j<jLen;j+=1){
                    localShapeCollection.addShape(this.processPath(shapePaths[j],rd));
                }
            }
            shapeData.shape.paths = shapeData.localShapeCollection;
        }

    }
    if(!this.dynamicProperties.length){
        this._mdf = false;
    }
};

ShapeModifiers.registerModifier('rd',RoundCornersModifier);
function RepeaterModifier(){}
extendPrototype([ShapeModifier], RepeaterModifier);

RepeaterModifier.prototype.initModifierProperties = function(elem,data){
    this.getValue = this.processKeys;
    this.c = PropertyFactory.getProp(elem,data.c,0,null,this);
    this.o = PropertyFactory.getProp(elem,data.o,0,null,this);
    this.tr = TransformPropertyFactory.getTransformProperty(elem,data.tr,this);
    this.so = PropertyFactory.getProp(elem,data.tr.so,0,0.01,this);
    this.eo = PropertyFactory.getProp(elem,data.tr.eo,0,0.01,this);
    this.data = data;
    if(!this.dynamicProperties.length){
        this.getValue(true);
    }
    this._isAnimated = !!this.dynamicProperties.length;
    this.pMatrix = new Matrix();
    this.rMatrix = new Matrix();
    this.sMatrix = new Matrix();
    this.tMatrix = new Matrix();
    this.matrix = new Matrix();
};

RepeaterModifier.prototype.applyTransforms = function(pMatrix, rMatrix, sMatrix, transform, perc, inv){
    var dir = inv ? -1 : 1;
    var scaleX = transform.s.v[0] + (1 - transform.s.v[0]) * (1 - perc);
    var scaleY = transform.s.v[1] + (1 - transform.s.v[1]) * (1 - perc);
    pMatrix.translate(transform.p.v[0] * dir * perc, transform.p.v[1] * dir * perc, transform.p.v[2]);
    rMatrix.translate(-transform.a.v[0], -transform.a.v[1], transform.a.v[2]);
    rMatrix.rotate(-transform.r.v * dir * perc);
    rMatrix.translate(transform.a.v[0], transform.a.v[1], transform.a.v[2]);
    sMatrix.translate(-transform.a.v[0], -transform.a.v[1], transform.a.v[2]);
    sMatrix.scale(inv ? 1/scaleX : scaleX, inv ? 1/scaleY : scaleY);
    sMatrix.translate(transform.a.v[0], transform.a.v[1], transform.a.v[2]);
};

RepeaterModifier.prototype.init = function(elem, arr, pos, elemsData) {
    this.elem = elem;
    this.arr = arr;
    this.pos = pos;
    this.elemsData = elemsData;
    this._currentCopies = 0;
    this._elements = [];
    this._groups = [];
    this.frameId = -1;
    this.initDynamicPropertyContainer(elem);
    this.initModifierProperties(elem,arr[pos]);
    var cont = 0;
    while(pos>0){
        pos -= 1;
        //this._elements.unshift(arr.splice(pos,1)[0]);
        this._elements.unshift(arr[pos]);
        cont += 1;
    }
    if(this.dynamicProperties.length){
        this.k = true;
    }else{
        this.getValue(true);
    }
};

RepeaterModifier.prototype.resetElements = function(elements){
    var i, len = elements.length;
    for(i = 0; i < len; i += 1) {
        elements[i]._processed = false;
        if(elements[i].ty === 'gr'){
            this.resetElements(elements[i].it);
        }
    }
};

RepeaterModifier.prototype.cloneElements = function(elements){
    var i, len = elements.length;
    var newElements = JSON.parse(JSON.stringify(elements));
    this.resetElements(newElements);
    return newElements;
};

RepeaterModifier.prototype.changeGroupRender = function(elements, renderFlag) {
    var i, len = elements.length;
    for(i = 0; i < len; i += 1) {
        elements[i]._render = renderFlag;
        if(elements[i].ty === 'gr') {
            this.changeGroupRender(elements[i].it, renderFlag);
        }
    }
};

RepeaterModifier.prototype.processShapes = function(_isFirstFrame) {
    var items, itemsTransform, i, dir, cont;
    if(this._mdf || _isFirstFrame){
        var copies = Math.ceil(this.c.v);
        if(this._groups.length < copies){
            while(this._groups.length < copies){
                var group = {
                    it:this.cloneElements(this._elements),
                    ty:'gr'
                };
                group.it.push({"a":{"a":0,"ix":1,"k":[0,0]},"nm":"Transform","o":{"a":0,"ix":7,"k":100},"p":{"a":0,"ix":2,"k":[0,0]},"r":{"a":1,"ix":6,"k":[{s:0,e:0,t:0},{s:0,e:0,t:1}]},"s":{"a":0,"ix":3,"k":[100,100]},"sa":{"a":0,"ix":5,"k":0},"sk":{"a":0,"ix":4,"k":0},"ty":"tr"});
                
                this.arr.splice(0,0,group);
                this._groups.splice(0,0,group);
                this._currentCopies += 1;
            }
            this.elem.reloadShapes();
        }
        cont = 0;
        var renderFlag;
        for(i = 0; i  <= this._groups.length - 1; i += 1){
            renderFlag = cont < copies;
            this._groups[i]._render = renderFlag;
            this.changeGroupRender(this._groups[i].it, renderFlag);
            cont += 1;
        }
        
        this._currentCopies = copies;
        ////

        var offset = this.o.v;
        var offsetModulo = offset%1;
        var roundOffset = offset > 0 ? Math.floor(offset) : Math.ceil(offset);
        var k;
        var tMat = this.tr.v.props;
        var pProps = this.pMatrix.props;
        var rProps = this.rMatrix.props;
        var sProps = this.sMatrix.props;
        this.pMatrix.reset();
        this.rMatrix.reset();
        this.sMatrix.reset();
        this.tMatrix.reset();
        this.matrix.reset();
        var iteration = 0;

        if(offset > 0) {
            while(iteration<roundOffset){
                this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, 1, false);
                iteration += 1;
            }
            if(offsetModulo){
                this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, offsetModulo, false);
                iteration += offsetModulo;
            }
        } else if(offset < 0) {
            while(iteration>roundOffset){
                this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, 1, true);
                iteration -= 1;
            }
            if(offsetModulo){
                this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, - offsetModulo, true);
                iteration -= offsetModulo;
            }
        }
        i = this.data.m === 1 ? 0 : this._currentCopies - 1;
        dir = this.data.m === 1 ? 1 : -1;
        cont = this._currentCopies;
        var j, jLen;
        while(cont){
            items = this.elemsData[i].it;
            itemsTransform = items[items.length - 1].transform.mProps.v.props;
            jLen = itemsTransform.length;
            items[items.length - 1].transform.mProps._mdf = true;
            items[items.length - 1].transform.op._mdf = true;
            items[items.length - 1].transform.op.v = this.so.v + (this.eo.v - this.so.v) * (i / (this._currentCopies - 1));
            if(iteration !== 0){
                if((i !== 0 && dir === 1) || (i !== this._currentCopies - 1 && dir === -1)){
                    this.applyTransforms(this.pMatrix, this.rMatrix, this.sMatrix, this.tr, 1, false);
                }
                this.matrix.transform(rProps[0],rProps[1],rProps[2],rProps[3],rProps[4],rProps[5],rProps[6],rProps[7],rProps[8],rProps[9],rProps[10],rProps[11],rProps[12],rProps[13],rProps[14],rProps[15]);
                this.matrix.transform(sProps[0],sProps[1],sProps[2],sProps[3],sProps[4],sProps[5],sProps[6],sProps[7],sProps[8],sProps[9],sProps[10],sProps[11],sProps[12],sProps[13],sProps[14],sProps[15]);
                this.matrix.transform(pProps[0],pProps[1],pProps[2],pProps[3],pProps[4],pProps[5],pProps[6],pProps[7],pProps[8],pProps[9],pProps[10],pProps[11],pProps[12],pProps[13],pProps[14],pProps[15]);
                
                for(j=0;j<jLen;j+=1) {
                    itemsTransform[j] = this.matrix.props[j];
                }
                this.matrix.reset();
            } else {
                this.matrix.reset();
                for(j=0;j<jLen;j+=1) {
                    itemsTransform[j] = this.matrix.props[j];
                }
            }
            iteration += 1;
            cont -= 1;
            i += dir;
        }
    } else {
        cont = this._currentCopies;
        i = 0;
        dir = 1;
        while(cont){
            items = this.elemsData[i].it;
            itemsTransform = items[items.length - 1].transform.mProps.v.props;
            items[items.length - 1].transform.mProps._mdf = false;
            items[items.length - 1].transform.op._mdf = false;
            cont -= 1;
            i += dir;
        }
    }
};

RepeaterModifier.prototype.addShape = function(){};

ShapeModifiers.registerModifier('rp',RepeaterModifier);
function ShapeCollection(){
	this._length = 0;
	this._maxLength = 4;
	this.shapes = createSizedArray(this._maxLength);
}

ShapeCollection.prototype.addShape = function(shapeData){
	if(this._length === this._maxLength){
		this.shapes = this.shapes.concat(createSizedArray(this._maxLength));
		this._maxLength *= 2;
	}
	this.shapes[this._length] = shapeData;
	this._length += 1;
};

ShapeCollection.prototype.releaseShapes = function(){
	var i;
	for(i = 0; i < this._length; i += 1) {
		shape_pool.release(this.shapes[i]);
	}
	this._length = 0;
};
function DashProperty(elem, data, renderer, container) {
    this.elem = elem;
    this.frameId = -1;
    this.dataProps = createSizedArray(data.length);
    this.renderer = renderer;
    this.k = false;
    this.dashStr = '';
    this.dashArray = createTypedArray('float32',  data.length ? data.length - 1 : 0);
    this.dashoffset = createTypedArray('float32',  1);
    this.initDynamicPropertyContainer(container);
    var i, len = data.length || 0, prop;
    for(i = 0; i < len; i += 1) {
        prop = PropertyFactory.getProp(elem,data[i].v,0, 0, this);
        this.k = prop.k || this.k;
        this.dataProps[i] = {n:data[i].n,p:prop};
    }
    if(!this.k){
        this.getValue(true);
    }
    this._isAnimated = this.k;
}

DashProperty.prototype.getValue = function(forceRender) {
    if(this.elem.globalData.frameId === this.frameId && !forceRender){
        return;
    }
    this.frameId = this.elem.globalData.frameId;
    this.iterateDynamicProperties();
    this._mdf = this._mdf || forceRender;
    if (this._mdf) {
        var i = 0, len = this.dataProps.length;
        if(this.renderer === 'svg') {
            this.dashStr = '';
        }
        for(i=0;i<len;i+=1){
            if(this.dataProps[i].n != 'o'){
                if(this.renderer === 'svg') {
                    this.dashStr += ' ' + this.dataProps[i].p.v;
                }else{
                    this.dashArray[i] = this.dataProps[i].p.v;
                }
            }else{
                this.dashoffset[0] = this.dataProps[i].p.v;
            }
        }
    }
};
extendPrototype([DynamicPropertyContainer], DashProperty);
function GradientProperty(elem,data,container){
    this.data = data;
    this.c = createTypedArray('uint8c', data.p*4);
    var cLength = data.k.k[0].s ? (data.k.k[0].s.length - data.p*4) : data.k.k.length - data.p*4;
    this.o = createTypedArray('float32', cLength);
    this._cmdf = false;
    this._omdf = false;
    this._collapsable = this.checkCollapsable();
    this._hasOpacity = cLength;
    this.initDynamicPropertyContainer(container);
    this.prop = PropertyFactory.getProp(elem,data.k,1,null,this);
    this.k = this.prop.k;
    this.getValue(true);
}

GradientProperty.prototype.comparePoints = function(values, points) {
    var i = 0, len = this.o.length/2, diff;
    while(i < len) {
        diff = Math.abs(values[i*4] - values[points*4 + i*2]);
        if(diff > 0.01){
            return false;
        }
        i += 1;
    }
    return true;
};

GradientProperty.prototype.checkCollapsable = function() {
    if (this.o.length/2 !== this.c.length/4) {
        return false;
    }
    if (this.data.k.k[0].s) {
        var i = 0, len = this.data.k.k.length;
        while (i < len) {
            if (!this.comparePoints(this.data.k.k[i].s, this.data.p)) {
                return false;
            }
            i += 1;
        }
    } else if(!this.comparePoints(this.data.k.k, this.data.p)) {
        return false;
    }
    return true;
};

GradientProperty.prototype.getValue = function(forceRender){
    this.prop.getValue();
    this._mdf = false;
    this._cmdf = false;
    this._omdf = false;
    if(this.prop._mdf || forceRender){
        var i, len = this.data.p*4;
        var mult, val;
        for(i=0;i<len;i+=1){
            mult = i%4 === 0 ? 100 : 255;
            val = Math.round(this.prop.v[i]*mult);
            if(this.c[i] !== val){
                this.c[i] = val;
                this._cmdf = !forceRender;
            }
        }
        if(this.o.length){
            len = this.prop.v.length;
            for(i=this.data.p*4;i<len;i+=1){
                mult = i%2 === 0 ? 100 : 1;
                val = i%2 === 0 ?  Math.round(this.prop.v[i]*100):this.prop.v[i];
                if(this.o[i-this.data.p*4] !== val){
                    this.o[i-this.data.p*4] = val;
                    this._omdf = !forceRender;
                }
            }
        }
        this._mdf = !forceRender;
    }
};

extendPrototype([DynamicPropertyContainer], GradientProperty);
var buildShapeString = function(pathNodes, length, closed, mat) {
	if(length === 0) {
            return '';
        }
        var _o = pathNodes.o;
        var _i = pathNodes.i;
        var _v = pathNodes.v;
        var i, shapeString = " M" + mat.applyToPointStringified(_v[0][0], _v[0][1]);
        for(i = 1; i < length; i += 1) {
            shapeString += " C" + mat.applyToPointStringified(_o[i - 1][0], _o[i - 1][1]) + " " + mat.applyToPointStringified(_i[i][0], _i[i][1]) + " " + mat.applyToPointStringified(_v[i][0], _v[i][1]);
        }
        if (closed && length) {
            shapeString += " C" + mat.applyToPointStringified(_o[i - 1][0], _o[i - 1][1]) + " " + mat.applyToPointStringified(_i[0][0], _i[0][1]) + " " + mat.applyToPointStringified(_v[0][0], _v[0][1]);
            shapeString += 'z';
        }
        return shapeString;
}
var AssetsHolder = (function () {

    // 资源类型
    const AssetType = {
        COMPOSITION: 0,
        IMAGE: 1,
        AUDIO: 2,
        TEXT: 3,
        VIDEO: 4
    };


    /**
     * 解析资源
     * @param {*} assets 
     */
    function parse(assets) {
        let i, len = assets.length;
        for (i = 0; i < len; i++) {
            const element = assets[i];
            switch (element.ty) {
                case AssetType.COMPOSITION:
                    // do nothing
                    break;
                case AssetType.IMAGE:
                    this.imageHolder.push(element);
                    break;
                case AssetType.AUDIO:
                    this.audioHolder.push(element);
                    break;
                case AssetType.TEXT:
                    this.textHolder.push(element);
                    break;
                case AssetType.VIDEO:
                    this.videoHolder.push(element);
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * 获取图片资源
     */
    function imageAssets() {
        return this.imageHolder;
    }

    /**
     * 获取音频资源
     */
    function audioAssets() {
        return this.audioHolder;
    }

    /**
     * 获取文字资源
     */
    function textAssets() {
        return this.textHolder;
    }

    /**
    * 获取视频资源
    */
    function videoAssets() {
        return this.videoHolder;
    }

    /**
    * 销毁资源
    */
    function destroy() {
        this.imageHolder.length = 0;
        this.audioHolder.length = 0;
        this.textHolder.length = 0;
        this.videoHolder.length = 0;
    }
    return function AssetsHolder() {
        this.parse = parse;
        this.imageAssets = imageAssets;
        this.audioAssets = audioAssets;
        this.textAssets = textAssets;
        this.videoAssets = videoAssets;
        this.destroy = destroy;
        this.imageHolder = [];
        this.audioHolder = [];
        this.textHolder = [];
        this.videoHolder = [];
    };
}());
var ImagePreloader = (function () {

    var proxyImage = (function () {
        var canvas = createTag('canvas');
        canvas.width = 1;
        canvas.height = 1;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 1, 1);
        return canvas;
    }())

    function imageLoaded() {
        this.loadedAssets += 1;
        if (this.loadedAssets === this.totalImages) {
            if (this.imagesLoadedCb) {
                this.imagesLoadedCb(null);
            }
        }
    }

    function getAssetsPath(assetData, assetsPath, original_path) {
        var path = '';
        if (assetData.e) {
            path = assetData.p;
        } else if (assetsPath) {
            var imagePath = assetData.p;
            if (imagePath.indexOf('images/') !== -1) {
                imagePath = imagePath.split('/')[1];
            }
            path = assetsPath + imagePath;
        } else {
            path = original_path;
            path += assetData.u ? assetData.u : '';
            path += assetData.p;
        }
        return path;
    }

    function createImageData(assetData) {
        var path = getAssetsPath(assetData, this.assetsPath, this.path);
        var img = createTag('img');
        img.crossOrigin = 'anonymous';
        img.addEventListener('load', this._imageLoaded.bind(this), false);
        img.addEventListener('error', function () {
            ob.img = proxyImage;
            this._imageLoaded();
        }.bind(this), false);
        img.src = path;
        var ob = {
            img: img,
            assetData: assetData
        }
        return ob;
    }

    function loadAssets(assets, cb) {
        this.imagesLoadedCb = cb;
        var i, len = assets.length;
        for (i = 0; i < len; i += 1) {
            if (!assets[i].layers) {
                this.totalImages += 1;
                this.images.push(this._createImageData(assets[i]));
            }
        }
    }


    /**
     * 创建图片二进制数据
     * @param {{图片资源信息}} assetData 
     */
    function createImageBinaryData(assetData) {
        var path = getAssetsPath(assetData, this.assetsPath, this.path);

        var ob = {
            assetData: assetData
        }

        fetch(path).then(response => response.arrayBuffer())
            .then(buffer => {
                ob.img = buffer;
                this._imageLoaded();
            });

        return ob;
    }

    /**
     * 加载图片的二进制数据，即ByteArrry
     * @param {图片资源信息数组} assets 
     * @param {回调函数} cb 
     */
    function loadAssetsBinary(assets, cb) {
        this.imagesLoadedCb = cb;
        var i, len = assets.length;
        for (i = 0; i < len; i += 1) {
            if (!assets[i].layers) {
                this.totalImages += 1;
                this.images.push(this._createImageBinaryData(assets[i]));
            }
        }
    }

    function setPath(path) {
        this.path = path || '';
    }

    function setAssetsPath(path) {
        this.assetsPath = path || '';
    }

    function getImage(assetData) {
        var i = 0, len = this.images.length;
        while (i < len) {
            if (this.images[i].assetData === assetData) {
                return this.images[i].img;
            }
            i += 1;
        }
    }

    function destroy() {
        this.imagesLoadedCb = null;
        this.images.length = 0;
    }

    function loaded() {
        return this.totalImages === this.loadedAssets;
    }

    return function ImagePreloader() {
        this.loadAssets = loadAssets;
        this.loadAssetsBinary = loadAssetsBinary;
        this.setAssetsPath = setAssetsPath;
        this.setPath = setPath;
        this.loaded = loaded;
        this.destroy = destroy;
        this.getImage = getImage;
        this._createImageData = createImageData;
        this._createImageBinaryData = createImageBinaryData;
        this._imageLoaded = imageLoaded;
        this.assetsPath = '';
        this.path = '';
        this.totalImages = 0;
        this.loadedAssets = 0;
        this.imagesLoadedCb = null;
        this.images = [];
    };
}());
var VideoPreloader = (function () {

    /**
     * 视频加载完成，调用回调函数
     */
    function videoLoaded() {
        this.loadedAssets += 1;
        if (this.loadedAssets === this.totalVideos) {
            if (this.videosLoadedCb) {
                this.videosLoadedCb(null);
            }
        }
    }

    /**
     * 获取视频文件路径
     * @param {*} assetData 
     */
    function getAssetsPath(assetData) {
        return assetData.u + assetData.p;
    }

    /**
     * 创建视频素材解码worker
     * @param {{图片资源信息}} assetData 
     */
    function createVideoBinaryData(assetData) {
        var path = getAssetsPath(assetData);
        var _that = this;
        var ob = {
            assetData: assetData
        }
        ob.videoReaderWorker = new Worker('../../ffmpeg/out/VideoReaderWorker.js');

        ob.videoReaderWorker.onmessage = function (e) {
            var data = e.data;
            //console.log(data);
            switch (data.type) {
                case 'init':
                    // video worker初始化成功 ==> 发指令给 woker线程 去加载视频
                    fetch(path).then(response => response.arrayBuffer())
                        .then(buffer => {
                            var req = {
                                type: 'load',
                                args: {
                                    path: path,
                                    frameRate: 25,
                                    buffer: buffer
                                }
                            }
                            ob.videoReaderWorker.postMessage(req, [req.args.buffer]);

                        });
                    break;
                case 'loaded':
                    // woker线程 视频素材加载完成 ==> 发指令给 woker线程 去解码一帧视频帧
                    ob.videoReaderWorker.postMessage({
                        type: 'next',
                        args: {}
                    });
                    _that._videoLoaded();
                    break;
                case 'renext':
                    // woker线程 解码下一帧完成
                    ob.frame = data.args.buffer;
                    break;
                default:
                    break;
            }
        };


        return ob;
    }

    /**
     * 加载视频素材
     * @param {图片资源信息数组} assets 
     * @param {回调函数} cb 
     */
    function loadAssetsBinary(assets, cb) {
        this.videosLoadedCb = cb;
        var i, len = assets.length;
        for (i = 0; i < len; i += 1) {
            if (!assets[i].layers) {
                this.totalVideos += 1;
                this.videos.push(this._createVideoBinaryData(assets[i]));
            }
        }
    }

    /**
     * 获取视频文件
     * @param {*} assetData 
     */
    function getVideo(assetData) {
        var i = 0, len = this.videos.length;
        while (i < len) {
            if (this.videos[i].assetData === assetData) {
                return this.videos[i];
            }
            i += 1;
        }
    }

    /**
     * 销毁资源
     */
    function destroy() {
        this.videosLoadedCb = null;
        this.videos.forEach(element => {
            element.videoReaderWorker.terminate();
        });
        this.videos.length = 0;
    }

    /**
     * 视频是否加载完成
     * true：加载完成
     * false：未加载完成
     */
    function loaded() {
        return this.totalVideos === this.loadedAssets;
    }

    return function VideoPreloader() {
        this.loadAssetsBinary = loadAssetsBinary;
        this.loaded = loaded;
        this.destroy = destroy;
        this.getVideo = getVideo;
        this._createVideoBinaryData = createVideoBinaryData;
        this._videoLoaded = videoLoaded;
        this.totalVideos = 0;
        this.loadedAssets = 0;
        this.videosLoadedCb = null;
        this.videos = [];
    };
}());
var AudioPreloader = (function () {

    /**
     * 音频加载完成，调用回调函数
     */
    function audioLoaded() {
        this.loadedAssets += 1;
        if (this.loadedAssets === this.totalAudios) {
            if (this.audiosLoadedCb) {
                this.audiosLoadedCb(null);
            }
        }
    }

    /**
     * 获取音频文件路径
     * @param {*} assetData 
     */
    function getAssetsPath(assetData) {
        return assetData.u+assetData.p;
    }

    /**
     * 创建图片二进制数据
     * @param {{图片资源信息}} assetData 
     */
    function createAudioBinaryData(assetData) {
        var path = getAssetsPath(assetData);

        var ob = {
            assetData: assetData
        }

        fetch(path).then(response => response.arrayBuffer())
            .then(buffer => {
                ob.audio = buffer;
                this._audioLoaded();
            });

        return ob;
    }

    /**
     * 加载图片的二进制数据，即ByteArrry
     * @param {图片资源信息数组} assets 
     * @param {回调函数} cb 
     */
    function loadAssetsBinary(assets, cb) {
        this.audiosLoadedCb = cb;
        var i, len = assets.length;
        for (i = 0; i < len; i += 1) {
            if (!assets[i].layers) {
                this.totalAudios += 1;
                this.audios.push(this._createAudioBinaryData(assets[i]));
            }
        }
    }

    /**
     * 获取音频文件
     * @param {*} assetData 
     */
    function getAudio(assetData) {
        var i = 0, len = this.audios.length;
        while (i < len) {
            if (this.audios[i].assetData === assetData) {
                return this.audios[i].audio;
            }
            i += 1;
        }
    }

    /**
     * 销毁资源
     */
    function destroy() {
        this.audiosLoadedCb = null;
        this.audios.length = 0;
    }

    /**
     * 音频是否加载完成
     * true：加载完成
     * false：未加载完成
     */
    function loaded() {
        return this.totalAudios === this.loadedAssets;
    }

    return function AudioPreloader() {
        this.loadAssetsBinary = loadAssetsBinary;
        this.loaded = loaded;
        this.destroy = destroy;
        this.getAudio = getAudio;
        this._createAudioBinaryData = createAudioBinaryData;
        this._audioLoaded = audioLoaded;
        this.totalAudios = 0;
        this.loadedAssets = 0;
        this.audiosLoadedCb = null;
        this.audios = [];
    };
}());
var FontPreloader = (function () {

    /**
     * 字体加载完成，调用回调函数
     */
    function fontLoaded() {
        this.loadedFonts += 1;
        if (this.loadedFonts === this.totalFonts) {
            if (this.fontsLoadedCb) {
                this.fontsLoadedCb(null);
            }
        }
    }

    /**
     * 获取字体文件路径
     * @param {*} fontData 
     */
    function getFontsPath(fontData) {
        return fontData.u + fontData.fName + '.ttf';
        //return fontData.fPath;
    }


    /**
    * 创建字体二进制数据
    * @param {{字体资源信息}} fontData 
    */
    function createFontBinaryData(fontData) {
        var path = getFontsPath(fontData);

        var ob = {
            fontData: fontData
        }

        fetch(path).then(response => response.arrayBuffer())
            .then(buffer => {
                const fontMgr = SKIA.CanvasKit().SkFontMgr.RefDefault();
                ob.font = fontMgr.MakeTypefaceFromData(buffer);
                this._toCleanUp.push(ob.font);
                this._fontLoaded();
            });

        return ob;
    }

    /**
     * 加载字体的二进制数据，即ByteArrry
     * @param {字体资源信息数组} assets 
     * @param {回调函数} cb 
     */
    function loadAssetsBinary(assets, cb) {
        if (!assets || !assets.list) {
            return;
        }
        this.fontsLoadedCb = cb;
        var i, len = assets.list.length;
        for (i = 0; i < len; i += 1) {
            this.totalFonts += 1;
            this.fonts.push(this._createFontBinaryData(assets.list[i]));
        }
    }

    /**
     * 获取字体文件
     * @param {*} fontData 
     */
    function getFont(fontData) {
        var i = 0, len = this.fonts.length;
        while (i < len) {
            if (this.fonts[i].fontData === fontData) {
                return this.fonts[i].font;
            }
            i += 1;
        }
    }

    /**
     * 销毁字体资源，字体管理类
     */
    function destroy() {
        this.fontsLoadedCb = null;
        this.fonts.length = 0;
        this._toCleanUp.forEach(function (c) {
            c.delete();
        });
    }

    /**
    * 字体是否加载完成
    * true：加载完成
    * false：未加载完成
    */
    function loaded() {
        return this.totalFonts === this.loadedFonts;
    }

    return function FontPreloader() {
        this.loadAssetsBinary = loadAssetsBinary;
        this._createFontBinaryData = createFontBinaryData;
        this.loaded = loaded;
        this.destroy = destroy;
        this.getFont = getFont;
        this._fontLoaded = fontLoaded;
        this.totalFonts = 0;
        this.loadedFonts = 0;
        this.fontsLoadedCb = null;
        this.fonts = [];
        this._toCleanUp = [];
    };
}());
var featureSupport = (function(){
	var ob = {
		maskType: true
	};
	if (/MSIE 10/i.test(navigator.userAgent) || /MSIE 9/i.test(navigator.userAgent) || /rv:11.0/i.test(navigator.userAgent) || /Edge\/\d./i.test(navigator.userAgent)) {
	   ob.maskType = false;
	}
	return ob;
}());
var filtersFactory = (function(){
	var ob = {};
	ob.createFilter = createFilter;
	ob.createAlphaToLuminanceFilter = createAlphaToLuminanceFilter;

	function createFilter(filId){
        	var fil = createNS('filter');
        	fil.setAttribute('id',filId);
                fil.setAttribute('filterUnits','objectBoundingBox');
                fil.setAttribute('x','0%');
                fil.setAttribute('y','0%');
                fil.setAttribute('width','100%');
                fil.setAttribute('height','100%');
                return fil;
	}

	function createAlphaToLuminanceFilter(){
                var feColorMatrix = createNS('feColorMatrix');
                feColorMatrix.setAttribute('type','matrix');
                feColorMatrix.setAttribute('color-interpolation-filters','sRGB');
                feColorMatrix.setAttribute('values','0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 1 1');
                return feColorMatrix;
	}

	return ob;
}());
var assetLoader = (function(){

	function formatResponse(xhr) {
		if(xhr.response && typeof xhr.response === 'object') {
			return xhr.response;
		} else if(xhr.response && typeof xhr.response === 'string') {
			return JSON.parse(xhr.response);
		} else if(xhr.responseText) {
			return JSON.parse(xhr.responseText);
		}
	}

	function loadAsset(path, callback, errorCallback) {
		var response;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', path, true);
		// set responseType after calling open or IE will break.
		try {
		    // This crashes on Android WebView prior to KitKat
		    xhr.responseType = "json";
		} catch (err) {}
	    xhr.send();
	    xhr.onreadystatechange = function () {
	        if (xhr.readyState == 4) {
	            if(xhr.status == 200){
	            	response = formatResponse(xhr);
	            	callback(response);
	            }else{
	                try{
	            		response = formatResponse(xhr);
	            		callback(response);
	                }catch(err){
	                	if(errorCallback) {
	                		errorCallback(err);
	                	}
	                }
	            }
	        }
	    };
	}
	return {
		load: loadAsset
	}
}())

function TextAnimatorProperty(textData, renderType, elem){
    this._isFirstFrame = true;
	this._hasMaskedPath = false;
	this._frameId = -1;
	this._textData = textData;
	this._renderType = renderType;
    this._elem = elem;
	this._animatorsData = createSizedArray(this._textData.a.length);
	this._pathData = {};
	this._moreOptions = {
		alignment: {}
	};
	this.renderedLetters = [];
    this.lettersChangedFlag = false;
    this.initDynamicPropertyContainer(elem);

}

TextAnimatorProperty.prototype.searchProperties = function(){
    var i, len = this._textData.a.length, animatorProps;
    var getProp = PropertyFactory.getProp;
    for(i=0;i<len;i+=1){
        animatorProps = this._textData.a[i];
        this._animatorsData[i] = new TextAnimatorDataProperty(this._elem, animatorProps, this);
    }
    if(this._textData.p && 'm' in this._textData.p){
        this._pathData = {
            f: getProp(this._elem,this._textData.p.f,0,0,this),
            l: getProp(this._elem,this._textData.p.l,0,0,this),
            r: this._textData.p.r,
            m: this._elem.maskManager.getMaskProperty(this._textData.p.m)
        };
        this._hasMaskedPath = true;
    } else {
        this._hasMaskedPath = false;
    }
    this._moreOptions.alignment = getProp(this._elem,this._textData.m.a,1,0,this);
};

TextAnimatorProperty.prototype.getMeasures = function(documentData, lettersChangedFlag){
    this.lettersChangedFlag = lettersChangedFlag;
    if(!this._mdf && !this._isFirstFrame && !lettersChangedFlag && (!this._hasMaskedPath || !this._pathData.m._mdf)) {
        return;
    }
    this._isFirstFrame = false;
    var alignment = this._moreOptions.alignment.v;
    var animators = this._animatorsData;
    var textData = this._textData;
    var matrixHelper = this.mHelper;
    var renderType = this._renderType;
    var renderedLettersCount = this.renderedLetters.length;
    var data = this.data;
    var xPos,yPos;
    var i, len;
    var letters = documentData.l, pathInfo, currentLength, currentPoint, segmentLength, flag, pointInd, segmentInd, prevPoint, points, segments, partialLength, totalLength, perc, tanAngle, mask;
    if(this._hasMaskedPath) {
        mask = this._pathData.m;
        if(!this._pathData.n || this._pathData._mdf){
            var paths = mask.v;
            if(this._pathData.r){
                paths = paths.reverse();
            }
            // TODO: release bezier data cached from previous pathInfo: this._pathData.pi
            pathInfo = {
                tLength: 0,
                segments: []
            };
            len = paths._length - 1;
            var bezierData;
            totalLength = 0;
            for (i = 0; i < len; i += 1) {
                bezierData = bez.buildBezierData(paths.v[i]
                    , paths.v[i + 1]
                    , [paths.o[i][0] - paths.v[i][0], paths.o[i][1] - paths.v[i][1]]
                    , [paths.i[i + 1][0] - paths.v[i + 1][0], paths.i[i + 1][1] - paths.v[i + 1][1]]);
                pathInfo.tLength += bezierData.segmentLength;
                pathInfo.segments.push(bezierData);
                totalLength += bezierData.segmentLength;
            }
            i = len;
            if (mask.v.c) {
                bezierData = bez.buildBezierData(paths.v[i]
                    , paths.v[0]
                    , [paths.o[i][0] - paths.v[i][0], paths.o[i][1] - paths.v[i][1]]
                    , [paths.i[0][0] - paths.v[0][0], paths.i[0][1] - paths.v[0][1]]);
                pathInfo.tLength += bezierData.segmentLength;
                pathInfo.segments.push(bezierData);
                totalLength += bezierData.segmentLength;
            }
            this._pathData.pi = pathInfo;
        }
        pathInfo = this._pathData.pi;

        currentLength = this._pathData.f.v;
        segmentInd = 0;
        pointInd = 1;
        segmentLength = 0;
        flag = true;
        segments = pathInfo.segments;
        if (currentLength < 0 && mask.v.c) {
            if (pathInfo.tLength < Math.abs(currentLength)) {
                currentLength = -Math.abs(currentLength) % pathInfo.tLength;
            }
            segmentInd = segments.length - 1;
            points = segments[segmentInd].points;
            pointInd = points.length - 1;
            while (currentLength < 0) {
                currentLength += points[pointInd].partialLength;
                pointInd -= 1;
                if (pointInd < 0) {
                    segmentInd -= 1;
                    points = segments[segmentInd].points;
                    pointInd = points.length - 1;
                }
            }

        }
        points = segments[segmentInd].points;
        prevPoint = points[pointInd - 1];
        currentPoint = points[pointInd];
        partialLength = currentPoint.partialLength;
    }


    len = letters.length;
    xPos = 0;
    yPos = 0;
    var yOff = documentData.finalSize * 1.2 * 0.714;
    var firstLine = true;
    var animatorProps, animatorSelector;
    var j, jLen;
    var letterValue;

    jLen = animators.length;
    var lastLetter;

    var mult, ind = -1, offf, xPathPos, yPathPos;
    var initPathPos = currentLength,initSegmentInd = segmentInd, initPointInd = pointInd, currentLine = -1;
    var elemOpacity;
    var sc,sw,fc,k;
    var lineLength = 0;
    var letterSw, letterSc, letterFc, letterM = '', letterP = this.defaultPropsArray, letterO;

    //
    if(documentData.j === 2 || documentData.j === 1) {
        var animatorJustifyOffset = 0;
        var animatorFirstCharOffset = 0;
        var justifyOffsetMult = documentData.j === 2 ? -0.5 : -1;
        var lastIndex = 0;
        var isNewLine = true;

        for (i = 0; i < len; i += 1) {
            if (letters[i].n) {
                if(animatorJustifyOffset) {
                    animatorJustifyOffset += animatorFirstCharOffset;
                }
                while (lastIndex < i) {
                    letters[lastIndex].animatorJustifyOffset = animatorJustifyOffset;
                    lastIndex += 1;
                }
                animatorJustifyOffset = 0;
                isNewLine = true;
            } else {
                for (j = 0; j < jLen; j += 1) {
                    animatorProps = animators[j].a;
                    if (animatorProps.t.propType) {
                        if (isNewLine && documentData.j === 2) {
                            animatorFirstCharOffset += animatorProps.t.v * justifyOffsetMult;
                        }
                        animatorSelector = animators[j].s;
                        mult = animatorSelector.getMult(letters[i].anIndexes[j], textData.a[j].s.totalChars);
                        if (mult.length) {
                            animatorJustifyOffset += animatorProps.t.v*mult[0] * justifyOffsetMult;
                        } else {
                            animatorJustifyOffset += animatorProps.t.v*mult * justifyOffsetMult;
                        }
                    }
                }
                isNewLine = false;
            }
        }
        if(animatorJustifyOffset) {
            animatorJustifyOffset += animatorFirstCharOffset;
        }
        while(lastIndex < i) {
            letters[lastIndex].animatorJustifyOffset = animatorJustifyOffset;
            lastIndex += 1;
        }
    }
    //

    for( i = 0; i < len; i += 1) {

        matrixHelper.reset();
        elemOpacity = 1;
        if(letters[i].n) {
            xPos = 0;
            yPos += documentData.yOffset;
            yPos += firstLine ? 1 : 0;
            currentLength = initPathPos ;
            firstLine = false;
            lineLength = 0;
            if(this._hasMaskedPath) {
                segmentInd = initSegmentInd;
                pointInd = initPointInd;
                points = segments[segmentInd].points;
                prevPoint = points[pointInd - 1];
                currentPoint = points[pointInd];
                partialLength = currentPoint.partialLength;
                segmentLength = 0;
            }
            letterO = letterSw = letterFc = letterM = '';
            letterP = this.defaultPropsArray;
        }else{
            if(this._hasMaskedPath) {
                if(currentLine !== letters[i].line){
                    switch(documentData.j){
                        case 1:
                            currentLength += totalLength - documentData.lineWidths[letters[i].line];
                            break;
                        case 2:
                            currentLength += (totalLength - documentData.lineWidths[letters[i].line])/2;
                            break;
                    }
                    currentLine = letters[i].line;
                }
                if (ind !== letters[i].ind) {
                    if (letters[ind]) {
                        currentLength += letters[ind].extra;
                    }
                    currentLength += letters[i].an / 2;
                    ind = letters[i].ind;
                }
                currentLength += alignment[0] * letters[i].an / 200;
                var animatorOffset = 0;
                for (j = 0; j < jLen; j += 1) {
                    animatorProps = animators[j].a;
                    if (animatorProps.p.propType) {
                        animatorSelector = animators[j].s;
                        mult = animatorSelector.getMult(letters[i].anIndexes[j],textData.a[j].s.totalChars);
                        if(mult.length){
                            animatorOffset += animatorProps.p.v[0] * mult[0];
                        } else{
                            animatorOffset += animatorProps.p.v[0] * mult;
                        }

                    }
                    if (animatorProps.a.propType) {
                        animatorSelector = animators[j].s;
                        mult = animatorSelector.getMult(letters[i].anIndexes[j],textData.a[j].s.totalChars);
                        if(mult.length){
                            animatorOffset += animatorProps.a.v[0] * mult[0];
                        } else{
                            animatorOffset += animatorProps.a.v[0] * mult;
                        }

                    }
                }
                flag = true;
                while (flag) {
                    if (segmentLength + partialLength >= currentLength + animatorOffset || !points) {
                        perc = (currentLength + animatorOffset - segmentLength) / currentPoint.partialLength;
                        xPathPos = prevPoint.point[0] + (currentPoint.point[0] - prevPoint.point[0]) * perc;
                        yPathPos = prevPoint.point[1] + (currentPoint.point[1] - prevPoint.point[1]) * perc;
                        matrixHelper.translate(-alignment[0]*letters[i].an/200, -(alignment[1] * yOff / 100));
                        flag = false;
                    } else if (points) {
                        segmentLength += currentPoint.partialLength;
                        pointInd += 1;
                        if (pointInd >= points.length) {
                            pointInd = 0;
                            segmentInd += 1;
                            if (!segments[segmentInd]) {
                                if (mask.v.c) {
                                    pointInd = 0;
                                    segmentInd = 0;
                                    points = segments[segmentInd].points;
                                } else {
                                    segmentLength -= currentPoint.partialLength;
                                    points = null;
                                }
                            } else {
                                points = segments[segmentInd].points;
                            }
                        }
                        if (points) {
                            prevPoint = currentPoint;
                            currentPoint = points[pointInd];
                            partialLength = currentPoint.partialLength;
                        }
                    }
                }
                offf = letters[i].an / 2 - letters[i].add;
                matrixHelper.translate(-offf, 0, 0);
            } else {
                offf = letters[i].an/2 - letters[i].add;
                matrixHelper.translate(-offf,0,0);

                // Grouping alignment
                matrixHelper.translate(-alignment[0]*letters[i].an/200, -alignment[1]*yOff/100, 0);
            }

            lineLength += letters[i].l/2;
            for(j=0;j<jLen;j+=1){
                animatorProps = animators[j].a;
                if (animatorProps.t.propType) {
                    animatorSelector = animators[j].s;
                    mult = animatorSelector.getMult(letters[i].anIndexes[j],textData.a[j].s.totalChars);
                    //This condition is to prevent applying tracking to first character in each line. Might be better to use a boolean "isNewLine"
                    if(xPos !== 0 || documentData.j !== 0) {
                        if(this._hasMaskedPath) {
                            if(mult.length) {
                                currentLength += animatorProps.t.v*mult[0];
                            } else {
                                currentLength += animatorProps.t.v*mult;
                            }
                        }else{
                            if(mult.length) {
                                xPos += animatorProps.t.v*mult[0];
                            } else {
                                xPos += animatorProps.t.v*mult;
                            }
                        }
                    }
                }
            }
            lineLength += letters[i].l/2;
            if(documentData.strokeWidthAnim) {
                sw = documentData.sw || 0;
            }
            if(documentData.strokeColorAnim) {
                if(documentData.sc){
                    sc = [documentData.sc[0], documentData.sc[1], documentData.sc[2]];
                }else{
                    sc = [0,0,0];
                }
            }
            if(documentData.fillColorAnim && documentData.fc) {
                fc = [documentData.fc[0], documentData.fc[1], documentData.fc[2]];
            }
            for(j=0;j<jLen;j+=1){
                animatorProps = animators[j].a;
                if (animatorProps.a.propType) {
                    animatorSelector = animators[j].s;
                    mult = animatorSelector.getMult(letters[i].anIndexes[j],textData.a[j].s.totalChars);

                    if(mult.length){
                        matrixHelper.translate(-animatorProps.a.v[0]*mult[0], -animatorProps.a.v[1]*mult[1], animatorProps.a.v[2]*mult[2]);
                    } else {
                        matrixHelper.translate(-animatorProps.a.v[0]*mult, -animatorProps.a.v[1]*mult, animatorProps.a.v[2]*mult);
                    }
                }
            }
            for(j=0;j<jLen;j+=1){
                animatorProps = animators[j].a;
                if (animatorProps.s.propType) {
                    animatorSelector = animators[j].s;
                    mult = animatorSelector.getMult(letters[i].anIndexes[j],textData.a[j].s.totalChars);
                    if(mult.length){
                        matrixHelper.scale(1+((animatorProps.s.v[0]-1)*mult[0]),1+((animatorProps.s.v[1]-1)*mult[1]),1);
                    } else {
                        matrixHelper.scale(1+((animatorProps.s.v[0]-1)*mult),1+((animatorProps.s.v[1]-1)*mult),1);
                    }
                }
            }
            for(j=0;j<jLen;j+=1) {
                animatorProps = animators[j].a;
                animatorSelector = animators[j].s;
                mult = animatorSelector.getMult(letters[i].anIndexes[j],textData.a[j].s.totalChars);
                if (animatorProps.sk.propType) {
                    if(mult.length) {
                        matrixHelper.skewFromAxis(-animatorProps.sk.v * mult[0], animatorProps.sa.v * mult[1]);
                    } else {
                        matrixHelper.skewFromAxis(-animatorProps.sk.v * mult, animatorProps.sa.v * mult);
                    }
                }
                if (animatorProps.r.propType) {
                    if(mult.length) {
                        matrixHelper.rotateZ(-animatorProps.r.v * mult[2]);
                    } else {
                        matrixHelper.rotateZ(-animatorProps.r.v * mult);
                    }
                }
                if (animatorProps.ry.propType) {

                    if(mult.length) {
                        matrixHelper.rotateY(animatorProps.ry.v*mult[1]);
                    }else{
                        matrixHelper.rotateY(animatorProps.ry.v*mult);
                    }
                }
                if (animatorProps.rx.propType) {
                    if(mult.length) {
                        matrixHelper.rotateX(animatorProps.rx.v*mult[0]);
                    } else {
                        matrixHelper.rotateX(animatorProps.rx.v*mult);
                    }
                }
                if (animatorProps.o.propType) {
                    if(mult.length) {
                        elemOpacity += ((animatorProps.o.v)*mult[0] - elemOpacity)*mult[0];
                    } else {
                        elemOpacity += ((animatorProps.o.v)*mult - elemOpacity)*mult;
                    }
                }
                if (documentData.strokeWidthAnim && animatorProps.sw.propType) {
                    if(mult.length) {
                        sw += animatorProps.sw.v*mult[0];
                    } else {
                        sw += animatorProps.sw.v*mult;
                    }
                }
                if (documentData.strokeColorAnim && animatorProps.sc.propType) {
                    for(k=0;k<3;k+=1){
                        if(mult.length) {
                            sc[k] = sc[k] + (animatorProps.sc.v[k] - sc[k])*mult[0];
                        } else {
                            sc[k] = sc[k] + (animatorProps.sc.v[k] - sc[k])*mult;
                        }
                    }
                }
                if (documentData.fillColorAnim && documentData.fc) {
                    if(animatorProps.fc.propType){
                        for(k=0;k<3;k+=1){
                            if(mult.length) {
                                fc[k] = fc[k] + (animatorProps.fc.v[k] - fc[k])*mult[0];
                            } else {
                                fc[k] = fc[k] + (animatorProps.fc.v[k] - fc[k])*mult;
                            }
                        }
                    }
                    if(animatorProps.fh.propType){
                        if(mult.length) {
                            fc = addHueToRGB(fc,animatorProps.fh.v*mult[0]);
                        } else {
                            fc = addHueToRGB(fc,animatorProps.fh.v*mult);
                        }
                    }
                    if(animatorProps.fs.propType){
                        if(mult.length) {
                            fc = addSaturationToRGB(fc,animatorProps.fs.v*mult[0]);
                        } else {
                            fc = addSaturationToRGB(fc,animatorProps.fs.v*mult);
                        }
                    }
                    if(animatorProps.fb.propType){
                        if(mult.length) {
                            fc = addBrightnessToRGB(fc,animatorProps.fb.v*mult[0]);
                        } else {
                            fc = addBrightnessToRGB(fc,animatorProps.fb.v*mult);
                        }
                    }
                }
            }

            for(j=0;j<jLen;j+=1){
                animatorProps = animators[j].a;

                if (animatorProps.p.propType) {
                    animatorSelector = animators[j].s;
                    mult = animatorSelector.getMult(letters[i].anIndexes[j],textData.a[j].s.totalChars);
                    if(this._hasMaskedPath) {
                        if(mult.length) {
                            matrixHelper.translate(0, animatorProps.p.v[1] * mult[0], -animatorProps.p.v[2] * mult[1]);
                        } else {
                            matrixHelper.translate(0, animatorProps.p.v[1] * mult, -animatorProps.p.v[2] * mult);
                        }
                    }else{
                        if(mult.length) {
                            matrixHelper.translate(animatorProps.p.v[0] * mult[0], animatorProps.p.v[1] * mult[1], -animatorProps.p.v[2] * mult[2]);
                        } else {
                            matrixHelper.translate(animatorProps.p.v[0] * mult, animatorProps.p.v[1] * mult, -animatorProps.p.v[2] * mult);
                        
                        }
                    }
                }
            }
            if(documentData.strokeWidthAnim){
                letterSw = sw < 0 ? 0 : sw;
            }
            if(documentData.strokeColorAnim){
                letterSc = 'rgb('+Math.round(sc[0]*255)+','+Math.round(sc[1]*255)+','+Math.round(sc[2]*255)+')';
            }
            if(documentData.fillColorAnim && documentData.fc){
                letterFc = 'rgb('+Math.round(fc[0]*255)+','+Math.round(fc[1]*255)+','+Math.round(fc[2]*255)+')';
            }

            if(this._hasMaskedPath) {
                matrixHelper.translate(0,-documentData.ls);

                matrixHelper.translate(0, alignment[1]*yOff/100 + yPos,0);
                if (textData.p.p) {
                    tanAngle = (currentPoint.point[1] - prevPoint.point[1]) / (currentPoint.point[0] - prevPoint.point[0]);
                    var rot = Math.atan(tanAngle) * 180 / Math.PI;
                    if (currentPoint.point[0] < prevPoint.point[0]) {
                        rot += 180;
                    }
                    matrixHelper.rotate(-rot * Math.PI / 180);
                }
                matrixHelper.translate(xPathPos, yPathPos, 0);
                currentLength -= alignment[0]*letters[i].an/200;
                if(letters[i+1] && ind !== letters[i+1].ind){
                    currentLength += letters[i].an / 2;
                    currentLength += documentData.tr/1000*documentData.finalSize;
                }
            }else{

                matrixHelper.translate(xPos,yPos,0);

                if(documentData.ps){
                    //matrixHelper.translate(documentData.ps[0],documentData.ps[1],0);
                    matrixHelper.translate(documentData.ps[0],documentData.ps[1] + documentData.ascent,0);
                }
                switch(documentData.j){
                    case 1:
                        matrixHelper.translate(letters[i].animatorJustifyOffset + documentData.justifyOffset + (documentData.boxWidth - documentData.lineWidths[letters[i].line]),0,0);
                        break;
                    case 2:
                        matrixHelper.translate(letters[i].animatorJustifyOffset + documentData.justifyOffset + (documentData.boxWidth - documentData.lineWidths[letters[i].line])/2,0,0);
                        break;
                }
                matrixHelper.translate(0,-documentData.ls);
                matrixHelper.translate(offf,0,0);
                matrixHelper.translate(alignment[0]*letters[i].an/200,alignment[1]*yOff/100,0);
                xPos += letters[i].l + documentData.tr/1000*documentData.finalSize;
            }
            if(renderType === 'html'){
                letterM = matrixHelper.toCSS();
            }else if(renderType === 'svg'){
                letterM = matrixHelper.to2dCSS();
            }else{
                letterP = [matrixHelper.props[0],matrixHelper.props[1],matrixHelper.props[2],matrixHelper.props[3],matrixHelper.props[4],matrixHelper.props[5],matrixHelper.props[6],matrixHelper.props[7],matrixHelper.props[8],matrixHelper.props[9],matrixHelper.props[10],matrixHelper.props[11],matrixHelper.props[12],matrixHelper.props[13],matrixHelper.props[14],matrixHelper.props[15]];
            }
            letterO = elemOpacity;
        }

        if(renderedLettersCount <= i) {
            letterValue = new LetterProps(letterO,letterSw,letterSc,letterFc,letterM,letterP);
            this.renderedLetters.push(letterValue);
            renderedLettersCount += 1;
            this.lettersChangedFlag = true;
        } else {
            letterValue = this.renderedLetters[i];
            this.lettersChangedFlag = letterValue.update(letterO, letterSw, letterSc, letterFc, letterM, letterP) || this.lettersChangedFlag;
        }
    }
};

TextAnimatorProperty.prototype.getValue = function(){
	if(this._elem.globalData.frameId === this._frameId){
        return;
    }
    this._frameId = this._elem.globalData.frameId;
    this.iterateDynamicProperties();
};

TextAnimatorProperty.prototype.mHelper = new Matrix();
TextAnimatorProperty.prototype.defaultPropsArray = [];
extendPrototype([DynamicPropertyContainer], TextAnimatorProperty);
function TextAnimatorDataProperty(elem, animatorProps, container) {
	var defaultData = {propType:false};
	var getProp = PropertyFactory.getProp;
	var textAnimator_animatables = animatorProps.a;
	this.a = {
		r: textAnimator_animatables.r ? getProp(elem, textAnimator_animatables.r, 0, degToRads, container) : defaultData,
		rx: textAnimator_animatables.rx ? getProp(elem, textAnimator_animatables.rx, 0, degToRads, container) : defaultData,
		ry: textAnimator_animatables.ry ? getProp(elem, textAnimator_animatables.ry, 0, degToRads, container) : defaultData,
		sk: textAnimator_animatables.sk ? getProp(elem, textAnimator_animatables.sk, 0, degToRads, container) : defaultData,
		sa: textAnimator_animatables.sa ? getProp(elem, textAnimator_animatables.sa, 0, degToRads, container) : defaultData,
		s: textAnimator_animatables.s ? getProp(elem, textAnimator_animatables.s, 1, 0.01, container) : defaultData,
		a: textAnimator_animatables.a ? getProp(elem, textAnimator_animatables.a, 1, 0, container) : defaultData,
		o: textAnimator_animatables.o ? getProp(elem, textAnimator_animatables.o, 0, 0.01, container) : defaultData,
		p: textAnimator_animatables.p ? getProp(elem,textAnimator_animatables.p, 1, 0, container) : defaultData,
		sw: textAnimator_animatables.sw ? getProp(elem, textAnimator_animatables.sw, 0, 0, container) : defaultData,
		sc: textAnimator_animatables.sc ? getProp(elem, textAnimator_animatables.sc, 1, 0, container) : defaultData,
		fc: textAnimator_animatables.fc ? getProp(elem, textAnimator_animatables.fc, 1, 0, container) : defaultData,
		fh: textAnimator_animatables.fh ? getProp(elem, textAnimator_animatables.fh, 0, 0, container) : defaultData,
		fs: textAnimator_animatables.fs ? getProp(elem, textAnimator_animatables.fs, 0, 0.01, container) : defaultData,
		fb: textAnimator_animatables.fb ? getProp(elem, textAnimator_animatables.fb, 0, 0.01, container) : defaultData,
		t: textAnimator_animatables.t ? getProp(elem, textAnimator_animatables.t, 0, 0, container) : defaultData
	};

	this.s = TextSelectorProp.getTextSelectorProp(elem,animatorProps.s, container);
    this.s.t = animatorProps.s.t;
}
function LetterProps(o, sw, sc, fc, m, p){
    this.o = o;
    this.sw = sw;
    this.sc = sc;
    this.fc = fc;
    this.m = m;
    this.p = p;
    this._mdf = {
    	o: true,
    	sw: !!sw,
    	sc: !!sc,
    	fc: !!fc,
    	m: true,
    	p: true
    };
}

LetterProps.prototype.update = function(o, sw, sc, fc, m, p) {
	this._mdf.o = false;
	this._mdf.sw = false;
	this._mdf.sc = false;
	this._mdf.fc = false;
	this._mdf.m = false;
	this._mdf.p = false;
	var updated = false;

	if(this.o !== o) {
		this.o = o;
		this._mdf.o = true;
		updated = true;
	}
	if(this.sw !== sw) {
		this.sw = sw;
		this._mdf.sw = true;
		updated = true;
	}
	if(this.sc !== sc) {
		this.sc = sc;
		this._mdf.sc = true;
		updated = true;
	}
	if(this.fc !== fc) {
		this.fc = fc;
		this._mdf.fc = true;
		updated = true;
	}
	if(this.m !== m) {
		this.m = m;
		this._mdf.m = true;
		updated = true;
	}
	if(p.length && (this.p[0] !== p[0] || this.p[1] !== p[1] || this.p[4] !== p[4] || this.p[5] !== p[5] || this.p[12] !== p[12] || this.p[13] !== p[13])) {
		this.p = p;
		this._mdf.p = true;
		updated = true;
	}
	return updated;
};
function TextProperty(elem, data){
	this._frameId = initialDefaultFrame;
	this.pv = '';
	this.v = '';
	this.kf = false;
	this._isFirstFrame = true;
	this._mdf = false;
    this.data = data;
	this.elem = elem;
    this.comp = this.elem.comp;
	this.keysIndex = 0;
    this.canResize = false;
    this.minimumFontSize = 1;
    this.effectsSequence = [];
	this.currentData = {
		ascent: 0,
        boxWidth: this.defaultBoxWidth,
        f: '',
        fStyle: '',
        fWeight: '',
        fc: '',
        j: '',
        justifyOffset: '',
        l: [],
        lh: 0,
        lineWidths: [],
        ls: '',
        of: '',
        s: '',
        sc: '',
        sw: 0,
        t: 0,
        tr: 0,
        sz:0,
        ps:null,
        fillColorAnim: false,
        strokeColorAnim: false,
        strokeWidthAnim: false,
        yOffset: 0,
        finalSize:0,
        finalText:[],
        finalLineHeight: 0,
        __complete: false

	};
    this.copyData(this.currentData, this.data.d.k[0].s);

    if(!this.searchProperty()) {
        this.completeTextData(this.currentData);
    }
}

TextProperty.prototype.defaultBoxWidth = [0,0];

TextProperty.prototype.copyData = function(obj, data) {
    for(var s in data) {
        if(data.hasOwnProperty(s)) {
            obj[s] = data[s];
        }
    }
    return obj;
}

TextProperty.prototype.setCurrentData = function(data){
    if(!data.__complete) {
        this.completeTextData(data);
    }
    this.currentData = data;
    this.currentData.boxWidth = this.currentData.boxWidth || this.defaultBoxWidth;
    this._mdf = true;
};

TextProperty.prototype.searchProperty = function() {
    return this.searchKeyframes();
};

TextProperty.prototype.searchKeyframes = function() {
    this.kf = this.data.d.k.length > 1;
    if(this.kf) {
        this.addEffect(this.getKeyframeValue.bind(this));
    }
    return this.kf;
}

TextProperty.prototype.addEffect = function(effectFunction) {
	this.effectsSequence.push(effectFunction);
    this.elem.addDynamicProperty(this);
};

TextProperty.prototype.getValue = function(_finalValue) {
    if((this.elem.globalData.frameId === this.frameId || !this.effectsSequence.length) && !_finalValue) {
        return;
    }
    this.currentData.t = this.data.d.k[this.keysIndex].s.t;
    var currentValue = this.currentData;
    var currentIndex = this.keysIndex;
    if(this.lock) {
        this.setCurrentData(this.currentData);
        return;
    }
    this.lock = true;
    this._mdf = false;
    var multipliedValue;
    var i, len = this.effectsSequence.length;
    var finalValue = _finalValue || this.data.d.k[this.keysIndex].s;
    for(i = 0; i < len; i += 1) {
        //Checking if index changed to prevent creating a new object every time the expression updates.
        if(currentIndex !== this.keysIndex) {
            finalValue = this.effectsSequence[i](finalValue, finalValue.t);
        } else {
            finalValue = this.effectsSequence[i](this.currentData, finalValue.t);
        }
    }
    if(currentValue !== finalValue) {
        this.setCurrentData(finalValue);
    }
    this.pv = this.v = this.currentData;
    this.lock = false;
    this.frameId = this.elem.globalData.frameId;
}

TextProperty.prototype.getKeyframeValue = function() {
    var textKeys = this.data.d.k, textDocumentData;
    var frameNum = this.elem.comp.renderedFrame;
    var i = 0, len = textKeys.length;
    while(i <= len - 1) {
        textDocumentData = textKeys[i].s;
        if(i === len - 1 || textKeys[i+1].t > frameNum){
            break;
        }
        i += 1;
    }
    if(this.keysIndex !== i) {
        this.keysIndex = i;
    }
    return this.data.d.k[this.keysIndex].s;
};

TextProperty.prototype.buildFinalText = function(text) {
    var combinedCharacters = FontManager.getCombinedCharacterCodes();
    var charactersArray = [];
    var i = 0, len = text.length;
    var charCode;
    while (i < len) {
        charCode = text.charCodeAt(i);
        if (combinedCharacters.indexOf(charCode) !== -1) {
            charactersArray[charactersArray.length - 1] += text.charAt(i);
        } else {
            if (charCode >= 0xD800 && charCode <= 0xDBFF) {
                charCode = text.charCodeAt(i + 1);
                if (charCode >= 0xDC00 && charCode <= 0xDFFF) {
                    charactersArray.push(text.substr(i, 2));
                    ++i;
                } else {
                    charactersArray.push(text.charAt(i));
                }
            } else {
                charactersArray.push(text.charAt(i));
            }
        }
        i += 1;
    }
    return charactersArray;
}

TextProperty.prototype.completeTextData = function(documentData) {
    documentData.__complete = true;
    var fontManager = this.elem.globalData.fontManager;
    var data = this.data;
    var letters = [];
    var i, len;
    var newLineFlag, index = 0, val;
    var anchorGrouping = data.m.g;
    var currentSize = 0, currentPos = 0, currentLine = 0, lineWidths = [];
    var lineWidth = 0;
    var maxLineWidth = 0;
    var j, jLen;
    var fontData = fontManager.getFontByName(documentData.f);
    var charData, cLength = 0;
    var styles = fontData.fStyle ? fontData.fStyle.split(' ') : [];

    var fWeight = 'normal', fStyle = 'normal';
    len = styles.length;
    var styleName;
    for(i=0;i<len;i+=1){
        styleName = styles[i].toLowerCase();
        switch(styleName) {
            case 'italic':
            fStyle = 'italic';
            break;
            case 'bold':
            fWeight = '700';
            break;
            case 'black':
            fWeight = '900';
            break;
            case 'medium':
            fWeight = '500';
            break;
            case 'regular':
            case 'normal':
            fWeight = '400';
            break;
            case 'light':
            case 'thin':
            fWeight = '200';
            break;
        }
    }
    documentData.fWeight = fontData.fWeight || fWeight;
    documentData.fStyle = fStyle;
    documentData.finalSize = documentData.s;
    documentData.finalText = this.buildFinalText(documentData.t);
    len = documentData.finalText.length;
    documentData.finalLineHeight = documentData.lh;
    var trackingOffset = documentData.tr/1000*documentData.finalSize;
    var charCode;
    if(documentData.sz){
        var flag = true;
        var boxWidth = documentData.sz[0];
        var boxHeight = documentData.sz[1];
        var currentHeight, finalText;
        while(flag) {
            finalText = this.buildFinalText(documentData.t);
            currentHeight = 0;
            lineWidth = 0;
            len = finalText.length;
            trackingOffset = documentData.tr/1000*documentData.finalSize;
            var lastSpaceIndex = -1;
            for(i=0;i<len;i+=1){
                charCode = finalText[i].charCodeAt(0);
                newLineFlag = false;
                if(finalText[i] === ' '){
                    lastSpaceIndex = i;
                }else if(charCode === 13 || charCode === 3){
                    lineWidth = 0;
                    newLineFlag = true;
                    currentHeight += documentData.finalLineHeight || documentData.finalSize*1.2;
                }
                if(fontManager.chars){
                    charData = fontManager.getCharData(finalText[i], fontData.fStyle, fontData.fFamily);
                    cLength = newLineFlag ? 0 : charData.w*documentData.finalSize/100;
                }else{
                    //tCanvasHelper.font = documentData.s + 'px '+ fontData.fFamily;
                    cLength = fontManager.measureText(finalText[i], documentData.f, documentData.finalSize);
                }
                if(lineWidth + cLength > boxWidth && finalText[i] !== ' '){
                    if(lastSpaceIndex === -1){
                        len += 1;
                    } else {
                        i = lastSpaceIndex;
                    }
                    currentHeight += documentData.finalLineHeight || documentData.finalSize*1.2;
                    finalText.splice(i, lastSpaceIndex === i ? 1 : 0,"\r");
                    //finalText = finalText.substr(0,i) + "\r" + finalText.substr(i === lastSpaceIndex ? i + 1 : i);
                    lastSpaceIndex = -1;
                    lineWidth = 0;
                }else {
                    lineWidth += cLength;
                    lineWidth += trackingOffset;
                }
            }
            currentHeight += fontData.ascent*documentData.finalSize/100;
            if(this.canResize && documentData.finalSize > this.minimumFontSize && boxHeight < currentHeight) {
                documentData.finalSize -= 1;
                documentData.finalLineHeight = documentData.finalSize * documentData.lh / documentData.s;
            } else {
                documentData.finalText = finalText;
                len = documentData.finalText.length;
                flag = false;
            }
        }

    }
    lineWidth = - trackingOffset;
    cLength = 0;
    var uncollapsedSpaces = 0;
    var currentChar;
    for (i = 0;i < len ;i += 1) {
        newLineFlag = false;
        currentChar = documentData.finalText[i];
        charCode = currentChar.charCodeAt(0);
        if (currentChar === ' '){
            val = '\u00A0';
        } else if (charCode === 13 || charCode === 3) {
            uncollapsedSpaces = 0;
            lineWidths.push(lineWidth);
            maxLineWidth = lineWidth > maxLineWidth ? lineWidth : maxLineWidth;
            lineWidth = - 2 * trackingOffset;
            val = '';
            newLineFlag = true;
            currentLine += 1;
        }else{
            val = documentData.finalText[i];
        }
        if(fontManager.chars){
            charData = fontManager.getCharData(currentChar, fontData.fStyle, fontManager.getFontByName(documentData.f).fFamily);
            cLength = newLineFlag ? 0 : charData.w*documentData.finalSize/100;
        }else{
            //var charWidth = fontManager.measureText(val, documentData.f, documentData.finalSize);
            //tCanvasHelper.font = documentData.finalSize + 'px '+ fontManager.getFontByName(documentData.f).fFamily;
            cLength = fontManager.measureText(val, documentData.f, documentData.finalSize);
        }

        //
        if(currentChar === ' '){
            uncollapsedSpaces += cLength + trackingOffset;
        } else {
            lineWidth += cLength + trackingOffset + uncollapsedSpaces;
            uncollapsedSpaces = 0;
        }
        letters.push({l:cLength,an:cLength,add:currentSize,n:newLineFlag, anIndexes:[], val: val, line: currentLine, animatorJustifyOffset: 0});
        if(anchorGrouping == 2){
            currentSize += cLength;
            if(val === '' || val === '\u00A0' || i === len - 1){
                if(val === '' || val === '\u00A0'){
                    currentSize -= cLength;
                }
                while(currentPos<=i){
                    letters[currentPos].an = currentSize;
                    letters[currentPos].ind = index;
                    letters[currentPos].extra = cLength;
                    currentPos += 1;
                }
                index += 1;
                currentSize = 0;
            }
        }else if(anchorGrouping == 3){
            currentSize += cLength;
            if(val === '' || i === len - 1){
                if(val === ''){
                    currentSize -= cLength;
                }
                while(currentPos<=i){
                    letters[currentPos].an = currentSize;
                    letters[currentPos].ind = index;
                    letters[currentPos].extra = cLength;
                    currentPos += 1;
                }
                currentSize = 0;
                index += 1;
            }
        }else{
            letters[index].ind = index;
            letters[index].extra = 0;
            index += 1;
        }
    }
    documentData.l = letters;
    maxLineWidth = lineWidth > maxLineWidth ? lineWidth : maxLineWidth;
    lineWidths.push(lineWidth);
    if(documentData.sz){
        documentData.boxWidth = documentData.sz[0];
        documentData.justifyOffset = 0;
    }else{
        documentData.boxWidth = maxLineWidth;
        switch(documentData.j){
            case 1:
                documentData.justifyOffset = - documentData.boxWidth;
                break;
            case 2:
                documentData.justifyOffset = - documentData.boxWidth/2;
                break;
            default:
                documentData.justifyOffset = 0;
        }
    }
    documentData.lineWidths = lineWidths;

    var animators = data.a, animatorData, letterData;
    jLen = animators.length;
    var based, ind, indexes = [];
    for(j=0;j<jLen;j+=1){
        animatorData = animators[j];
        if(animatorData.a.sc){
            documentData.strokeColorAnim = true;
        }
        if(animatorData.a.sw){
            documentData.strokeWidthAnim = true;
        }
        if(animatorData.a.fc || animatorData.a.fh || animatorData.a.fs || animatorData.a.fb){
            documentData.fillColorAnim = true;
        }
        ind = 0;
        based = animatorData.s.b;
        for(i=0;i<len;i+=1){
            letterData = letters[i];
            letterData.anIndexes[j] = ind;
            if((based == 1 && letterData.val !== '') || (based == 2 && letterData.val !== '' && letterData.val !== '\u00A0') || (based == 3 && (letterData.n || letterData.val == '\u00A0' || i == len - 1)) || (based == 4 && (letterData.n || i == len - 1))){
                if(animatorData.s.rn === 1){
                    indexes.push(ind);
                }
                ind += 1;
            }
        }
        data.a[j].s.totalChars = ind;
        var currentInd = -1, newInd;
        if(animatorData.s.rn === 1){
            for(i = 0; i < len; i += 1){
                letterData = letters[i];
                if(currentInd != letterData.anIndexes[j]){
                    currentInd = letterData.anIndexes[j];
                    newInd = indexes.splice(Math.floor(Math.random()*indexes.length),1)[0];
                }
                letterData.anIndexes[j] = newInd;
            }
        }
    }
    documentData.yOffset = documentData.finalLineHeight || documentData.finalSize*1.2;
    documentData.ls = documentData.ls || 0;
    documentData.ascent = fontData.ascent*documentData.finalSize/100;
};

TextProperty.prototype.updateDocumentData = function(newData, index) {
	index = index === undefined ? this.keysIndex : index;
    var dData = this.copyData({}, this.data.d.k[index].s);
    dData = this.copyData(dData, newData);
    this.data.d.k[index].s = dData;
    this.recalculate(index);
    this.elem.addDynamicProperty(this);
};

TextProperty.prototype.recalculate = function(index) {
    var dData = this.data.d.k[index].s;
    dData.__complete = false;
    this.keysIndex = 0;
    this._isFirstFrame = true;
    this.getValue(dData);
}

TextProperty.prototype.canResizeFont = function(_canResize) {
    this.canResize = _canResize;
    this.recalculate(this.keysIndex);
    this.elem.addDynamicProperty(this);
};

TextProperty.prototype.setMinimumFontSize = function(_fontValue) {
    this.minimumFontSize = Math.floor(_fontValue) || 1;
    this.recalculate(this.keysIndex);
    this.elem.addDynamicProperty(this);
};

var TextSelectorProp = (function(){
    var max = Math.max;
    var min = Math.min;
    var floor = Math.floor;

    function TextSelectorProp(elem,data){
        this._currentTextLength = -1;
        this.k = false;
        this.data = data;
        this.elem = elem;
        this.comp = elem.comp;
        this.finalS = 0;
        this.finalE = 0;
        this.initDynamicPropertyContainer(elem);
        this.s = PropertyFactory.getProp(elem,data.s || {k:0},0,0,this);
        if('e' in data){
            this.e = PropertyFactory.getProp(elem,data.e,0,0,this);
        }else{
            this.e = {v:100};
        }
        this.o = PropertyFactory.getProp(elem,data.o || {k:0},0,0,this);
        this.xe = PropertyFactory.getProp(elem,data.xe || {k:0},0,0,this);
        this.ne = PropertyFactory.getProp(elem,data.ne || {k:0},0,0,this);
        this.a = PropertyFactory.getProp(elem,data.a,0,0.01,this);
        if(!this.dynamicProperties.length){
            this.getValue();
        }
    }

    TextSelectorProp.prototype = {
        getMult: function(ind) {
            if(this._currentTextLength !== this.elem.textProperty.currentData.l.length) {
                this.getValue();
            }
            //var easer = bez.getEasingCurve(this.ne.v/100,0,1-this.xe.v/100,1);
            var x1 = 0;
            var y1 = 0;
            var x2 = 1;
            var y2 = 1;
            if(this.ne.v > 0) {
                x1 = this.ne.v / 100.0;
            }
            else {
                y1 = -this.ne.v / 100.0;
            }
            if(this.xe.v > 0) {
                x2 = 1.0 - this.xe.v / 100.0;
            }
            else {
                y2 = 1.0 + this.xe.v / 100.0;
            }
            var easer = BezierFactory.getBezierEasing(x1, y1, x2, y2).get;

            var mult = 0;
            var s = this.finalS;
            var e = this.finalE;
            var type = this.data.sh;
            if (type === 2){
                if (e === s) {
                    mult = ind >= e ? 1 : 0;
                } else {
                    mult = max(0, min(0.5 / (e - s) + (ind - s) / (e - s), 1));
                }
                mult = easer(mult);
            } else if(type === 3) {
                if (e === s) {
                    mult = ind >= e ? 0 : 1;
                }else{
                    mult = 1 - max(0, min(0.5 / (e - s) + (ind - s) / (e - s),1));
                }

                mult = easer(mult);
            } else if (type === 4) {
                if (e === s) {
                    mult = 0;
                } else {
                    mult = max(0, min(0.5 / (e - s) + (ind - s) / (e - s), 1));
                    if (mult < 0.5) {
                        mult *= 2;
                    } else {
                        mult = 1 - 2 * (mult - 0.5);
                    }
                }
                mult = easer(mult);
            } else if (type === 5) {
                if (e === s){
                    mult = 0;
                } else {
                    var tot = e - s;
                    /*ind += 0.5;
                    mult = -4/(tot*tot)*(ind*ind)+(4/tot)*ind;*/
                    ind = min(max(0, ind + 0.5 - s), e - s);
                    var x = -tot/2+ind;
                    var a = tot/2;
                    mult = Math.sqrt(1 - (x * x) / (a * a));
                }
                mult = easer(mult);
            } else if (type === 6) {
                if (e === s){
                    mult = 0;
                } else {
                    ind = min(max(0, ind + 0.5 - s), e - s);
                    mult = (1 + (Math.cos((Math.PI + Math.PI * 2 * (ind) / (e - s))))) / 2;
                }
                mult = easer(mult);
            } else {
                if (ind >= floor(s)) {
                    if (ind - s < 0) {
                        mult = max(0, min(min(e, 1) - (s - ind), 1));
                    } else {
                        mult = max(0, min(e - ind, 1));
                    }
                }
                mult = easer(mult);
            }
            return mult*this.a.v;
        },
        getValue: function(newCharsFlag) {
            this.iterateDynamicProperties();
            this._mdf = newCharsFlag || this._mdf;
            this._currentTextLength = this.elem.textProperty.currentData.l.length || 0;
            if(newCharsFlag && this.data.r === 2) {
                this.e.v = this._currentTextLength;
            }
            var divisor = this.data.r === 2 ? 1 : 100 / this.data.totalChars;
            var o = this.o.v/divisor;
            var s = this.s.v/divisor + o;
            var e = (this.e.v/divisor) + o;
            if(s>e){
                var _s = s;
                s = e;
                e = _s;
            }
            this.finalS = s;
            this.finalE = e;
        }
    }
    extendPrototype([DynamicPropertyContainer], TextSelectorProp);

    function getTextSelectorProp(elem, data,arr) {
        return new TextSelectorProp(elem, data, arr);
    }

    return {
        getTextSelectorProp: getTextSelectorProp
    };
}());

    
var pool_factory = (function() {
	return function(initialLength, _create, _release, _clone) {

		var _length = 0;
		var _maxLength = initialLength;
		var pool = createSizedArray(_maxLength);

		var ob = {
			newElement: newElement,
			release: release
		};

		function newElement(){
			var element;
			if(_length){
				_length -= 1;
				element = pool[_length];
			} else {
				element = _create();
			}
			return element;
		}

		function release(element) {
			if(_length === _maxLength) {
				pool = pooling.double(pool);
				_maxLength = _maxLength*2;
			}
			if (_release) {
				_release(element);
			}
			pool[_length] = element;
			_length += 1;
		}

		function clone() {
			var clonedElement = newElement();
			return _clone(clonedElement);
		}

		return ob;
	};
}());

var pooling = (function(){

	function double(arr){
		return arr.concat(createSizedArray(arr.length));
	}

	return {
		double: double
	};
}());
var point_pool = (function(){

	function create() {
		return createTypedArray('float32', 2);
	}
	return pool_factory(8, create);
}());
var shape_pool = (function(){

	function create() {
		return new ShapePath();
	}

	function release(shapePath) {
		var len = shapePath._length, i;
		for(i = 0; i < len; i += 1) {
			point_pool.release(shapePath.v[i]);
			point_pool.release(shapePath.i[i]);
			point_pool.release(shapePath.o[i]);
			shapePath.v[i] = null;
			shapePath.i[i] = null;
			shapePath.o[i] = null;
		}
		shapePath._length = 0;
		shapePath.c = false;
	}

	function clone(shape) {
		var cloned = factory.newElement();
		var i, len = shape._length === undefined ? shape.v.length : shape._length;
		cloned.setLength(len);
		cloned.c = shape.c;
		var pt;
		
		for(i = 0; i < len; i += 1) {
			cloned.setTripleAt(shape.v[i][0],shape.v[i][1],shape.o[i][0],shape.o[i][1],shape.i[i][0],shape.i[i][1], i);
		}
		return cloned;
	}

	var factory = pool_factory(4, create, release);
	factory.clone = clone;

	return factory;
}());
var shapeCollection_pool = (function(){
	var ob = {
		newShapeCollection: newShapeCollection,
		release: release
	};

	var _length = 0;
	var _maxLength = 4;
	var pool = createSizedArray(_maxLength);

	function newShapeCollection(){
		var shapeCollection;
		if(_length){
			_length -= 1;
			shapeCollection = pool[_length];
		} else {
			shapeCollection = new ShapeCollection();
		}
		return shapeCollection;
	}

	function release(shapeCollection) {
		var i, len = shapeCollection._length;
		for(i = 0; i < len; i += 1) {
			shape_pool.release(shapeCollection.shapes[i]);
		}
		shapeCollection._length = 0;

		if(_length === _maxLength) {
			pool = pooling.double(pool);
			_maxLength = _maxLength*2;
		}
		pool[_length] = shapeCollection;
		_length += 1;
	}

	return ob;
}());
var segments_length_pool = (function(){

	function create() {
		return {
			lengths: [],
			totalLength: 0
		};
	}

	function release(element) {
		var i, len = element.lengths.length;
		for(i=0;i<len;i+=1) {
			bezier_length_pool.release(element.lengths[i]);
		}
		element.lengths.length = 0;
	}

	return pool_factory(8, create, release);
}());
var bezier_length_pool = (function(){

	function create() {
		return {
            addedLength: 0,
            percents: createTypedArray('float32', defaultCurveSegments),
            lengths: createTypedArray('float32', defaultCurveSegments),
        };
	}
	return pool_factory(8, create);
}());
function BaseRenderer() { }
BaseRenderer.prototype.checkLayers = function (num) {
    var i, len = this.layers.length, data;
    this.completeLayers = true;
    for (i = len - 1; i >= 0; i--) {
        if (!this.elements[i]) {
            data = this.layers[i];
            if (data.ip - data.st <= (num - this.layers[i].st) && data.op - data.st > (num - this.layers[i].st)) {
                this.buildItem(i);
            }
        }
        this.completeLayers = this.elements[i] ? this.completeLayers : false;
    }
    this.checkPendingElements();
};

BaseRenderer.prototype.createItem = function (layer) {
    switch (layer.ty) {

        case 0:
            return this.createComp(layer);
        case 1:
            return this.createSolid(layer);
        case 2:
            return this.createImage(layer);
        case 3:
            return this.createNull(layer);
        case 4:
            return this.createShape(layer);
        case 5:
            return this.createText(layer);
        case 9:
            return this.createVideo(layer);
        case 13:
            return this.createCamera(layer);
    }
    return this.createNull(layer);
};

BaseRenderer.prototype.createCamera = function () {
    throw new Error('You\'re using a 3d camera. Try the html renderer.');
};

BaseRenderer.prototype.buildAllItems = function () {
    var i, len = this.layers.length;
    for (i = 0; i < len; i += 1) {
        this.buildItem(i);
    }
    this.checkPendingElements();
};

BaseRenderer.prototype.includeLayers = function (newLayers) {
    this.completeLayers = false;
    var i, len = newLayers.length;
    var j, jLen = this.layers.length;
    for (i = 0; i < len; i += 1) {
        j = 0;
        while (j < jLen) {
            if (this.layers[j].id == newLayers[i].id) {
                this.layers[j] = newLayers[i];
                break;
            }
            j += 1;
        }
    }
};

BaseRenderer.prototype.setProjectInterface = function (pInterface) {
    this.globalData.projectInterface = pInterface;
};

BaseRenderer.prototype.initItems = function () {
    if (!this.globalData.progressiveLoad) {
        this.buildAllItems();
    }
};
BaseRenderer.prototype.buildElementParenting = function (element, parentName, hierarchy) {
    var elements = this.elements;
    var layers = this.layers;
    var i = 0, len = layers.length;
    while (i < len) {
        if (layers[i].ind == parentName) {
            if (!elements[i] || elements[i] === true) {
                this.buildItem(i);
                this.addPendingElement(element);
            } else {
                hierarchy.push(elements[i]);
                elements[i].setAsParent();
                if (layers[i].parent !== undefined) {
                    this.buildElementParenting(element, layers[i].parent, hierarchy);
                } else {
                    element.setHierarchy(hierarchy);
                }
            }
        }
        i += 1;
    }
};

BaseRenderer.prototype.addPendingElement = function (element) {
    this.pendingElements.push(element);
};

BaseRenderer.prototype.searchExtraCompositions = function (assets) {
    var i, len = assets.length;
    for (i = 0; i < len; i += 1) {
        if (assets[i].xt) {
            var comp = this.createComp(assets[i]);
            comp.initExpressions();
            this.globalData.projectInterface.registerComposition(comp);
        }
    }
};

BaseRenderer.prototype.setupGlobalData = function (animData, fontsContainer) {
    this.globalData.fontManager = new FontManager();
    this.globalData.fontManager.addChars(animData.chars);
    this.globalData.fontManager.addFonts(animData.fonts, fontsContainer);
    this.globalData.getImageData = this.animationItem.getImageData.bind(this.animationItem);
    this.globalData.getFontData = this.animationItem.getFontData.bind(this.animationItem);
    this.globalData.getVideoData = this.animationItem.getVideoData.bind(this.animationItem);
    this.globalData.getAssetsPath = this.animationItem.getAssetsPath.bind(this.animationItem);
    this.globalData.imageLoader = this.animationItem.imagePreloader;
    this.globalData.videoLoader = this.animationItem.videoPreloader;
    this.globalData.fontLoader = this.animationItem.fontPreloader;
    this.globalData.frameId = 0;
    this.globalData.frameRate = animData.fr;
    this.globalData.nm = animData.nm;
    this.globalData.compSize = {
        w: animData.w,
        h: animData.h
    }
}
function SVGRenderer(animationItem, config){
    this.animationItem = animationItem;
    this.layers = null;
    this.renderedFrame = -1;
    this.svgElement = createNS('svg');
    var ariaLabel = '';
    if (config && config.title) {
        var titleElement = createNS('title');
        var titleId = createElementID();
        titleElement.setAttribute('id', titleId);
        titleElement.textContent = config.title;
        this.svgElement.appendChild(titleElement);
        ariaLabel += titleId;
    }
    if (config && config.description) {
        var descElement = createNS('desc');
        var descId = createElementID();
        descElement.setAttribute('id', descId);
        descElement.textContent = config.description;
        this.svgElement.appendChild(descElement);
        ariaLabel += ' ' + descId;
    }
    if (ariaLabel) {
        this.svgElement.setAttribute('aria-labelledby', ariaLabel)
    }
    var defs = createNS( 'defs');
    this.svgElement.appendChild(defs);
    var maskElement = createNS('g');
    this.svgElement.appendChild(maskElement);
    this.layerElement = maskElement;
    this.renderConfig = {
        preserveAspectRatio: (config && config.preserveAspectRatio) || 'xMidYMid meet',
        imagePreserveAspectRatio: (config && config.imagePreserveAspectRatio) || 'xMidYMid slice',
        progressiveLoad: (config && config.progressiveLoad) || false,
        hideOnTransparent: (config && config.hideOnTransparent === false) ? false : true,
        viewBoxOnly: (config && config.viewBoxOnly) || false,
        viewBoxSize: (config && config.viewBoxSize) || false,
        className: (config && config.className) || '',
        id: (config && config.id) || '',
        focusable: config && config.focusable
    };

    this.globalData = {
        _mdf: false,
        frameNum: -1,
        defs: defs,
        renderConfig: this.renderConfig
    };
    this.elements = [];
    this.pendingElements = [];
    this.destroyed = false;
    this.rendererType = 'svg';

}

extendPrototype([BaseRenderer],SVGRenderer);

SVGRenderer.prototype.createNull = function (data) {
    return new NullElement(data,this.globalData,this);
};

SVGRenderer.prototype.createShape = function (data) {
    return new SVGShapeElement(data,this.globalData,this);
};

SVGRenderer.prototype.createText = function (data) {
    return new SVGTextElement(data,this.globalData,this);

};

SVGRenderer.prototype.createImage = function (data) {
    return new IImageElement(data,this.globalData,this);
};

SVGRenderer.prototype.createComp = function (data) {
    return new SVGCompElement(data,this.globalData,this);

};

SVGRenderer.prototype.createSolid = function (data) {
    return new ISolidElement(data,this.globalData,this);
};

SVGRenderer.prototype.configAnimation = function(animData){
    this.svgElement.setAttribute('xmlns','http://www.w3.org/2000/svg');
    if(this.renderConfig.viewBoxSize) {
        this.svgElement.setAttribute('viewBox',this.renderConfig.viewBoxSize);
    } else {
        this.svgElement.setAttribute('viewBox','0 0 '+animData.w+' '+animData.h);
    }

    if(!this.renderConfig.viewBoxOnly) {
        this.svgElement.setAttribute('width',animData.w);
        this.svgElement.setAttribute('height',animData.h);
        this.svgElement.style.width = '100%';
        this.svgElement.style.height = '100%';
        this.svgElement.style.transform = 'translate3d(0,0,0)';
    }
    if (this.renderConfig.className) {
        this.svgElement.setAttribute('class', this.renderConfig.className);
    }
    if (this.renderConfig.id) {
        this.svgElement.setAttribute('id', this.renderConfig.id);
    }
    if (this.renderConfig.focusable !== undefined) {
        this.svgElement.setAttribute('focusable', this.renderConfig.focusable);
    }
    this.svgElement.setAttribute('preserveAspectRatio',this.renderConfig.preserveAspectRatio);
    //this.layerElement.style.transform = 'translate3d(0,0,0)';
    //this.layerElement.style.transformOrigin = this.layerElement.style.mozTransformOrigin = this.layerElement.style.webkitTransformOrigin = this.layerElement.style['-webkit-transform'] = "0px 0px 0px";
    this.animationItem.wrapper.appendChild(this.svgElement);
    //Mask animation
    var defs = this.globalData.defs;

    this.setupGlobalData(animData, defs);
    this.globalData.progressiveLoad = this.renderConfig.progressiveLoad;
    this.data = animData;

    var maskElement = createNS( 'clipPath');
    var rect = createNS('rect');
    rect.setAttribute('width',animData.w);
    rect.setAttribute('height',animData.h);
    rect.setAttribute('x',0);
    rect.setAttribute('y',0);
    var maskId = createElementID();
    maskElement.setAttribute('id', maskId);
    maskElement.appendChild(rect);
    this.layerElement.setAttribute("clip-path", "url(" + locationHref + "#"+maskId+")");

    defs.appendChild(maskElement);
    this.layers = animData.layers;
    this.elements = createSizedArray(animData.layers.length);
};


SVGRenderer.prototype.destroy = function () {
    this.animationItem.wrapper.innerHTML = '';
    this.layerElement = null;
    this.globalData.defs = null;
    var i, len = this.layers ? this.layers.length : 0;
    for (i = 0; i < len; i++) {
        if(this.elements[i]){
            this.elements[i].destroy();
        }
    }
    this.elements.length = 0;
    this.destroyed = true;
    this.animationItem = null;
};

SVGRenderer.prototype.updateContainerSize = function () {
};

SVGRenderer.prototype.buildItem  = function(pos){
    var elements = this.elements;
    if(elements[pos] || this.layers[pos].ty == 99){
        return;
    }
    elements[pos] = true;
    var element = this.createItem(this.layers[pos]);

    elements[pos] = element;
    if(expressionsPlugin){
        if(this.layers[pos].ty === 0){
            this.globalData.projectInterface.registerComposition(element);
        }
        element.initExpressions();
    }
    this.appendElementInPos(element,pos);
    if(this.layers[pos].tt){
        if(!this.elements[pos - 1] || this.elements[pos - 1] === true){
            this.buildItem(pos - 1);
            this.addPendingElement(element);
        } else {
            element.setMatte(elements[pos - 1].layerId);
        }
    }
};

SVGRenderer.prototype.checkPendingElements  = function(){
    while(this.pendingElements.length){
        var element = this.pendingElements.pop();
        element.checkParenting();
        if(element.data.tt){
            var i = 0, len = this.elements.length;
            while(i<len){
                if(this.elements[i] === element){
                    element.setMatte(this.elements[i - 1].layerId);
                    break;
                }
                i += 1;
            }
        }
    }
};

SVGRenderer.prototype.renderFrame = function(num){
    if(this.renderedFrame === num || this.destroyed){
        return;
    }
    if(num === null){
        num = this.renderedFrame;
    }else{
        this.renderedFrame = num;
    }
    // console.log('-------');
    // console.log('FRAME ',num);
    this.globalData.frameNum = num;
    this.globalData.frameId += 1;
    this.globalData.projectInterface.currentFrame = num;
    this.globalData._mdf = false;
    var i, len = this.layers.length;
    if(!this.completeLayers){
        this.checkLayers(num);
    }
    for (i = len - 1; i >= 0; i--) {
        if(this.completeLayers || this.elements[i]){
            this.elements[i].prepareFrame(num - this.layers[i].st);
        }
    }
    if(this.globalData._mdf) {
        for (i = 0; i < len; i += 1) {
            if(this.completeLayers || this.elements[i]){
                this.elements[i].renderFrame();
            }
        }
    }
};

SVGRenderer.prototype.appendElementInPos = function(element, pos){
    var newElement = element.getBaseElement();
    if(!newElement){
        return;
    }
    var i = 0;
    var nextElement;
    while(i<pos){
        if(this.elements[i] && this.elements[i]!== true && this.elements[i].getBaseElement()){
            nextElement = this.elements[i].getBaseElement();
        }
        i += 1;
    }
    if(nextElement){
        this.layerElement.insertBefore(newElement, nextElement);
    } else {
        this.layerElement.appendChild(newElement);
    }
};

SVGRenderer.prototype.hide = function(){
    this.layerElement.style.display = 'none';
};

SVGRenderer.prototype.show = function(){
    this.layerElement.style.display = 'block';
};

function CanvasRenderer(animationItem, config){
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
    this.rendererType = 'canvas';
}
extendPrototype([BaseRenderer],CanvasRenderer);

CanvasRenderer.prototype.createShape = function (data) {
    return new CVShapeElement(data, this.globalData, this);
};

CanvasRenderer.prototype.createText = function (data) {
    return new CVTextElement(data, this.globalData, this);
};

CanvasRenderer.prototype.createImage = function (data) {
    return new CVImageElement(data, this.globalData, this);
};

CanvasRenderer.prototype.createComp = function (data) {
    return new CVCompElement(data, this.globalData, this);
};

CanvasRenderer.prototype.createSolid = function (data) {
    return new CVSolidElement(data, this.globalData, this);
};

CanvasRenderer.prototype.createNull = SVGRenderer.prototype.createNull;

CanvasRenderer.prototype.ctxTransform = function(props){
    if(props[0] === 1 && props[1] === 0 && props[4] === 0 && props[5] === 1 && props[12] === 0 && props[13] === 0){
        return;
    }
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.transform(props[0],props[1],props[4],props[5],props[12],props[13]);
        return;
    }
    this.transformMat.cloneFromProps(props);
    var cProps = this.contextData.cTr.props;
    this.transformMat.transform(cProps[0],cProps[1],cProps[2],cProps[3],cProps[4],cProps[5],cProps[6],cProps[7],cProps[8],cProps[9],cProps[10],cProps[11],cProps[12],cProps[13],cProps[14],cProps[15]);
    //this.contextData.cTr.transform(props[0],props[1],props[2],props[3],props[4],props[5],props[6],props[7],props[8],props[9],props[10],props[11],props[12],props[13],props[14],props[15]);
    this.contextData.cTr.cloneFromProps(this.transformMat.props);
    var trProps = this.contextData.cTr.props;
    this.canvasContext.setTransform(trProps[0],trProps[1],trProps[4],trProps[5],trProps[12],trProps[13]);
};

CanvasRenderer.prototype.ctxOpacity = function(op){
    /*if(op === 1){
        return;
    }*/
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.globalAlpha *= op < 0 ? 0 : op;
        this.globalData.currentGlobalAlpha = this.contextData.cO;
        return;
    }
    this.contextData.cO *= op < 0 ? 0 : op;
    if(this.globalData.currentGlobalAlpha !== this.contextData.cO) {
        this.canvasContext.globalAlpha = this.contextData.cO;
        this.globalData.currentGlobalAlpha = this.contextData.cO;
    }
};

CanvasRenderer.prototype.reset = function(){
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.restore();
        return;
    }
    this.contextData.reset();
};

CanvasRenderer.prototype.save = function(actionFlag){
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.save();
        return;
    }
    if(actionFlag){
        this.canvasContext.save();
    }
    var props = this.contextData.cTr.props;
    if(this.contextData._length <= this.contextData.cArrPos) {
        this.contextData.duplicate();
    }
    var i, arr = this.contextData.saved[this.contextData.cArrPos];
    for (i = 0; i < 16; i += 1) {
        arr[i] = props[i];
    }
    this.contextData.savedOp[this.contextData.cArrPos] = this.contextData.cO;
    this.contextData.cArrPos += 1;
};

CanvasRenderer.prototype.restore = function(actionFlag){
    if(!this.renderConfig.clearCanvas){
        this.canvasContext.restore();
        return;
    }
    if(actionFlag){
        this.canvasContext.restore();
        this.globalData.blendMode = 'source-over';
    }
    this.contextData.cArrPos -= 1;
    var popped = this.contextData.saved[this.contextData.cArrPos];
    var i,arr = this.contextData.cTr.props;
    for(i=0;i<16;i+=1){
        arr[i] = popped[i];
    }
    this.canvasContext.setTransform(popped[0],popped[1],popped[4],popped[5],popped[12],popped[13]);
    popped = this.contextData.savedOp[this.contextData.cArrPos];
    this.contextData.cO = popped;
    if(this.globalData.currentGlobalAlpha !== popped) {
        this.canvasContext.globalAlpha = popped;
        this.globalData.currentGlobalAlpha = popped;
    }
};

CanvasRenderer.prototype.configAnimation = function(animData){
    if(this.animationItem.wrapper){
        this.animationItem.container = createTag('canvas');
        this.animationItem.container.style.width = '100%';
        this.animationItem.container.style.height = '100%';
        //this.animationItem.container.style.transform = 'translate3d(0,0,0)';
        //this.animationItem.container.style.webkitTransform = 'translate3d(0,0,0)';
        this.animationItem.container.style.transformOrigin = this.animationItem.container.style.mozTransformOrigin = this.animationItem.container.style.webkitTransformOrigin = this.animationItem.container.style['-webkit-transform'] = "0px 0px 0px";
        this.animationItem.wrapper.appendChild(this.animationItem.container);
        this.canvasContext = this.animationItem.container.getContext('2d');
        if(this.renderConfig.className) {
            this.animationItem.container.setAttribute('class', this.renderConfig.className);
        }
        if(this.renderConfig.id) {
            this.animationItem.container.setAttribute('id', this.renderConfig.id);
        }
    }else{
        this.canvasContext = this.renderConfig.context;
    }
    this.data = animData;
    this.layers = animData.layers;
    this.transformCanvas = {
        w: animData.w,
        h:animData.h,
        sx:0,
        sy:0,
        tx:0,
        ty:0
    };
    this.setupGlobalData(animData, document.body);
    this.globalData.canvasContext = this.canvasContext;
    this.globalData.renderer = this;
    this.globalData.isDashed = false;
    this.globalData.progressiveLoad = this.renderConfig.progressiveLoad;
    this.globalData.transformCanvas = this.transformCanvas;
    this.elements = createSizedArray(animData.layers.length);

    this.updateContainerSize();
};

CanvasRenderer.prototype.updateContainerSize = function () {
    this.reset();
    var elementWidth,elementHeight;
    if(this.animationItem.wrapper && this.animationItem.container){
        elementWidth = this.animationItem.wrapper.offsetWidth;
        elementHeight = this.animationItem.wrapper.offsetHeight;
        this.animationItem.container.setAttribute('width',elementWidth * this.renderConfig.dpr );
        this.animationItem.container.setAttribute('height',elementHeight * this.renderConfig.dpr);
    }else{
        elementWidth = this.canvasContext.canvas.width * this.renderConfig.dpr;
        elementHeight = this.canvasContext.canvas.height * this.renderConfig.dpr;
    }
    var elementRel,animationRel;
    if(this.renderConfig.preserveAspectRatio.indexOf('meet') !== -1 || this.renderConfig.preserveAspectRatio.indexOf('slice') !== -1){
        var par = this.renderConfig.preserveAspectRatio.split(' ');
        var fillType = par[1] || 'meet';
        var pos = par[0] || 'xMidYMid';
        var xPos = pos.substr(0,4);
        var yPos = pos.substr(4);
        elementRel = elementWidth/elementHeight;
        animationRel = this.transformCanvas.w/this.transformCanvas.h;
        if(animationRel>elementRel && fillType === 'meet' || animationRel<elementRel && fillType === 'slice'){
            this.transformCanvas.sx = elementWidth/(this.transformCanvas.w/this.renderConfig.dpr);
            this.transformCanvas.sy = elementWidth/(this.transformCanvas.w/this.renderConfig.dpr);
        }else{
            this.transformCanvas.sx = elementHeight/(this.transformCanvas.h / this.renderConfig.dpr);
            this.transformCanvas.sy = elementHeight/(this.transformCanvas.h / this.renderConfig.dpr);
        }

        if(xPos === 'xMid' && ((animationRel<elementRel && fillType==='meet') || (animationRel>elementRel && fillType === 'slice'))){
            this.transformCanvas.tx = (elementWidth-this.transformCanvas.w*(elementHeight/this.transformCanvas.h))/2*this.renderConfig.dpr;
        } else if(xPos === 'xMax' && ((animationRel<elementRel && fillType==='meet') || (animationRel>elementRel && fillType === 'slice'))){
            this.transformCanvas.tx = (elementWidth-this.transformCanvas.w*(elementHeight/this.transformCanvas.h))*this.renderConfig.dpr;
        } else {
            this.transformCanvas.tx = 0;
        }
        if(yPos === 'YMid' && ((animationRel>elementRel && fillType==='meet') || (animationRel<elementRel && fillType === 'slice'))){
            this.transformCanvas.ty = ((elementHeight-this.transformCanvas.h*(elementWidth/this.transformCanvas.w))/2)*this.renderConfig.dpr;
        } else if(yPos === 'YMax' && ((animationRel>elementRel && fillType==='meet') || (animationRel<elementRel && fillType === 'slice'))){
            this.transformCanvas.ty = ((elementHeight-this.transformCanvas.h*(elementWidth/this.transformCanvas.w)))*this.renderConfig.dpr;
        } else {
            this.transformCanvas.ty = 0;
        }

    }else if(this.renderConfig.preserveAspectRatio == 'none'){
        this.transformCanvas.sx = elementWidth/(this.transformCanvas.w/this.renderConfig.dpr);
        this.transformCanvas.sy = elementHeight/(this.transformCanvas.h/this.renderConfig.dpr);
        this.transformCanvas.tx = 0;
        this.transformCanvas.ty = 0;
    }else{
        this.transformCanvas.sx = this.renderConfig.dpr;
        this.transformCanvas.sy = this.renderConfig.dpr;
        this.transformCanvas.tx = 0;
        this.transformCanvas.ty = 0;
    }
    this.transformCanvas.props = [this.transformCanvas.sx,0,0,0,0,this.transformCanvas.sy,0,0,0,0,1,0,this.transformCanvas.tx,this.transformCanvas.ty,0,1];
    /*var i, len = this.elements.length;
    for(i=0;i<len;i+=1){
        if(this.elements[i] && this.elements[i].data.ty === 0){
            this.elements[i].resize(this.globalData.transformCanvas);
        }
    }*/
    this.ctxTransform(this.transformCanvas.props);
    this.canvasContext.beginPath();
    this.canvasContext.rect(0,0,this.transformCanvas.w,this.transformCanvas.h);
    this.canvasContext.closePath();
    this.canvasContext.clip();

    this.renderFrame(this.renderedFrame, true);
};

CanvasRenderer.prototype.destroy = function () {
    if(this.renderConfig.clearCanvas) {
        this.animationItem.wrapper.innerHTML = '';
    }
    var i, len = this.layers ? this.layers.length : 0;
    for (i = len - 1; i >= 0; i-=1) {
        if(this.elements[i]) {
            this.elements[i].destroy();
        }
    }
    this.elements.length = 0;
    this.globalData.canvasContext = null;
    this.animationItem.container = null;
    this.destroyed = true;
};

CanvasRenderer.prototype.renderFrame = function(num, forceRender){
    if((this.renderedFrame === num && this.renderConfig.clearCanvas === true && !forceRender) || this.destroyed || num === -1){
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
    if(!this.completeLayers){
        this.checkLayers(num);
    }

    for (i = 0; i < len; i++) {
        if(this.completeLayers || this.elements[i]){
            this.elements[i].prepareFrame(num - this.layers[i].st);
        }
    }
    if(this.globalData._mdf) {
        if(this.renderConfig.clearCanvas === true){
            this.canvasContext.clearRect(0, 0, this.transformCanvas.w, this.transformCanvas.h);
        }else{
            this.save();
        }
        for (i = len - 1; i >= 0; i-=1) {
            if(this.completeLayers || this.elements[i]){
                this.elements[i].renderFrame();
            }
        }
        if(this.renderConfig.clearCanvas !== true){
            this.restore();
        }
    }
};

CanvasRenderer.prototype.buildItem = function(pos){
    var elements = this.elements;
    if(elements[pos] || this.layers[pos].ty == 99){
        return;
    }
    var element = this.createItem(this.layers[pos], this,this.globalData);
    elements[pos] = element;
    element.initExpressions();
    /*if(this.layers[pos].ty === 0){
        element.resize(this.globalData.transformCanvas);
    }*/
};

CanvasRenderer.prototype.checkPendingElements  = function(){
    while(this.pendingElements.length){
        var element = this.pendingElements.pop();
        element.checkParenting();
    }
};

CanvasRenderer.prototype.hide = function(){
    this.animationItem.container.style.display = 'none';
};

CanvasRenderer.prototype.show = function(){
    this.animationItem.container.style.display = 'block';
};

function SkiaCanvasRenderer(animationItem, config) {
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
    this.contextData = new SkiaContextData();
    this.elements = [];
    this.pendingElements = [];
    this.transformMat = new Matrix();
    this.completeLayers = false;
    this.rendererType = 'skia';
}
extendPrototype([BaseRenderer], SkiaCanvasRenderer);

SkiaCanvasRenderer.prototype.createShape = function (data) {
    return new SkiaShapeElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createText = function (data) {
    return new SkiaTextElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createImage = function (data) {
    return new SkiaImageElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createComp = function (data) {
    return new SkiaCompElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createSolid = function (data) {
    return new SkiaSolidElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createVideo = function (data) {
    return new SkiaVideoElement(data, this.globalData, this);
};

SkiaCanvasRenderer.prototype.createNull = SVGRenderer.prototype.createNull;


/**
 * 替换绘图的当前转换矩阵
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

/**
 * 检查数字数组是否有效
 */
SkiaCanvasRenderer.prototype.checkNumer = function (arr) {
    for (var b = 0; b < arr.length; b++)
        if (void 0 !== arr[b] && !Number.isFinite(arr[b]))
            return false;
    return true;
}

/**
 * 反转矩阵
 */
SkiaCanvasRenderer.prototype.invert = function (m) {
    var det = m[0] * m[4] * m[8] + m[1] * m[5] * m[6] + m[2] * m[3] * m[7]
        - m[2] * m[4] * m[6] - m[1] * m[3] * m[8] - m[0] * m[5] * m[7];
    if (!det) {
        return SKIA.CanvasKit().SkMatrix.identity();
    }
    return [
        (m[4] * m[8] - m[5] * m[7]) / det, (m[2] * m[7] - m[1] * m[8]) / det, (m[1] * m[5] - m[2] * m[4]) / det,
        (m[5] * m[6] - m[3] * m[8]) / det, (m[0] * m[8] - m[2] * m[6]) / det, (m[2] * m[3] - m[0] * m[5]) / det,
        (m[3] * m[7] - m[4] * m[6]) / det, (m[1] * m[6] - m[0] * m[7]) / det, (m[0] * m[4] - m[1] * m[3]) / det,
    ];
};

/**
 * 将当前转换重置为单位矩阵
 */
SkiaCanvasRenderer.prototype.resetTransform = function () {
    let mat = this.skcanvas.getTotalMatrix();
    mat = this.invert(mat);
    //(!mat) && (mat = SKIA.CanvasKit().SkMatrix.identity());
    this.skcanvas.concat(mat);

};

/**
 * 将当前转换重置为单位矩阵。然后运行 transform()。
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

        this.animationItem.container.setAttribute('width', this.animationItem.wrapper.style.width);
        this.animationItem.container.setAttribute('height', this.animationItem.wrapper.style.height);

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

        this.surface = SKIA.CanvasKit().MakeCanvasSurface(this.animationItem.container.id);
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

    this.skcanvas.clipRect(SKIA.CanvasKit().XYWHRect(0, 0, this.transformCanvas.w, this.transformCanvas.h), SKIA.CanvasKit().ClipOp.Intersect, true);

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

    this.surface.delete();
};

// 在给定的矩形内清除指定的像素
SkiaCanvasRenderer.prototype.clearRect = function (x, y, width, height) {
    var CK = SKIA.CanvasKit();
    const paint = new CK.SkPaint();
    paint.setStyle(SKIA.CanvasKit().PaintStyle.Fill);
    paint.setBlendMode(SKIA.CanvasKit().BlendMode.Clear);
    this.skcanvas.drawRect(SKIA.CanvasKit().XYWHRect(x, y, width, height), paint);
    paint.delete();
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
    var hasVideo = false;
    for (i = 0; i < len; i++) {
        if (this.completeLayers || this.elements[i]) {
            this.elements[i].prepareFrame(num - this.layers[i].st);
        }
        if (this.layers[i].ty == 9) {
            hasVideo = true;
        }
    }
    if (this.globalData._mdf || hasVideo) {
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
    this.skcanvas.flush();
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

function HybridRenderer(animationItem, config){
    this.animationItem = animationItem;
    this.layers = null;
    this.renderedFrame = -1;
    this.renderConfig = {
        className: (config && config.className) || '',
        imagePreserveAspectRatio: (config && config.imagePreserveAspectRatio) || 'xMidYMid slice',
        hideOnTransparent: (config && config.hideOnTransparent === false) ? false : true
    };
    this.globalData = {
        _mdf: false,
        frameNum: -1,
        renderConfig: this.renderConfig
    };
    this.pendingElements = [];
    this.elements = [];
    this.threeDElements = [];
    this.destroyed = false;
    this.camera = null;
    this.supports3d = true;
    this.rendererType = 'html';

}

extendPrototype([BaseRenderer],HybridRenderer);

HybridRenderer.prototype.buildItem = SVGRenderer.prototype.buildItem;

HybridRenderer.prototype.checkPendingElements  = function(){
    while(this.pendingElements.length){
        var element = this.pendingElements.pop();
        element.checkParenting();
    }
};

HybridRenderer.prototype.appendElementInPos = function(element, pos){
    var newDOMElement = element.getBaseElement();
    if(!newDOMElement){
        return;
    }
    var layer = this.layers[pos];
    if(!layer.ddd || !this.supports3d){
        if(this.threeDElements) {
            this.addTo3dContainer(newDOMElement,pos);
        } else {
            var i = 0;
            var nextDOMElement, nextLayer, tmpDOMElement;
            while(i<pos){
                if(this.elements[i] && this.elements[i]!== true && this.elements[i].getBaseElement){
                    nextLayer = this.elements[i];
                    tmpDOMElement = this.layers[i].ddd ? this.getThreeDContainerByPos(i) : nextLayer.getBaseElement();
                    nextDOMElement = tmpDOMElement || nextDOMElement;
                }
                i += 1;
            }
            if(nextDOMElement){
                if(!layer.ddd || !this.supports3d){
                    this.layerElement.insertBefore(newDOMElement, nextDOMElement);
                }
            } else {
                if(!layer.ddd || !this.supports3d){
                    this.layerElement.appendChild(newDOMElement);
                }
            }
        }
        
    } else {
        this.addTo3dContainer(newDOMElement,pos);
    }
};

HybridRenderer.prototype.createShape = function (data) {
    if(!this.supports3d){
        return new SVGShapeElement(data, this.globalData, this);
    }
    return new HShapeElement(data, this.globalData, this);
};

HybridRenderer.prototype.createText = function (data) {
    if(!this.supports3d){
        return new SVGTextElement(data, this.globalData, this);
    }
    return new HTextElement(data, this.globalData, this);
};

HybridRenderer.prototype.createCamera = function (data) {
    this.camera = new HCameraElement(data, this.globalData, this);
    return this.camera;
};

HybridRenderer.prototype.createImage = function (data) {
    if(!this.supports3d){
        return new IImageElement(data, this.globalData, this);
    }
    return new HImageElement(data, this.globalData, this);
};

HybridRenderer.prototype.createComp = function (data) {
    if(!this.supports3d){
        return new SVGCompElement(data, this.globalData, this);
    }
    return new HCompElement(data, this.globalData, this);

};

HybridRenderer.prototype.createSolid = function (data) {
    if(!this.supports3d){
        return new ISolidElement(data, this.globalData, this);
    }
    return new HSolidElement(data, this.globalData, this);
};

HybridRenderer.prototype.createNull = SVGRenderer.prototype.createNull;

HybridRenderer.prototype.getThreeDContainerByPos = function(pos){
    var i = 0, len = this.threeDElements.length;
    while(i<len) {
        if(this.threeDElements[i].startPos <= pos && this.threeDElements[i].endPos >= pos) {
            return this.threeDElements[i].perspectiveElem;
        }
        i += 1;
    }
};

HybridRenderer.prototype.createThreeDContainer = function(pos, type){
    var perspectiveElem = createTag('div');
    styleDiv(perspectiveElem);
    var container = createTag('div');
    styleDiv(container);
    if(type === '3d') {
        perspectiveElem.style.width = this.globalData.compSize.w+'px';
        perspectiveElem.style.height = this.globalData.compSize.h+'px';
        perspectiveElem.style.transformOrigin = perspectiveElem.style.mozTransformOrigin = perspectiveElem.style.webkitTransformOrigin = "50% 50%";
        container.style.transform = container.style.webkitTransform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)';
    }
    
    perspectiveElem.appendChild(container);
    //this.resizerElem.appendChild(perspectiveElem);
    var threeDContainerData = {
        container:container,
        perspectiveElem:perspectiveElem,
        startPos: pos,
        endPos: pos,
        type: type
    };
    this.threeDElements.push(threeDContainerData);
    return threeDContainerData;
};

HybridRenderer.prototype.build3dContainers = function(){
    var i, len = this.layers.length;
    var lastThreeDContainerData;
    var currentContainer = '';
    for(i=0;i<len;i+=1){
        if(this.layers[i].ddd && this.layers[i].ty !== 3){
            if(currentContainer !== '3d'){
                currentContainer = '3d';
                lastThreeDContainerData = this.createThreeDContainer(i,'3d');
            }
            lastThreeDContainerData.endPos = Math.max(lastThreeDContainerData.endPos,i);
        } else {
            if(currentContainer !== '2d'){
                currentContainer = '2d';
                lastThreeDContainerData = this.createThreeDContainer(i,'2d');
            }
            lastThreeDContainerData.endPos = Math.max(lastThreeDContainerData.endPos,i);
        }
    }
    len = this.threeDElements.length;
    for(i = len - 1; i >= 0; i --) {
        this.resizerElem.appendChild(this.threeDElements[i].perspectiveElem);
    }
};

HybridRenderer.prototype.addTo3dContainer = function(elem,pos){
    var i = 0, len = this.threeDElements.length;
    while(i<len){
        if(pos <= this.threeDElements[i].endPos){
            var j = this.threeDElements[i].startPos;
            var nextElement;
            while(j<pos){
                if(this.elements[j] && this.elements[j].getBaseElement){
                    nextElement = this.elements[j].getBaseElement();
                }
                j += 1;
            }
            if(nextElement){
                this.threeDElements[i].container.insertBefore(elem, nextElement);
            } else {
                this.threeDElements[i].container.appendChild(elem);
            }
            break;
        }
        i += 1;
    }
};

HybridRenderer.prototype.configAnimation = function(animData){
    var resizerElem = createTag('div');
    var wrapper = this.animationItem.wrapper;
    resizerElem.style.width = animData.w+'px';
    resizerElem.style.height = animData.h+'px';
    this.resizerElem = resizerElem;
    styleDiv(resizerElem);
    resizerElem.style.transformStyle = resizerElem.style.webkitTransformStyle = resizerElem.style.mozTransformStyle = "flat";
    if(this.renderConfig.className) {
      resizerElem.setAttribute('class', this.renderConfig.className);
    }
    wrapper.appendChild(resizerElem);

    resizerElem.style.overflow = 'hidden';
    var svg = createNS('svg');
    svg.setAttribute('width','1');
    svg.setAttribute('height','1');
    styleDiv(svg);
    this.resizerElem.appendChild(svg);
    var defs = createNS('defs');
    svg.appendChild(defs);
    this.data = animData;
    //Mask animation
    this.setupGlobalData(animData, svg);
    this.globalData.defs = defs;
    this.layers = animData.layers;
    this.layerElement = this.resizerElem;
    this.build3dContainers();
    this.updateContainerSize();
};

HybridRenderer.prototype.destroy = function () {
    this.animationItem.wrapper.innerHTML = '';
    this.animationItem.container = null;
    this.globalData.defs = null;
    var i, len = this.layers ? this.layers.length : 0;
    for (i = 0; i < len; i++) {
        this.elements[i].destroy();
    }
    this.elements.length = 0;
    this.destroyed = true;
    this.animationItem = null;
};

HybridRenderer.prototype.updateContainerSize = function () {
    var elementWidth = this.animationItem.wrapper.offsetWidth;
    var elementHeight = this.animationItem.wrapper.offsetHeight;
    var elementRel = elementWidth/elementHeight;
    var animationRel = this.globalData.compSize.w/this.globalData.compSize.h;
    var sx,sy,tx,ty;
    if(animationRel>elementRel){
        sx = elementWidth/(this.globalData.compSize.w);
        sy = elementWidth/(this.globalData.compSize.w);
        tx = 0;
        ty = ((elementHeight-this.globalData.compSize.h*(elementWidth/this.globalData.compSize.w))/2);
    }else{
        sx = elementHeight/(this.globalData.compSize.h);
        sy = elementHeight/(this.globalData.compSize.h);
        tx = (elementWidth-this.globalData.compSize.w*(elementHeight/this.globalData.compSize.h))/2;
        ty = 0;
    }
    this.resizerElem.style.transform = this.resizerElem.style.webkitTransform = 'matrix3d(' + sx + ',0,0,0,0,'+sy+',0,0,0,0,1,0,'+tx+','+ty+',0,1)';
};

HybridRenderer.prototype.renderFrame = SVGRenderer.prototype.renderFrame;

HybridRenderer.prototype.hide = function(){
    this.resizerElem.style.display = 'none';
};

HybridRenderer.prototype.show = function(){
    this.resizerElem.style.display = 'block';
};

HybridRenderer.prototype.initItems = function(){
    this.buildAllItems();
    if(this.camera){
        this.camera.setup();
    } else {
        var cWidth = this.globalData.compSize.w;
        var cHeight = this.globalData.compSize.h;
        var i, len = this.threeDElements.length;
        for(i=0;i<len;i+=1){
            this.threeDElements[i].perspectiveElem.style.perspective = this.threeDElements[i].perspectiveElem.style.webkitPerspective = Math.sqrt(Math.pow(cWidth,2) + Math.pow(cHeight,2)) + 'px';
        }
    }
};

HybridRenderer.prototype.searchExtraCompositions = function(assets){
    var i, len = assets.length;
    var floatingContainer = createTag('div');
    for(i=0;i<len;i+=1){
        if(assets[i].xt){
            var comp = this.createComp(assets[i],floatingContainer,this.globalData.comp,null);
            comp.initExpressions();
            this.globalData.projectInterface.registerComposition(comp);
        }
    }
};

function MaskElement(data,element,globalData) {
    this.data = data;
    this.element = element;
    this.globalData = globalData;
    this.storedData = [];
    this.masksProperties = this.data.masksProperties || [];
    this.maskElement = null;
    var defs = this.globalData.defs;
    var i, len = this.masksProperties ? this.masksProperties.length : 0;
    this.viewData = createSizedArray(len);
    this.solidPath = '';


    var path, properties = this.masksProperties;
    var count = 0;
    var currentMasks = [];
    var j, jLen;
    var layerId = createElementID();
    var rect, expansor, feMorph,x;
    var maskType = 'clipPath', maskRef = 'clip-path';
    for (i = 0; i < len; i++) {
        if((properties[i].mode !== 'a' && properties[i].mode !== 'n')|| properties[i].inv || properties[i].o.k !== 100 || properties[i].o.x){
            maskType = 'mask';
            maskRef = 'mask';
        }

        if((properties[i].mode == 's' || properties[i].mode == 'i') && count === 0){
            rect = createNS( 'rect');
            rect.setAttribute('fill', '#ffffff');
            rect.setAttribute('width', this.element.comp.data.w || 0);
            rect.setAttribute('height', this.element.comp.data.h || 0);
            currentMasks.push(rect);
        } else {
            rect = null;
        }

        path = createNS( 'path');
        if(properties[i].mode == 'n') {
            // TODO move this to a factory or to a constructor
            this.viewData[i] = {
                op: PropertyFactory.getProp(this.element,properties[i].o,0,0.01,this.element),
                prop: ShapePropertyFactory.getShapeProp(this.element,properties[i],3),
                elem: path,
                lastPath: ''
            };
            defs.appendChild(path);
            continue;
        }
        count += 1;

        path.setAttribute('fill', properties[i].mode === 's' ? '#000000':'#ffffff');
        path.setAttribute('clip-rule','nonzero');
        var filterID;

        if (properties[i].x.k !== 0) {
            maskType = 'mask';
            maskRef = 'mask';
            x = PropertyFactory.getProp(this.element,properties[i].x,0,null,this.element);
            filterID = createElementID();
            expansor = createNS('filter');
            expansor.setAttribute('id',filterID);
            feMorph = createNS('feMorphology');
            feMorph.setAttribute('operator','erode');
            feMorph.setAttribute('in','SourceGraphic');
            feMorph.setAttribute('radius','0');
            expansor.appendChild(feMorph);
            defs.appendChild(expansor);
            path.setAttribute('stroke', properties[i].mode === 's' ? '#000000':'#ffffff');
        } else {
            feMorph = null;
            x = null;
        }

        // TODO move this to a factory or to a constructor
        this.storedData[i] = {
             elem: path,
             x: x,
             expan: feMorph,
            lastPath: '',
            lastOperator:'',
            filterId:filterID,
            lastRadius:0
        };
        if(properties[i].mode == 'i'){
            jLen = currentMasks.length;
            var g = createNS('g');
            for(j=0;j<jLen;j+=1){
                g.appendChild(currentMasks[j]);
            }
            var mask = createNS('mask');
            mask.setAttribute('mask-type','alpha');
            mask.setAttribute('id',layerId+'_'+count);
            mask.appendChild(path);
            defs.appendChild(mask);
            g.setAttribute('mask','url(' + locationHref + '#'+layerId+'_'+count+')');

            currentMasks.length = 0;
            currentMasks.push(g);
        }else{
            currentMasks.push(path);
        }
        if(properties[i].inv && !this.solidPath){
            this.solidPath = this.createLayerSolidPath();
        }
        // TODO move this to a factory or to a constructor
        this.viewData[i] = {
            elem: path,
            lastPath: '',
            op: PropertyFactory.getProp(this.element,properties[i].o,0,0.01,this.element),
            prop:ShapePropertyFactory.getShapeProp(this.element,properties[i],3),
            invRect: rect
        };
        if(!this.viewData[i].prop.k){
            this.drawPath(properties[i],this.viewData[i].prop.v,this.viewData[i]);
        }
    }

    this.maskElement = createNS( maskType);

    len = currentMasks.length;
    for(i=0;i<len;i+=1){
        this.maskElement.appendChild(currentMasks[i]);
    }

    if(count > 0){
        this.maskElement.setAttribute('id', layerId);
        this.element.maskedElement.setAttribute(maskRef, "url(" + locationHref + "#" + layerId + ")");
        defs.appendChild(this.maskElement);
    }
    if (this.viewData.length) {
        this.element.addRenderableComponent(this);
    }

}

MaskElement.prototype.getMaskProperty = function(pos){
    return this.viewData[pos].prop;
};

MaskElement.prototype.renderFrame = function (isFirstFrame) {
    var finalMat = this.element.finalTransform.mat;
    var i, len = this.masksProperties.length;
    for (i = 0; i < len; i++) {
        if(this.viewData[i].prop._mdf || isFirstFrame){
            this.drawPath(this.masksProperties[i],this.viewData[i].prop.v,this.viewData[i]);
        }
        if(this.viewData[i].op._mdf || isFirstFrame){
            this.viewData[i].elem.setAttribute('fill-opacity',this.viewData[i].op.v);
        }
        if(this.masksProperties[i].mode !== 'n'){
            if(this.viewData[i].invRect && (this.element.finalTransform.mProp._mdf || isFirstFrame)){
                this.viewData[i].invRect.setAttribute('transform', finalMat.getInverseMatrix().to2dCSS())
            }
            if(this.storedData[i].x && (this.storedData[i].x._mdf || isFirstFrame)){
                var feMorph = this.storedData[i].expan;
                if(this.storedData[i].x.v < 0){
                    if(this.storedData[i].lastOperator !== 'erode'){
                        this.storedData[i].lastOperator = 'erode';
                        this.storedData[i].elem.setAttribute('filter','url(' + locationHref + '#'+this.storedData[i].filterId+')');
                    }
                    feMorph.setAttribute('radius',-this.storedData[i].x.v);
                }else{
                    if(this.storedData[i].lastOperator !== 'dilate'){
                        this.storedData[i].lastOperator = 'dilate';
                        this.storedData[i].elem.setAttribute('filter',null);
                    }
                    this.storedData[i].elem.setAttribute('stroke-width', this.storedData[i].x.v*2);

                }
            }
        }
    }
};

MaskElement.prototype.getMaskelement = function () {
    return this.maskElement;
};

MaskElement.prototype.createLayerSolidPath = function(){
    var path = 'M0,0 ';
    path += ' h' + this.globalData.compSize.w ;
    path += ' v' + this.globalData.compSize.h ;
    path += ' h-' + this.globalData.compSize.w ;
    path += ' v-' + this.globalData.compSize.h + ' ';
    return path;
};

MaskElement.prototype.drawPath = function(pathData,pathNodes,viewData){
    var pathString = " M"+pathNodes.v[0][0]+','+pathNodes.v[0][1];
    var i, len;
    len = pathNodes._length;
    for(i=1;i<len;i+=1){
        //pathString += " C"+pathNodes.o[i-1][0]+','+pathNodes.o[i-1][1] + " "+pathNodes.i[i][0]+','+pathNodes.i[i][1] + " "+pathNodes.v[i][0]+','+pathNodes.v[i][1];
        pathString += " C"+pathNodes.o[i-1][0]+','+pathNodes.o[i-1][1] + " "+pathNodes.i[i][0]+','+pathNodes.i[i][1] + " "+pathNodes.v[i][0]+','+pathNodes.v[i][1];
    }
        //pathString += " C"+pathNodes.o[i-1][0]+','+pathNodes.o[i-1][1] + " "+pathNodes.i[0][0]+','+pathNodes.i[0][1] + " "+pathNodes.v[0][0]+','+pathNodes.v[0][1];
    if(pathNodes.c && len > 1){
        pathString += " C"+pathNodes.o[i-1][0]+','+pathNodes.o[i-1][1] + " "+pathNodes.i[0][0]+','+pathNodes.i[0][1] + " "+pathNodes.v[0][0]+','+pathNodes.v[0][1];
    }
    //pathNodes.__renderedString = pathString;

    if(viewData.lastPath !== pathString){
        var pathShapeValue = '';
        if(viewData.elem){
            if(pathNodes.c){
                pathShapeValue = pathData.inv ? this.solidPath + pathString : pathString;
            }
            viewData.elem.setAttribute('d',pathShapeValue);
        }
        viewData.lastPath = pathString;
    }
};

MaskElement.prototype.destroy = function(){
    this.element = null;
    this.globalData = null;
    this.maskElement = null;
    this.data = null;
    this.masksProperties = null;
};

/**
 * @file 
 * Handles AE's layer parenting property.
 *
 */

function HierarchyElement(){}

HierarchyElement.prototype = {
	/**
     * @function 
     * Initializes hierarchy properties
     *
     */
	initHierarchy: function() {
		//element's parent list
	    this.hierarchy = [];
	    //if element is parent of another layer _isParent will be true
	    this._isParent = false;
	    this.checkParenting();
	},
	/**
     * @function 
     * Sets layer's hierarchy.
     * @param {array} hierarch
     * layer's parent list
     *
     */ 
	setHierarchy: function(hierarchy){
	    this.hierarchy = hierarchy;
	},
	/**
     * @function 
     * Sets layer as parent.
     *
     */ 
	setAsParent: function() {
	    this._isParent = true;
	},
	/**
     * @function 
     * Searches layer's parenting chain
     *
     */ 
	checkParenting: function(){
	    if (this.data.parent !== undefined){
	        this.comp.buildElementParenting(this, this.data.parent, []);
	    }
	}
};
/**
 * @file 
 * Handles element's layer frame update.
 * Checks layer in point and out point
 *
 */

function FrameElement(){}

FrameElement.prototype = {
    /**
     * @function 
     * Initializes frame related properties.
     *
     */
    initFrame: function(){
        //set to true when inpoint is rendered
        this._isFirstFrame = false;
        //list of animated properties
        this.dynamicProperties = [];
        // If layer has been modified in current tick this will be true
        this._mdf = false;
    },
    /**
     * @function 
     * Calculates all dynamic values
     *
     * @param {number} num
     * current frame number in Layer's time
     * @param {boolean} isVisible
     * if layers is currently in range
     * 
     */
    prepareProperties: function(num, isVisible) {
        var i, len = this.dynamicProperties.length;
        for (i = 0;i < len; i += 1) {
            if (isVisible || (this._isParent && this.dynamicProperties[i].propType === 'transform')) {
                this.dynamicProperties[i].getValue();
                if (this.dynamicProperties[i]._mdf) {
                    this.globalData._mdf = true;
                    this._mdf = true;
                }
            }
        }
    },
    addDynamicProperty: function(prop) {
        if(this.dynamicProperties.indexOf(prop) === -1) {
            this.dynamicProperties.push(prop);
        }
    }
};
function TransformElement(){}

TransformElement.prototype = {
    initTransform: function() {
        this.finalTransform = {
            mProp: this.data.ks ? TransformPropertyFactory.getTransformProperty(this, this.data.ks, this) : {o:0},
            _matMdf: false,
            _opMdf: false,
            mat: new Matrix()
        };
        if (this.data.ao) {
            this.finalTransform.mProp.autoOriented = true;
        }

        //TODO: check TYPE 11: Guided elements
        if (this.data.ty !== 11) {
            //this.createElements();
        }
    },
    renderTransform: function() {

        this.finalTransform._opMdf = this.finalTransform.mProp.o._mdf || this._isFirstFrame;
        this.finalTransform._matMdf = this.finalTransform.mProp._mdf || this._isFirstFrame;

        if (this.hierarchy) {
            var mat;
            var finalMat = this.finalTransform.mat;
            var i = 0, len = this.hierarchy.length;
            //Checking if any of the transformation matrices in the hierarchy chain has changed.
            if (!this.finalTransform._matMdf) {
                while (i < len) {
                    if (this.hierarchy[i].finalTransform.mProp._mdf) {
                        this.finalTransform._matMdf = true;
                        break;
                    }
                    i += 1;
                }
            }
            
            if (this.finalTransform._matMdf) {
                mat = this.finalTransform.mProp.v.props;
                finalMat.cloneFromProps(mat);
                for (i = 0; i < len; i += 1) {
                    mat = this.hierarchy[i].finalTransform.mProp.v.props;
                    finalMat.transform(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
                }
            }
        }
    },
    globalToLocal: function(pt) {
        var transforms = [];
        transforms.push(this.finalTransform);
        var flag = true;
        var comp = this.comp;
        while (flag) {
            if (comp.finalTransform) {
                if (comp.data.hasMask) {
                    transforms.splice(0, 0, comp.finalTransform);
                }
                comp = comp.comp;
            } else {
                flag = false;
            }
        }
        var i, len = transforms.length,ptNew;
        for (i = 0; i < len; i += 1) {
            ptNew = transforms[i].mat.applyToPointArray(0, 0, 0);
            //ptNew = transforms[i].mat.applyToPointArray(pt[0],pt[1],pt[2]);
            pt = [pt[0] - ptNew[0], pt[1] - ptNew[1], 0];
        }
        return pt;
    },
    mHelper: new Matrix()
};
function RenderableElement(){

}

RenderableElement.prototype = {
    initRenderable: function() {
        //layer's visibility related to inpoint and outpoint. Rename isVisible to isInRange
        this.isInRange = false;
        //layer's display state
        this.hidden = false;
        // If layer's transparency equals 0, it can be hidden
        this.isTransparent = false;
        //list of animated components
        this.renderableComponents = [];
    },
    addRenderableComponent: function(component) {
        if(this.renderableComponents.indexOf(component) === -1) {
            this.renderableComponents.push(component);
        }
    },
    removeRenderableComponent: function(component) {
        if(this.renderableComponents.indexOf(component) !== -1) {
            this.renderableComponents.splice(this.renderableComponents.indexOf(component), 1);
        }
    },
    prepareRenderableFrame: function(num) {
        this.checkLayerLimits(num);
    },
    checkTransparency: function(){
        if(this.finalTransform.mProp.o.v <= 0) {
            if(!this.isTransparent && this.globalData.renderConfig.hideOnTransparent){
                this.isTransparent = true;
                this.hide();
            }
        } else if(this.isTransparent) {
            this.isTransparent = false;
            this.show();
        }
    },
    /**
     * @function 
     * Initializes frame related properties.
     *
     * @param {number} num
     * current frame number in Layer's time
     * 
     */
    checkLayerLimits: function(num) {
        if(this.data.ip - this.data.st <= num && this.data.op - this.data.st > num)
        {
            if(this.isInRange !== true){
                this.globalData._mdf = true;
                this._mdf = true;
                this.isInRange = true;
                this.show();
            }
        } else {
            if(this.isInRange !== false){
                this.globalData._mdf = true;
                this.isInRange = false;
                this.hide();
            }
        }
    },
    renderRenderable: function() {
        var i, len = this.renderableComponents.length;
        for(i = 0; i < len; i += 1) {
            this.renderableComponents[i].renderFrame(this._isFirstFrame);
        }
        /*this.maskManager.renderFrame(this.finalTransform.mat);
        this.renderableEffectsManager.renderFrame(this._isFirstFrame);*/
    },
    sourceRectAtTime: function(){
        return {
            top:0,
            left:0,
            width:100,
            height:100
        };
    },
    getLayerSize: function(){
        if(this.data.ty === 5){
            return {w:this.data.textData.width,h:this.data.textData.height};
        }else{
            return {w:this.data.width,h:this.data.height};
        }
    }
};
function RenderableDOMElement() {}

(function(){
    var _prototype = {
        initElement: function(data,globalData,comp) {
            this.initFrame();
            this.initBaseData(data, globalData, comp);
            this.initTransform(data, globalData, comp);
            this.initHierarchy();
            this.initRenderable();
            this.initRendererElement();
            this.createContainerElements();
            this.createRenderableComponents();
            this.createContent();
            this.hide();
        },
        hide: function(){
            if (!this.hidden && (!this.isInRange || this.isTransparent)) {
                var elem = this.baseElement || this.layerElement;
                elem.style.display = 'none';
                this.hidden = true;
            }
        },
        show: function(){
            if (this.isInRange && !this.isTransparent){
                if (!this.data.hd) {
                    var elem = this.baseElement || this.layerElement;
                    elem.style.display = 'block';
                }
                this.hidden = false;
                this._isFirstFrame = true;
            }
        },
        renderFrame: function() {
            //If it is exported as hidden (data.hd === true) no need to render
            //If it is not visible no need to render
            if (this.data.hd || this.hidden) {
                return;
            }
            this.renderTransform();
            this.renderRenderable();
            this.renderElement();
            this.renderInnerContent();
            if (this._isFirstFrame) {
                this._isFirstFrame = false;
            }
        },
        renderInnerContent: function() {},
        prepareFrame: function(num) {
            this._mdf = false;
            this.prepareRenderableFrame(num);
            this.prepareProperties(num, this.isInRange);
            this.checkTransparency();
        },
        destroy: function(){
            this.innerElem =  null;
            this.destroyBaseElement();
        }
    };
    extendPrototype([RenderableElement, createProxyFunction(_prototype)], RenderableDOMElement);
}());
function ProcessedElement(element, position) {
	this.elem = element;
	this.pos = position;
}
function SVGStyleData(data, level) {
	this.data = data;
	this.type = data.ty;
	this.d = '';
	this.lvl = level;
	this._mdf = false;
	this.closed = data.hd === true;
	this.pElem = createNS('path');
	this.msElem = null;
}

SVGStyleData.prototype.reset = function() {
	this.d = '';
	this._mdf = false;
};
function SVGShapeData(transformers, level, shape) {
    this.caches = [];
    this.styles = [];
    this.transformers = transformers;
    this.lStr = '';
    this.sh = shape;
    this.lvl = level;
    //TODO find if there are some cases where _isAnimated can be false. 
    // For now, since shapes add up with other shapes. They have to be calculated every time.
    // One way of finding out is checking if all styles associated to this shape depend only of this shape
    this._isAnimated = !!shape.k;
    // TODO: commenting this for now since all shapes are animated
    var i = 0, len = transformers.length;
    while(i < len) {
    	if(transformers[i].mProps.dynamicProperties.length) {
    		this._isAnimated = true;
    		break;
    	}
    	i += 1;
    }
}

SVGShapeData.prototype.setAsAnimated = function() {
    this._isAnimated = true;
}
function SVGTransformData(mProps, op, container) {
	this.transform = {
		mProps: mProps,
		op: op,
		container: container
	};
	this.elements = [];
    this._isAnimated = this.transform.mProps.dynamicProperties.length || this.transform.op.effectsSequence.length;
}
function SVGStrokeStyleData(elem, data, styleOb){
	this.initDynamicPropertyContainer(elem);
	this.getValue = this.iterateDynamicProperties;
	this.o = PropertyFactory.getProp(elem,data.o,0,0.01,this);
	this.w = PropertyFactory.getProp(elem,data.w,0,null,this);
	this.d = new DashProperty(elem,data.d||{},'svg',this);
	this.c = PropertyFactory.getProp(elem,data.c,1,255,this);
	this.style = styleOb;
    this._isAnimated = !!this._isAnimated;
}

extendPrototype([DynamicPropertyContainer], SVGStrokeStyleData);
function SVGFillStyleData(elem, data, styleOb){
	this.initDynamicPropertyContainer(elem);
	this.getValue = this.iterateDynamicProperties;
	this.o = PropertyFactory.getProp(elem,data.o,0,0.01,this);
	this.c = PropertyFactory.getProp(elem,data.c,1,255,this);
	this.style = styleOb;
}

extendPrototype([DynamicPropertyContainer], SVGFillStyleData);
function SVGGradientFillStyleData(elem, data, styleOb){
    this.initDynamicPropertyContainer(elem);
    this.getValue = this.iterateDynamicProperties;
    this.initGradientData(elem, data, styleOb);
}

SVGGradientFillStyleData.prototype.initGradientData = function(elem, data, styleOb){
    this.o = PropertyFactory.getProp(elem,data.o,0,0.01,this);
    this.s = PropertyFactory.getProp(elem,data.s,1,null,this);
    this.e = PropertyFactory.getProp(elem,data.e,1,null,this);
    this.h = PropertyFactory.getProp(elem,data.h||{k:0},0,0.01,this);
    this.a = PropertyFactory.getProp(elem,data.a||{k:0},0,degToRads,this);
    this.g = new GradientProperty(elem,data.g,this);
    this.style = styleOb;
    this.stops = [];
    this.setGradientData(styleOb.pElem, data);
    this.setGradientOpacity(data, styleOb);
    this._isAnimated = !!this._isAnimated;

};

SVGGradientFillStyleData.prototype.setGradientData = function(pathElement,data){

    var gradientId = createElementID();
    var gfill = createNS(data.t === 1 ? 'linearGradient' : 'radialGradient');
    gfill.setAttribute('id',gradientId);
    gfill.setAttribute('spreadMethod','pad');
    gfill.setAttribute('gradientUnits','userSpaceOnUse');
    var stops = [];
    var stop, j, jLen;
    jLen = data.g.p*4;
    for(j=0;j<jLen;j+=4){
        stop = createNS('stop');
        gfill.appendChild(stop);
        stops.push(stop);
    }
    pathElement.setAttribute( data.ty === 'gf' ? 'fill':'stroke','url(' + locationHref + '#'+gradientId+')');
    
    this.gf = gfill;
    this.cst = stops;
};

SVGGradientFillStyleData.prototype.setGradientOpacity = function(data, styleOb){
    if(this.g._hasOpacity && !this.g._collapsable){
        var stop, j, jLen;
        var mask = createNS("mask");
        var maskElement = createNS( 'path');
        mask.appendChild(maskElement);
        var opacityId = createElementID();
        var maskId = createElementID();
        mask.setAttribute('id',maskId);
        var opFill = createNS(data.t === 1 ? 'linearGradient' : 'radialGradient');
        opFill.setAttribute('id',opacityId);
        opFill.setAttribute('spreadMethod','pad');
        opFill.setAttribute('gradientUnits','userSpaceOnUse');
        jLen = data.g.k.k[0].s ? data.g.k.k[0].s.length : data.g.k.k.length;
        var stops = this.stops;
        for(j=data.g.p*4;j<jLen;j+=2){
            stop = createNS('stop');
            stop.setAttribute('stop-color','rgb(255,255,255)');
            opFill.appendChild(stop);
            stops.push(stop);
        }
        maskElement.setAttribute( data.ty === 'gf' ? 'fill':'stroke','url(' + locationHref + '#'+opacityId+')');
        this.of = opFill;
        this.ms = mask;
        this.ost = stops;
        this.maskId = maskId;
        styleOb.msElem = maskElement;
    }
};

extendPrototype([DynamicPropertyContainer], SVGGradientFillStyleData);
function SVGGradientStrokeStyleData(elem, data, styleOb){
	this.initDynamicPropertyContainer(elem);
	this.getValue = this.iterateDynamicProperties;
	this.w = PropertyFactory.getProp(elem,data.w,0,null,this);
	this.d = new DashProperty(elem,data.d||{},'svg',this);
    this.initGradientData(elem, data, styleOb);
    this._isAnimated = !!this._isAnimated;
}

extendPrototype([SVGGradientFillStyleData, DynamicPropertyContainer], SVGGradientStrokeStyleData);
function ShapeGroupData() {
	this.it = [];
    this.prevViewData = [];
    this.gr = createNS('g');
}
var SVGElementsRenderer = (function() {
	var _identityMatrix = new Matrix();
	var _matrixHelper = new Matrix();

	var ob = {
		createRenderFunction: createRenderFunction
	}

	function createRenderFunction(data) {
	    var ty = data.ty;
	    switch(data.ty) {
	        case 'fl':
	        return renderFill;
	        case 'gf':
	        return renderGradient;
	        case 'gs':
	        return renderGradientStroke;
	        case 'st':
	        return renderStroke;
	        case 'sh':
	        case 'el':
	        case 'rc':
	        case 'sr':
	        return renderPath;
	        case 'tr':
	        return renderContentTransform;
	    }
	}

	function renderContentTransform(styleData, itemData, isFirstFrame) {
	    if(isFirstFrame || itemData.transform.op._mdf){
	        itemData.transform.container.setAttribute('opacity',itemData.transform.op.v);
	    }
	    if(isFirstFrame || itemData.transform.mProps._mdf){
	        itemData.transform.container.setAttribute('transform',itemData.transform.mProps.v.to2dCSS());
	    }
	}

	function renderPath(styleData, itemData, isFirstFrame) {
	    var j, jLen,pathStringTransformed,redraw,pathNodes,l, lLen = itemData.styles.length;
	    var lvl = itemData.lvl;
	    var paths, mat, props, iterations, k;
	    for(l=0;l<lLen;l+=1){
	        redraw = itemData.sh._mdf || isFirstFrame;
	        if(itemData.styles[l].lvl < lvl){
	            mat = _matrixHelper.reset();
	            iterations = lvl - itemData.styles[l].lvl;
	            k = itemData.transformers.length-1;
	            while(!redraw && iterations > 0) {
	                redraw = itemData.transformers[k].mProps._mdf || redraw;
	                iterations --;
	                k --;
	            }
	            if(redraw) {
	                iterations = lvl - itemData.styles[l].lvl;
	                k = itemData.transformers.length-1;
	                while(iterations > 0) {
	                    props = itemData.transformers[k].mProps.v.props;
	                    mat.transform(props[0],props[1],props[2],props[3],props[4],props[5],props[6],props[7],props[8],props[9],props[10],props[11],props[12],props[13],props[14],props[15]);
	                    iterations --;
	                    k --;
	                }
	            }
	        } else {
	            mat = _identityMatrix;
	        }
	        paths = itemData.sh.paths;
	        jLen = paths._length;
	        if(redraw){
	            pathStringTransformed = '';
	            for(j=0;j<jLen;j+=1){
	                pathNodes = paths.shapes[j];
	                if(pathNodes && pathNodes._length){
	                    pathStringTransformed += buildShapeString(pathNodes, pathNodes._length, pathNodes.c, mat);
	                }
	            }
	            itemData.caches[l] = pathStringTransformed;
	        } else {
	            pathStringTransformed = itemData.caches[l];
	        }
	        itemData.styles[l].d += styleData.hd === true ? '' : pathStringTransformed;
	        itemData.styles[l]._mdf = redraw || itemData.styles[l]._mdf;
	    }
	}

	function renderFill (styleData,itemData, isFirstFrame){
	    var styleElem = itemData.style;

	    if(itemData.c._mdf || isFirstFrame){
	        styleElem.pElem.setAttribute('fill','rgb('+bm_floor(itemData.c.v[0])+','+bm_floor(itemData.c.v[1])+','+bm_floor(itemData.c.v[2])+')');
	    }
	    if(itemData.o._mdf || isFirstFrame){
	        styleElem.pElem.setAttribute('fill-opacity',itemData.o.v);
	    }
	};

	function renderGradientStroke (styleData, itemData, isFirstFrame) {
	    renderGradient(styleData, itemData, isFirstFrame);
	    renderStroke(styleData, itemData, isFirstFrame);
	}

	function renderGradient(styleData, itemData, isFirstFrame) {
	    var gfill = itemData.gf;
	    var hasOpacity = itemData.g._hasOpacity;
	    var pt1 = itemData.s.v, pt2 = itemData.e.v;

	    if (itemData.o._mdf || isFirstFrame) {
	        var attr = styleData.ty === 'gf' ? 'fill-opacity' : 'stroke-opacity';
	        itemData.style.pElem.setAttribute(attr, itemData.o.v);
	    }
	    if (itemData.s._mdf || isFirstFrame) {
	        var attr1 = styleData.t === 1 ? 'x1' : 'cx';
	        var attr2 = attr1 === 'x1' ? 'y1' : 'cy';
	        gfill.setAttribute(attr1, pt1[0]);
	        gfill.setAttribute(attr2, pt1[1]);
	        if (hasOpacity && !itemData.g._collapsable) {
	            itemData.of.setAttribute(attr1, pt1[0]);
	            itemData.of.setAttribute(attr2, pt1[1]);
	        }
	    }
	    var stops, i, len, stop;
	    if (itemData.g._cmdf || isFirstFrame) {
	        stops = itemData.cst;
	        var cValues = itemData.g.c;
	        len = stops.length;
	        for (i = 0; i < len; i += 1){
	            stop = stops[i];
	            stop.setAttribute('offset', cValues[i * 4] + '%');
	            stop.setAttribute('stop-color','rgb('+ cValues[i * 4 + 1] + ',' + cValues[i * 4 + 2] + ','+cValues[i * 4 + 3] + ')');
	        }
	    }
	    if (hasOpacity && (itemData.g._omdf || isFirstFrame)) {
	        var oValues = itemData.g.o;
	        if(itemData.g._collapsable) {
	            stops = itemData.cst;
	        } else {
	            stops = itemData.ost;
	        }
	        len = stops.length;
	        for (i = 0; i < len; i += 1) {
	            stop = stops[i];
	            if(!itemData.g._collapsable) {
	                stop.setAttribute('offset', oValues[i * 2] + '%');
	            }
	            stop.setAttribute('stop-opacity', oValues[i * 2 + 1]);
	        }
	    }
	    if (styleData.t === 1) {
	        if (itemData.e._mdf  || isFirstFrame) {
	            gfill.setAttribute('x2', pt2[0]);
	            gfill.setAttribute('y2', pt2[1]);
	            if (hasOpacity && !itemData.g._collapsable) {
	                itemData.of.setAttribute('x2', pt2[0]);
	                itemData.of.setAttribute('y2', pt2[1]);
	            }
	        }
	    } else {
	        var rad;
	        if (itemData.s._mdf || itemData.e._mdf || isFirstFrame) {
	            rad = Math.sqrt(Math.pow(pt1[0] - pt2[0], 2) + Math.pow(pt1[1] - pt2[1], 2));
	            gfill.setAttribute('r', rad);
	            if(hasOpacity && !itemData.g._collapsable){
	                itemData.of.setAttribute('r', rad);
	            }
	        }
	        if (itemData.e._mdf || itemData.h._mdf || itemData.a._mdf || isFirstFrame) {
	            if (!rad) {
	                rad = Math.sqrt(Math.pow(pt1[0] - pt2[0], 2) + Math.pow(pt1[1] - pt2[1], 2));
	            }
	            var ang = Math.atan2(pt2[1] - pt1[1], pt2[0] - pt1[0]);

	            var percent = itemData.h.v >= 1 ? 0.99 : itemData.h.v <= -1 ? -0.99: itemData.h.v;
	            var dist = rad * percent;
	            var x = Math.cos(ang + itemData.a.v) * dist + pt1[0];
	            var y = Math.sin(ang + itemData.a.v) * dist + pt1[1];
	            gfill.setAttribute('fx', x);
	            gfill.setAttribute('fy', y);
	            if (hasOpacity && !itemData.g._collapsable) {
	                itemData.of.setAttribute('fx', x);
	                itemData.of.setAttribute('fy', y);
	            }
	        }
	        //gfill.setAttribute('fy','200');
	    }
	};

	function renderStroke(styleData, itemData, isFirstFrame) {
	    var styleElem = itemData.style;
	    var d = itemData.d;
	    if (d && (d._mdf || isFirstFrame) && d.dashStr) {
	        styleElem.pElem.setAttribute('stroke-dasharray', d.dashStr);
	        styleElem.pElem.setAttribute('stroke-dashoffset', d.dashoffset[0]);
	    }
	    if(itemData.c && (itemData.c._mdf || isFirstFrame)){
	        styleElem.pElem.setAttribute('stroke','rgb(' + bm_floor(itemData.c.v[0]) + ',' + bm_floor(itemData.c.v[1]) + ',' + bm_floor(itemData.c.v[2]) + ')');
	    }
	    if(itemData.o._mdf || isFirstFrame){
	        styleElem.pElem.setAttribute('stroke-opacity', itemData.o.v);
	    }
	    if(itemData.w._mdf || isFirstFrame){
	        styleElem.pElem.setAttribute('stroke-width', itemData.w.v);
	        if(styleElem.msElem){
	            styleElem.msElem.setAttribute('stroke-width', itemData.w.v);
	        }
	    }
	};

	return ob;
}())
function ShapeTransformManager() {
	this.sequences = {};
	this.sequenceList = [];
    this.transform_key_count = 0;
}

ShapeTransformManager.prototype = {
	addTransformSequence: function(transforms) {
		var i, len = transforms.length;
		var key = '_';
		for(i = 0; i < len; i += 1) {
			key += transforms[i].transform.key + '_';
		}
		var sequence = this.sequences[key];
		if(!sequence) {
			sequence = {
				transforms: [].concat(transforms),
				finalTransform: new Matrix(),
				_mdf: false
			};
			this.sequences[key] = sequence;
			this.sequenceList.push(sequence);
		}
		return sequence;
	},
	processSequence: function(sequence, isFirstFrame) {
		var i = 0, len = sequence.transforms.length, _mdf = isFirstFrame;
		while (i < len && !isFirstFrame) {
			if (sequence.transforms[i].transform.mProps._mdf) {
				_mdf = true;
				break;
			}
			i += 1
		}
		if (_mdf) {
			var props;
			sequence.finalTransform.reset();
			for (i = len - 1; i >= 0; i -= 1) {
		        props = sequence.transforms[i].transform.mProps.v.props;
		        sequence.finalTransform.transform(props[0],props[1],props[2],props[3],props[4],props[5],props[6],props[7],props[8],props[9],props[10],props[11],props[12],props[13],props[14],props[15]);
			}
		}
		sequence._mdf = _mdf;
		
	},
	processSequences: function(isFirstFrame) {
		var i, len = this.sequenceList.length;
		for (i = 0; i < len; i += 1) {
			this.processSequence(this.sequenceList[i], isFirstFrame);
		}

	},
	getNewKey: function() {
		return '_' + this.transform_key_count++;
	}
}
function CVShapeData(element, data, styles, transformsManager) {
    this.styledShapes = [];
    this.tr = [0,0,0,0,0,0];
    var ty = 4;
    if(data.ty == 'rc'){
        ty = 5;
    }else if(data.ty == 'el'){
        ty = 6;
    }else if(data.ty == 'sr'){
        ty = 7;
    }
    this.sh = ShapePropertyFactory.getShapeProp(element,data,ty,element);
    var i , len = styles.length,styledShape;
    for (i = 0; i < len; i += 1) {
        if (!styles[i].closed) {
            styledShape = {
                transforms: transformsManager.addTransformSequence(styles[i].transforms),
                trNodes: []
            }
            this.styledShapes.push(styledShape);
            styles[i].elements.push(styledShape);
        }
    }
}

CVShapeData.prototype.setAsAnimated = SVGShapeData.prototype.setAsAnimated;
function BaseElement(){
}

BaseElement.prototype = {
    checkMasks: function(){
        if(!this.data.hasMask){
            return false;
        }
        var i = 0, len = this.data.masksProperties.length;
        while(i<len) {
            if((this.data.masksProperties[i].mode !== 'n' && this.data.masksProperties[i].cl !== false)) {
                return true;
            }
            i += 1;
        }
        return false;
    },
    initExpressions: function(){
        this.layerInterface = LayerExpressionInterface(this);
        if(this.data.hasMask && this.maskManager) {
            this.layerInterface.registerMaskInterface(this.maskManager);
        }
        var effectsInterface = EffectsExpressionInterface.createEffectsInterface(this,this.layerInterface);
        this.layerInterface.registerEffectsInterface(effectsInterface);

        if(this.data.ty === 0 || this.data.xt){
            this.compInterface = CompExpressionInterface(this);
        } else if(this.data.ty === 4){
            this.layerInterface.shapeInterface = ShapeExpressionInterface(this.shapesData,this.itemsData,this.layerInterface);
            this.layerInterface.content = this.layerInterface.shapeInterface;
        } else if(this.data.ty === 5){
            this.layerInterface.textInterface = TextExpressionInterface(this);
            this.layerInterface.text = this.layerInterface.textInterface;
        }
    },
    setBlendMode: function(){
        var blendModeValue = getBlendMode(this.data.bm);
        var elem = this.baseElement || this.layerElement;

        elem.style['mix-blend-mode'] = blendModeValue;
    },
    initBaseData: function(data, globalData, comp){
        this.globalData = globalData;
        this.comp = comp;
        this.data = data;
        this.layerId = createElementID();
        
        //Stretch factor for old animations missing this property.
        if(!this.data.sr){
            this.data.sr = 1;
        }
        // effects manager
        this.effectsManager = new EffectsManager(this.data,this,this.dynamicProperties);
        
    },
    getType: function(){
        return this.type;
    }
    ,sourceRectAtTime: function(){}
}
function NullElement(data,globalData,comp){
    this.initFrame();
	this.initBaseData(data, globalData, comp);
    this.initFrame();
    this.initTransform(data, globalData, comp);
    this.initHierarchy();
}

NullElement.prototype.prepareFrame = function(num) {
    this.prepareProperties(num, true);
};

NullElement.prototype.renderFrame = function() {
};

NullElement.prototype.getBaseElement = function() {
	return null;
};

NullElement.prototype.destroy = function() {
};

NullElement.prototype.sourceRectAtTime = function() {
};

NullElement.prototype.hide = function() {
};

extendPrototype([BaseElement,TransformElement,HierarchyElement,FrameElement], NullElement);

function SVGBaseElement(){
}

SVGBaseElement.prototype = {
    initRendererElement: function() {
        this.layerElement = createNS('g');
    },
    createContainerElements: function(){
        this.matteElement = createNS('g');
        this.transformedElement = this.layerElement;
        this.maskedElement = this.layerElement;
        this._sizeChanged = false;
        var layerElementParent = null;
        //If this layer acts as a mask for the following layer
        var filId, fil, gg;
        if (this.data.td) {
            if (this.data.td == 3 || this.data.td == 1) {
                var masker = createNS('mask');
                masker.setAttribute('id', this.layerId);
                masker.setAttribute('mask-type', this.data.td == 3 ? 'luminance' : 'alpha');
                masker.appendChild(this.layerElement);
                layerElementParent = masker;
                this.globalData.defs.appendChild(masker);
                // This is only for IE and Edge when mask if of type alpha
                if (!featureSupport.maskType && this.data.td == 1) {
                    masker.setAttribute('mask-type', 'luminance');
                    filId = createElementID();
                    fil = filtersFactory.createFilter(filId);
                    this.globalData.defs.appendChild(fil);
                    fil.appendChild(filtersFactory.createAlphaToLuminanceFilter());
                    gg = createNS('g');
                    gg.appendChild(this.layerElement);
                    layerElementParent = gg;
                    masker.appendChild(gg);
                    gg.setAttribute('filter','url(' + locationHref + '#' + filId + ')');
                }
            } else if(this.data.td == 2) {
                var maskGroup = createNS('mask');
                maskGroup.setAttribute('id', this.layerId);
                maskGroup.setAttribute('mask-type','alpha');
                var maskGrouper = createNS('g');
                maskGroup.appendChild(maskGrouper);
                filId = createElementID();
                fil = filtersFactory.createFilter(filId);
                ////

                // This solution doesn't work on Android when meta tag with viewport attribute is set
                /*var feColorMatrix = createNS('feColorMatrix');
                feColorMatrix.setAttribute('type', 'matrix');
                feColorMatrix.setAttribute('color-interpolation-filters', 'sRGB');
                feColorMatrix.setAttribute('values','1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 -1 1');
                fil.appendChild(feColorMatrix);*/
                ////
                var feCTr = createNS('feComponentTransfer');
                feCTr.setAttribute('in','SourceGraphic');
                fil.appendChild(feCTr);
                var feFunc = createNS('feFuncA');
                feFunc.setAttribute('type','table');
                feFunc.setAttribute('tableValues','1.0 0.0');
                feCTr.appendChild(feFunc);
                ////
                this.globalData.defs.appendChild(fil);
                var alphaRect = createNS('rect');
                alphaRect.setAttribute('width',  this.comp.data.w);
                alphaRect.setAttribute('height', this.comp.data.h);
                alphaRect.setAttribute('x','0');
                alphaRect.setAttribute('y','0');
                alphaRect.setAttribute('fill','#ffffff');
                alphaRect.setAttribute('opacity','0');
                maskGrouper.setAttribute('filter', 'url(' + locationHref + '#'+filId+')');
                maskGrouper.appendChild(alphaRect);
                maskGrouper.appendChild(this.layerElement);
                layerElementParent = maskGrouper;
                if (!featureSupport.maskType) {
                    maskGroup.setAttribute('mask-type', 'luminance');
                    fil.appendChild(filtersFactory.createAlphaToLuminanceFilter());
                    gg = createNS('g');
                    maskGrouper.appendChild(alphaRect);
                    gg.appendChild(this.layerElement);
                    layerElementParent = gg;
                    maskGrouper.appendChild(gg);
                }
                this.globalData.defs.appendChild(maskGroup);
            }
        } else if (this.data.tt) {
            this.matteElement.appendChild(this.layerElement);
            layerElementParent = this.matteElement;
            this.baseElement = this.matteElement;
        } else {
            this.baseElement = this.layerElement;
        }
        if (this.data.ln) {
            this.layerElement.setAttribute('id', this.data.ln);
        }
        if (this.data.cl) {
            this.layerElement.setAttribute('class', this.data.cl);
        }
        //Clipping compositions to hide content that exceeds boundaries. If collapsed transformations is on, component should not be clipped
        if (this.data.ty === 0 && !this.data.hd) {
            var cp = createNS( 'clipPath');
            var pt = createNS('path');
            pt.setAttribute('d','M0,0 L' + this.data.w + ',0' + ' L' + this.data.w + ',' + this.data.h + ' L0,' + this.data.h + 'z');
            var clipId = createElementID();
            cp.setAttribute('id',clipId);
            cp.appendChild(pt);
            this.globalData.defs.appendChild(cp);

            if (this.checkMasks()) {
                var cpGroup = createNS('g');
                cpGroup.setAttribute('clip-path','url(' + locationHref + '#'+clipId + ')');
                cpGroup.appendChild(this.layerElement);
                this.transformedElement = cpGroup;
                if (layerElementParent) {
                    layerElementParent.appendChild(this.transformedElement);
                } else {
                    this.baseElement = this.transformedElement;
                }
            } else {
                this.layerElement.setAttribute('clip-path','url(' + locationHref + '#'+clipId+')');
            }
            
        }
        if (this.data.bm !== 0) {
            this.setBlendMode();
        }

    },
    renderElement: function() {
        if (this.finalTransform._matMdf) {
            this.transformedElement.setAttribute('transform', this.finalTransform.mat.to2dCSS());
        }
        if (this.finalTransform._opMdf) {
            this.transformedElement.setAttribute('opacity', this.finalTransform.mProp.o.v);
        }
    },
    destroyBaseElement: function() {
        this.layerElement = null;
        this.matteElement = null;
        this.maskManager.destroy();
    },
    getBaseElement: function() {
        if (this.data.hd) {
            return null;
        }
        return this.baseElement;
    },
    createRenderableComponents: function() {
        this.maskManager = new MaskElement(this.data, this, this.globalData);
        this.renderableEffectsManager = new SVGEffects(this);
    },
    setMatte: function(id) {
        if (!this.matteElement) {
            return;
        }
        this.matteElement.setAttribute("mask", "url(" + locationHref + "#" + id + ")");
    }
};
function IShapeElement(){
}

IShapeElement.prototype = {
    addShapeToModifiers: function(data) {
        var i, len = this.shapeModifiers.length;
        for(i=0;i<len;i+=1){
            this.shapeModifiers[i].addShape(data);
        }
    },
    isShapeInAnimatedModifiers: function(data) {
        var i = 0, len = this.shapeModifiers.length;
        while(i < len) {
            if(this.shapeModifiers[i].isAnimatedWithShape(data)) {
                return true;
            }
        }
        return false;
    },
    renderModifiers: function() {
        if(!this.shapeModifiers.length){
            return;
        }
        var i, len = this.shapes.length;
        for(i=0;i<len;i+=1){
            this.shapes[i].sh.reset();
        }

        len = this.shapeModifiers.length;
        for(i=len-1;i>=0;i-=1){
            this.shapeModifiers[i].processShapes(this._isFirstFrame);
        }
    },
    lcEnum: {
        '1': 'butt',
        '2': 'round',
        '3': 'square'
    },
    ljEnum: {
        '1': 'miter',
        '2': 'round',
        '3': 'bevel'
    },
    searchProcessedElement: function(elem){
        var elements = this.processedElements;
        var i = 0, len = elements.length;
        while (i < len) {
            if (elements[i].elem === elem) {
                return elements[i].pos;
            }
            i += 1;
        }
        return 0;
    },
    addProcessedElement: function(elem, pos){
        var elements = this.processedElements;
        var i = elements.length;
        while(i) {
            i -= 1;
            if (elements[i].elem === elem) {
                elements[i].pos = pos;
                return;
            }
        }
        elements.push(new ProcessedElement(elem, pos));
    },
    prepareFrame: function(num) {
        this.prepareRenderableFrame(num);
        this.prepareProperties(num, this.isInRange);
    }
};
function ITextElement(){
}

ITextElement.prototype.initElement = function(data,globalData,comp){
    this.lettersChangedFlag = true;
    this.initFrame();
    this.initBaseData(data, globalData, comp);
    this.textProperty = new TextProperty(this, data.t, this.dynamicProperties);
    this.textAnimator = new TextAnimatorProperty(data.t, this.renderType, this);
    this.initTransform(data, globalData, comp);
    this.initHierarchy();
    this.initRenderable();
    this.initRendererElement();
    this.createContainerElements();
    this.createRenderableComponents();
    this.createContent();
    this.hide();
    this.textAnimator.searchProperties(this.dynamicProperties);
};

ITextElement.prototype.prepareFrame = function(num) {
    this._mdf = false;
    this.prepareRenderableFrame(num);
    this.prepareProperties(num, this.isInRange);
    if(this.textProperty._mdf || this.textProperty._isFirstFrame) {
        this.buildNewText();
        this.textProperty._isFirstFrame = false;
        this.textProperty._mdf = false;
    }
};

ITextElement.prototype.createPathShape = function(matrixHelper, shapes) {
    var j,jLen = shapes.length;
    var k, kLen, pathNodes;
    var shapeStr = '';
    for(j=0;j<jLen;j+=1){
        pathNodes = shapes[j].ks.k;
        shapeStr += buildShapeString(pathNodes, pathNodes.i.length, true, matrixHelper);
    }
    return shapeStr;
};

ITextElement.prototype.updateDocumentData = function(newData, index) {
    this.textProperty.updateDocumentData(newData, index);
};

ITextElement.prototype.canResizeFont = function(_canResize) {
    this.textProperty.canResizeFont(_canResize);
};

ITextElement.prototype.setMinimumFontSize = function(_fontSize) {
    this.textProperty.setMinimumFontSize(_fontSize);
};

ITextElement.prototype.applyTextPropertiesToMatrix = function(documentData, matrixHelper, lineNumber, xPos, yPos) {
    if(documentData.ps){
        matrixHelper.translate(documentData.ps[0],documentData.ps[1] + documentData.ascent,0);
    }
    matrixHelper.translate(0,-documentData.ls,0);
    switch(documentData.j){
        case 1:
            matrixHelper.translate(documentData.justifyOffset + (documentData.boxWidth - documentData.lineWidths[lineNumber]),0,0);
            break;
        case 2:
            matrixHelper.translate(documentData.justifyOffset + (documentData.boxWidth - documentData.lineWidths[lineNumber] )/2,0,0);
            break;
    }
    matrixHelper.translate(xPos, yPos, 0);
};


ITextElement.prototype.buildColor = function(colorData) {
    return 'rgb(' + Math.round(colorData[0]*255) + ',' + Math.round(colorData[1]*255) + ',' + Math.round(colorData[2]*255) + ')';
};

ITextElement.prototype.emptyProp = new LetterProps();

ITextElement.prototype.destroy = function(){
    
};
function ICompElement(){}

extendPrototype([BaseElement, TransformElement, HierarchyElement, FrameElement, RenderableDOMElement], ICompElement);

ICompElement.prototype.initElement = function(data,globalData,comp) {
    this.initFrame();
    this.initBaseData(data, globalData, comp);
    this.initTransform(data, globalData, comp);
    this.initRenderable();
    this.initHierarchy();
    this.initRendererElement();
    this.createContainerElements();
    this.createRenderableComponents();
    if(this.data.xt || !globalData.progressiveLoad){
        this.buildAllItems();
    }
    this.hide();
};

/*ICompElement.prototype.hide = function(){
    if(!this.hidden){
        this.hideElement();
        var i,len = this.elements.length;
        for( i = 0; i < len; i+=1 ){
            if(this.elements[i]){
                this.elements[i].hide();
            }
        }
    }
};*/

ICompElement.prototype.prepareFrame = function(num){
    this._mdf = false;
    this.prepareRenderableFrame(num);
    this.prepareProperties(num, this.isInRange);
    if(!this.isInRange && !this.data.xt){
        return;
    }

    if (!this.tm._placeholder) {
        var timeRemapped = this.tm.v;
        if(timeRemapped === this.data.op){
            timeRemapped = this.data.op - 1;
        }
        this.renderedFrame = timeRemapped;
    } else {
        this.renderedFrame = num/this.data.sr;
    }
    var i,len = this.elements.length;
    if(!this.completeLayers){
        this.checkLayers(this.renderedFrame);
    }
    //This iteration needs to be backwards because of how expressions connect between each other
    for( i = len - 1; i >= 0; i -= 1 ){
        if(this.completeLayers || this.elements[i]){
            this.elements[i].prepareFrame(this.renderedFrame - this.layers[i].st);
            if(this.elements[i]._mdf) {
                this._mdf = true;
            }
        }
    }
};

ICompElement.prototype.renderInnerContent = function() {
    var i,len = this.layers.length;
    for( i = 0; i < len; i += 1 ){
        if(this.completeLayers || this.elements[i]){
            this.elements[i].renderFrame();
        }
    }
};

ICompElement.prototype.setElements = function(elems){
    this.elements = elems;
};

ICompElement.prototype.getElements = function(){
    return this.elements;
};

ICompElement.prototype.destroyElements = function(){
    var i,len = this.layers.length;
    for( i = 0; i < len; i+=1 ){
        if(this.elements[i]){
            this.elements[i].destroy();
        }
    }
};

ICompElement.prototype.destroy = function(){
    this.destroyElements();
    this.destroyBaseElement();
};

function IImageElement(data,globalData,comp){
    this.assetData = globalData.getImageData(data.refId);
    this.initElement(data,globalData,comp);
    this.sourceRect = {top:0,left:0,width:this.assetData.w,height:this.assetData.h};
}

extendPrototype([BaseElement,TransformElement,SVGBaseElement,HierarchyElement,FrameElement,RenderableDOMElement], IImageElement);

IImageElement.prototype.createContent = function(){

    var assetPath = this.globalData.getAssetsPath(this.assetData);

    this.innerElem = createNS('image');
    this.innerElem.setAttribute('width',this.assetData.w+"px");
    this.innerElem.setAttribute('height',this.assetData.h+"px");
    this.innerElem.setAttribute('preserveAspectRatio',this.assetData.pr || this.globalData.renderConfig.imagePreserveAspectRatio);
    this.innerElem.setAttributeNS('http://www.w3.org/1999/xlink','href',assetPath);
    
    this.layerElement.appendChild(this.innerElem);
};

IImageElement.prototype.sourceRectAtTime = function() {
	return this.sourceRect;
}
function ISolidElement(data,globalData,comp){
    this.initElement(data,globalData,comp);
}
extendPrototype([IImageElement], ISolidElement);

ISolidElement.prototype.createContent = function(){

    var rect = createNS('rect');
    ////rect.style.width = this.data.sw;
    ////rect.style.height = this.data.sh;
    ////rect.style.fill = this.data.sc;
    rect.setAttribute('width',this.data.sw);
    rect.setAttribute('height',this.data.sh);
    rect.setAttribute('fill',this.data.sc);
    this.layerElement.appendChild(rect);
};
function SVGCompElement(data,globalData,comp){
    this.layers = data.layers;
    this.supports3d = true;
    this.completeLayers = false;
    this.pendingElements = [];
    this.elements = this.layers ? createSizedArray(this.layers.length) : [];
    //this.layerElement = createNS('g');
    this.initElement(data,globalData,comp);
    this.tm = data.tm ? PropertyFactory.getProp(this,data.tm,0,globalData.frameRate,this) : {_placeholder:true};
}

extendPrototype([SVGRenderer, ICompElement, SVGBaseElement], SVGCompElement);
function SVGTextElement(data,globalData,comp){
    this.textSpans = [];
    this.renderType = 'svg';
    this.initElement(data,globalData,comp);
}

extendPrototype([BaseElement,TransformElement,SVGBaseElement,HierarchyElement,FrameElement,RenderableDOMElement,ITextElement], SVGTextElement);

SVGTextElement.prototype.createContent = function(){

    if (this.data.singleShape && !this.globalData.fontManager.chars) {
        this.textContainer = createNS('text');
    }
};

SVGTextElement.prototype.buildTextContents = function(textArray) {
    var i = 0, len = textArray.length;
    var textContents = [], currentTextContent = '';
    while (i < len) {
        if(textArray[i] === String.fromCharCode(13) || textArray[i] === String.fromCharCode(3)) {
            textContents.push(currentTextContent);
            currentTextContent = '';
        } else {
            currentTextContent += textArray[i];
        }
        i += 1;
    }
    textContents.push(currentTextContent);
    return textContents;
}

SVGTextElement.prototype.buildNewText = function(){
    var i, len;

    var documentData = this.textProperty.currentData;
    this.renderedLetters = createSizedArray(documentData ? documentData.l.length : 0);
    if(documentData.fc) {
        this.layerElement.setAttribute('fill', this.buildColor(documentData.fc));
    }else{
        this.layerElement.setAttribute('fill', 'rgba(0,0,0,0)');
    }
    if(documentData.sc){
        this.layerElement.setAttribute('stroke', this.buildColor(documentData.sc));
        this.layerElement.setAttribute('stroke-width', documentData.sw);
    }
    this.layerElement.setAttribute('font-size', documentData.finalSize);
    var fontData = this.globalData.fontManager.getFontByName(documentData.f);
    if(fontData.fClass){
        this.layerElement.setAttribute('class',fontData.fClass);
    } else {
        this.layerElement.setAttribute('font-family', fontData.fFamily);
        var fWeight = documentData.fWeight, fStyle = documentData.fStyle;
        this.layerElement.setAttribute('font-style', fStyle);
        this.layerElement.setAttribute('font-weight', fWeight);
    }
    this.layerElement.setAttribute('aria-label', documentData.t);

    var letters = documentData.l || [];
    var usesGlyphs = !!this.globalData.fontManager.chars;
    len = letters.length;

    var tSpan;
    var matrixHelper = this.mHelper;
    var shapes, shapeStr = '', singleShape = this.data.singleShape;
    var xPos = 0, yPos = 0, firstLine = true;
    var trackingOffset = documentData.tr/1000*documentData.finalSize;
    if(singleShape && !usesGlyphs && !documentData.sz) {
        var tElement = this.textContainer;
        var justify = 'start';
        switch(documentData.j) {
            case 1:
                justify = 'end';
                break;
            case 2:
                justify = 'middle';
                break;
        }
        tElement.setAttribute('text-anchor',justify);
        tElement.setAttribute('letter-spacing',trackingOffset);
        var textContent = this.buildTextContents(documentData.finalText);
        len = textContent.length;
        yPos = documentData.ps ? documentData.ps[1] + documentData.ascent : 0;
        for ( i = 0; i < len; i += 1) {
            tSpan = this.textSpans[i] || createNS('tspan');
            tSpan.textContent = textContent[i];
            tSpan.setAttribute('x', 0);
            tSpan.setAttribute('y', yPos);
            tSpan.style.display = 'inherit';
            tElement.appendChild(tSpan);
            this.textSpans[i] = tSpan;
            yPos += documentData.finalLineHeight;
        }
        
        this.layerElement.appendChild(tElement);
    } else {
        var cachedSpansLength = this.textSpans.length;
        var shapeData, charData;
        for (i = 0; i < len; i += 1) {
            if(!usesGlyphs || !singleShape || i === 0){
                tSpan = cachedSpansLength > i ? this.textSpans[i] : createNS(usesGlyphs?'path':'text');
                if (cachedSpansLength <= i) {
                    tSpan.setAttribute('stroke-linecap', 'butt');
                    tSpan.setAttribute('stroke-linejoin','round');
                    tSpan.setAttribute('stroke-miterlimit','4');
                    this.textSpans[i] = tSpan;
                    this.layerElement.appendChild(tSpan);
                }
                tSpan.style.display = 'inherit';
            }
            
            matrixHelper.reset();
            matrixHelper.scale(documentData.finalSize / 100, documentData.finalSize / 100);
            if (singleShape) {
                if(letters[i].n) {
                    xPos = -trackingOffset;
                    yPos += documentData.yOffset;
                    yPos += firstLine ? 1 : 0;
                    firstLine = false;
                }
                this.applyTextPropertiesToMatrix(documentData, matrixHelper, letters[i].line, xPos, yPos);
                xPos += letters[i].l || 0;
                //xPos += letters[i].val === ' ' ? 0 : trackingOffset;
                xPos += trackingOffset;
            }
            if(usesGlyphs) {
                charData = this.globalData.fontManager.getCharData(documentData.finalText[i], fontData.fStyle, this.globalData.fontManager.getFontByName(documentData.f).fFamily);
                shapeData = charData && charData.data || {};
                shapes = shapeData.shapes ? shapeData.shapes[0].it : [];
                if(!singleShape){
                    tSpan.setAttribute('d',this.createPathShape(matrixHelper,shapes));
                } else {
                    shapeStr += this.createPathShape(matrixHelper,shapes);
                }
            } else {
                if(singleShape) {
                    tSpan.setAttribute("transform", "translate(" + matrixHelper.props[12] + "," + matrixHelper.props[13] + ")");
                }
                tSpan.textContent = letters[i].val;
                tSpan.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space","preserve");
            }
            //
        }
        if (singleShape && tSpan) {
            tSpan.setAttribute('d',shapeStr);
        }
    }
    while (i < this.textSpans.length){
        this.textSpans[i].style.display = 'none';
        i += 1;
    }
    
    this._sizeChanged = true;
};

SVGTextElement.prototype.sourceRectAtTime = function(time){
    this.prepareFrame(this.comp.renderedFrame - this.data.st);
    this.renderInnerContent();
    if(this._sizeChanged){
        this._sizeChanged = false;
        var textBox = this.layerElement.getBBox();
        this.bbox = {
            top: textBox.y,
            left: textBox.x,
            width: textBox.width,
            height: textBox.height
        };
    }
    return this.bbox;
};

SVGTextElement.prototype.renderInnerContent = function(){

    if(!this.data.singleShape){
        this.textAnimator.getMeasures(this.textProperty.currentData, this.lettersChangedFlag);
        if(this.lettersChangedFlag || this.textAnimator.lettersChangedFlag){
            this._sizeChanged = true;
            var  i,len;
            var renderedLetters = this.textAnimator.renderedLetters;

            var letters = this.textProperty.currentData.l;

            len = letters.length;
            var renderedLetter, textSpan;
            for(i=0;i<len;i+=1){
                if(letters[i].n){
                    continue;
                }
                renderedLetter = renderedLetters[i];
                textSpan = this.textSpans[i];
                if(renderedLetter._mdf.m) {
                    textSpan.setAttribute('transform',renderedLetter.m);
                }
                if(renderedLetter._mdf.o) {
                    textSpan.setAttribute('opacity',renderedLetter.o);
                }
                if(renderedLetter._mdf.sw){
                    textSpan.setAttribute('stroke-width',renderedLetter.sw);
                }
                if(renderedLetter._mdf.sc){
                    textSpan.setAttribute('stroke',renderedLetter.sc);
                }
                if(renderedLetter._mdf.fc){
                    textSpan.setAttribute('fill',renderedLetter.fc);
                }
            }
        }
    }
};

function SVGShapeElement(data,globalData,comp){
    //List of drawable elements
    this.shapes = [];
    // Full shape data
    this.shapesData = data.shapes;
    //List of styles that will be applied to shapes
    this.stylesList = [];
    //List of modifiers that will be applied to shapes
    this.shapeModifiers = [];
    //List of items in shape tree
    this.itemsData = [];
    //List of items in previous shape tree
    this.processedElements = [];
    // List of animated components
    this.animatedContents = [];
    this.initElement(data,globalData,comp);
    //Moving any property that doesn't get too much access after initialization because of v8 way of handling more than 10 properties.
    // List of elements that have been created
    this.prevViewData = [];
    //Moving any property that doesn't get too much access after initialization because of v8 way of handling more than 10 properties.
}

extendPrototype([BaseElement,TransformElement,SVGBaseElement,IShapeElement,HierarchyElement,FrameElement,RenderableDOMElement], SVGShapeElement);

SVGShapeElement.prototype.initSecondaryElement = function() {
};

SVGShapeElement.prototype.identityMatrix = new Matrix();

SVGShapeElement.prototype.buildExpressionInterface = function(){};

SVGShapeElement.prototype.createContent = function(){
    this.searchShapes(this.shapesData,this.itemsData,this.prevViewData,this.layerElement, 0, [], true);
    this.filterUniqueShapes();
};

/*
This method searches for multiple shapes that affect a single element and one of them is animated
*/
SVGShapeElement.prototype.filterUniqueShapes = function(){
    var i, len = this.shapes.length, shape;
    var j, jLen = this.stylesList.length;
    var style, count = 0;
    var tempShapes = [];
    var areAnimated = false;
    for(j = 0; j < jLen; j += 1) {
        style = this.stylesList[j];
        areAnimated = false;
        tempShapes.length = 0;
        for(i = 0; i < len; i += 1) {
            shape = this.shapes[i];
            if(shape.styles.indexOf(style) !== -1) {
                tempShapes.push(shape);
                areAnimated = shape._isAnimated || areAnimated;
            }
        }
        if(tempShapes.length > 1 && areAnimated) {
            this.setShapesAsAnimated(tempShapes);
        }
    }
}

SVGShapeElement.prototype.setShapesAsAnimated = function(shapes){
    var i, len = shapes.length;
    for(i = 0; i < len; i += 1) {
        shapes[i].setAsAnimated();
    }
}

SVGShapeElement.prototype.createStyleElement = function(data, level){
    //TODO: prevent drawing of hidden styles
    var elementData;
    var styleOb = new SVGStyleData(data, level);

    var pathElement = styleOb.pElem;
    if(data.ty === 'st') {
        elementData = new SVGStrokeStyleData(this, data, styleOb);
    } else if(data.ty === 'fl') {
        elementData = new SVGFillStyleData(this, data, styleOb);
    } else if(data.ty === 'gf' || data.ty === 'gs') {
        var gradientConstructor = data.ty === 'gf' ? SVGGradientFillStyleData : SVGGradientStrokeStyleData;
        elementData = new gradientConstructor(this, data, styleOb);
        this.globalData.defs.appendChild(elementData.gf);
        if (elementData.maskId) {
            this.globalData.defs.appendChild(elementData.ms);
            this.globalData.defs.appendChild(elementData.of);
            pathElement.setAttribute('mask','url(' + locationHref + '#' + elementData.maskId + ')');
        }
    }
    
    if(data.ty === 'st' || data.ty === 'gs') {
        pathElement.setAttribute('stroke-linecap', this.lcEnum[data.lc] || 'round');
        pathElement.setAttribute('stroke-linejoin',this.ljEnum[data.lj] || 'round');
        pathElement.setAttribute('fill-opacity','0');
        if(data.lj === 1) {
            pathElement.setAttribute('stroke-miterlimit',data.ml);
        }
    }

    if(data.r === 2) {
        pathElement.setAttribute('fill-rule', 'evenodd');
    }

    if(data.ln){
        pathElement.setAttribute('id',data.ln);
    }
    if(data.cl){
        pathElement.setAttribute('class',data.cl);
    }
    if(data.bm){
        pathElement.style['mix-blend-mode'] = getBlendMode(data.bm);
    }
    this.stylesList.push(styleOb);
    this.addToAnimatedContents(data, elementData);
    return elementData;
};

SVGShapeElement.prototype.createGroupElement = function(data) {
    var elementData = new ShapeGroupData();
    if(data.ln){
        elementData.gr.setAttribute('id',data.ln);
    }
    if(data.cl){
        elementData.gr.setAttribute('class',data.cl);
    }
    if(data.bm){
        elementData.gr.style['mix-blend-mode'] = getBlendMode(data.bm);
    }
    return elementData;
};

SVGShapeElement.prototype.createTransformElement = function(data, container) {
    var transformProperty = TransformPropertyFactory.getTransformProperty(this,data,this);
    var elementData = new SVGTransformData(transformProperty, transformProperty.o, container);
    this.addToAnimatedContents(data, elementData);
    return elementData;
};

SVGShapeElement.prototype.createShapeElement = function(data, ownTransformers, level) {
    var ty = 4;
    if(data.ty === 'rc'){
        ty = 5;
    }else if(data.ty === 'el'){
        ty = 6;
    }else if(data.ty === 'sr'){
        ty = 7;
    }
    var shapeProperty = ShapePropertyFactory.getShapeProp(this,data,ty,this);
    var elementData = new SVGShapeData(ownTransformers, level, shapeProperty);
    this.shapes.push(elementData);
    this.addShapeToModifiers(elementData);
    this.addToAnimatedContents(data, elementData);
    return elementData;
};

SVGShapeElement.prototype.addToAnimatedContents = function(data, element) {
    var i = 0, len = this.animatedContents.length;
    while(i < len) {
        if(this.animatedContents[i].element === element) {
            return;
        }
        i += 1;
    }
    this.animatedContents.push({
        fn: SVGElementsRenderer.createRenderFunction(data),
        element: element,
        data: data
    });
};

SVGShapeElement.prototype.setElementStyles = function(elementData){
    var arr = elementData.styles;
    var j, jLen = this.stylesList.length;
    for (j = 0; j < jLen; j += 1) {
        if (!this.stylesList[j].closed) {
            arr.push(this.stylesList[j]);
        }
    }
};

SVGShapeElement.prototype.reloadShapes = function(){
    this._isFirstFrame = true;
    var i, len = this.itemsData.length;
    for( i = 0; i < len; i += 1) {
        this.prevViewData[i] = this.itemsData[i];
    }
    this.searchShapes(this.shapesData,this.itemsData,this.prevViewData,this.layerElement, 0, [], true);
    this.filterUniqueShapes();
    len = this.dynamicProperties.length;
    for(i = 0; i < len; i += 1) {
        this.dynamicProperties[i].getValue();
    }
    this.renderModifiers();
};

SVGShapeElement.prototype.searchShapes = function(arr,itemsData,prevViewData,container, level, transformers, render){
    var ownTransformers = [].concat(transformers);
    var i, len = arr.length - 1;
    var j, jLen;
    var ownStyles = [], ownModifiers = [], styleOb, currentTransform, modifier, processedPos;
    for(i=len;i>=0;i-=1){
        processedPos = this.searchProcessedElement(arr[i]);
        if(!processedPos){
            arr[i]._render = render;
        } else {
            itemsData[i] = prevViewData[processedPos - 1];
        }
        if(arr[i].ty == 'fl' || arr[i].ty == 'st' || arr[i].ty == 'gf' || arr[i].ty == 'gs'){
            if(!processedPos){
                itemsData[i] = this.createStyleElement(arr[i], level);
            } else {
                itemsData[i].style.closed = false;
            }
            if(arr[i]._render){
                container.appendChild(itemsData[i].style.pElem);
            }
            ownStyles.push(itemsData[i].style);
        }else if(arr[i].ty == 'gr'){
            if(!processedPos){
                itemsData[i] = this.createGroupElement(arr[i]);
            } else {
                jLen = itemsData[i].it.length;
                for(j=0;j<jLen;j+=1){
                    itemsData[i].prevViewData[j] = itemsData[i].it[j];
                }
            }
            this.searchShapes(arr[i].it,itemsData[i].it,itemsData[i].prevViewData,itemsData[i].gr, level + 1, ownTransformers, render);
            if(arr[i]._render){
                container.appendChild(itemsData[i].gr);
            }
        }else if(arr[i].ty == 'tr'){
            if(!processedPos){
                itemsData[i] = this.createTransformElement(arr[i], container);
            }
            currentTransform = itemsData[i].transform;
            ownTransformers.push(currentTransform);
        }else if(arr[i].ty == 'sh' || arr[i].ty == 'rc' || arr[i].ty == 'el' || arr[i].ty == 'sr'){
            if(!processedPos){
                itemsData[i] = this.createShapeElement(arr[i], ownTransformers, level);
            }
            this.setElementStyles(itemsData[i]);

        }else if(arr[i].ty == 'tm' || arr[i].ty == 'rd' || arr[i].ty == 'ms'){
            if(!processedPos){
                modifier = ShapeModifiers.getModifier(arr[i].ty);
                modifier.init(this,arr[i]);
                itemsData[i] = modifier;
                this.shapeModifiers.push(modifier);
            } else {
                modifier = itemsData[i];
                modifier.closed = false;
            }
            ownModifiers.push(modifier);
        }else if(arr[i].ty == 'rp'){
            if(!processedPos){
                modifier = ShapeModifiers.getModifier(arr[i].ty);
                itemsData[i] = modifier;
                modifier.init(this,arr,i,itemsData);
                this.shapeModifiers.push(modifier);
                render = false;
            }else{
                modifier = itemsData[i];
                modifier.closed = true;
            }
            ownModifiers.push(modifier);
        }
        this.addProcessedElement(arr[i], i + 1);
    }
    len = ownStyles.length;
    for(i=0;i<len;i+=1){
        ownStyles[i].closed = true;
    }
    len = ownModifiers.length;
    for(i=0;i<len;i+=1){
        ownModifiers[i].closed = true;
    }
};

SVGShapeElement.prototype.renderInnerContent = function() {
    this.renderModifiers();
    var i, len = this.stylesList.length;
    for(i=0;i<len;i+=1){
        this.stylesList[i].reset();
    }
    this.renderShape();

    for (i = 0; i < len; i += 1) {
        if (this.stylesList[i]._mdf || this._isFirstFrame) {
            if(this.stylesList[i].msElem){
                this.stylesList[i].msElem.setAttribute('d', this.stylesList[i].d);
                //Adding M0 0 fixes same mask bug on all browsers
                this.stylesList[i].d = 'M0 0' + this.stylesList[i].d;
            }
            this.stylesList[i].pElem.setAttribute('d', this.stylesList[i].d || 'M0 0');
        }
    }
};

SVGShapeElement.prototype.renderShape = function() {
    var i, len = this.animatedContents.length;
    var animatedContent;
    for(i = 0; i < len; i += 1) {
        animatedContent = this.animatedContents[i];
        if((this._isFirstFrame || animatedContent.element._isAnimated) && animatedContent.data !== true) {
            animatedContent.fn(animatedContent.data, animatedContent.element, this._isFirstFrame);
        }
    }
}

SVGShapeElement.prototype.destroy = function(){
    this.destroyBaseElement();
    this.shapesData = null;
    this.itemsData = null;
};

function SVGTintFilter(filter, filterManager){
    this.filterManager = filterManager;
    var feColorMatrix = createNS('feColorMatrix');
    feColorMatrix.setAttribute('type','matrix');
    feColorMatrix.setAttribute('color-interpolation-filters','linearRGB');
    feColorMatrix.setAttribute('values','0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0');
    feColorMatrix.setAttribute('result','f1');
    filter.appendChild(feColorMatrix);
    feColorMatrix = createNS('feColorMatrix');
    feColorMatrix.setAttribute('type','matrix');
    feColorMatrix.setAttribute('color-interpolation-filters','sRGB');
    feColorMatrix.setAttribute('values','1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0');
    feColorMatrix.setAttribute('result','f2');
    filter.appendChild(feColorMatrix);
    this.matrixFilter = feColorMatrix;
    if(filterManager.effectElements[2].p.v !== 100 || filterManager.effectElements[2].p.k){
        var feMerge = createNS('feMerge');
        filter.appendChild(feMerge);
        var feMergeNode;
        feMergeNode = createNS('feMergeNode');
        feMergeNode.setAttribute('in','SourceGraphic');
        feMerge.appendChild(feMergeNode);
        feMergeNode = createNS('feMergeNode');
        feMergeNode.setAttribute('in','f2');
        feMerge.appendChild(feMergeNode);
    }
}

SVGTintFilter.prototype.renderFrame = function(forceRender){
    if(forceRender || this.filterManager._mdf){
        var colorBlack = this.filterManager.effectElements[0].p.v;
        var colorWhite = this.filterManager.effectElements[1].p.v;
        var opacity = this.filterManager.effectElements[2].p.v/100;
        this.matrixFilter.setAttribute('values',(colorWhite[0]- colorBlack[0])+' 0 0 0 '+ colorBlack[0] +' '+ (colorWhite[1]- colorBlack[1]) +' 0 0 0 '+ colorBlack[1] +' '+ (colorWhite[2]- colorBlack[2]) +' 0 0 0 '+ colorBlack[2] +' 0 0 0 ' + opacity + ' 0');
    }
};
function SVGFillFilter(filter, filterManager){
    this.filterManager = filterManager;
    var feColorMatrix = createNS('feColorMatrix');
    feColorMatrix.setAttribute('type','matrix');
    feColorMatrix.setAttribute('color-interpolation-filters','sRGB');
    feColorMatrix.setAttribute('values','1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0');
    filter.appendChild(feColorMatrix);
    this.matrixFilter = feColorMatrix;
}
SVGFillFilter.prototype.renderFrame = function(forceRender){
    if(forceRender || this.filterManager._mdf){
        var color = this.filterManager.effectElements[2].p.v;
        var opacity = this.filterManager.effectElements[6].p.v;
        this.matrixFilter.setAttribute('values','0 0 0 0 '+color[0]+' 0 0 0 0 '+color[1]+' 0 0 0 0 '+color[2]+' 0 0 0 '+opacity+' 0');
    }
};
function SVGGaussianBlurEffect(filter, filterManager){
    // Outset the filter region by 100% on all sides to accommodate blur expansion.
    filter.setAttribute('x','-100%');
    filter.setAttribute('y','-100%');
    filter.setAttribute('width','300%');
    filter.setAttribute('height','300%');

    this.filterManager = filterManager;
    var feGaussianBlur = createNS('feGaussianBlur');
    filter.appendChild(feGaussianBlur);
    this.feGaussianBlur = feGaussianBlur;
}

SVGGaussianBlurEffect.prototype.renderFrame = function(forceRender){
    if(forceRender || this.filterManager._mdf){
        // Empirical value, matching AE's blur appearance.
        var kBlurrinessToSigma = 0.3;
        var sigma = this.filterManager.effectElements[0].p.v * kBlurrinessToSigma;

        // Dimensions mapping:
        //
        //   1 -> horizontal & vertical
        //   2 -> horizontal only
        //   3 -> vertical only
        //
        var dimensions = this.filterManager.effectElements[1].p.v;
        var sigmaX = (dimensions == 3) ? 0 : sigma;
        var sigmaY = (dimensions == 2) ? 0 : sigma;

        this.feGaussianBlur.setAttribute('stdDeviation', sigmaX + " " + sigmaY);

        // Repeat edges mapping:
        //
        //   0 -> off -> duplicate
        //   1 -> on  -> wrap
        var edgeMode = (this.filterManager.effectElements[2].p.v == 1) ? 'wrap' : 'duplicate';
        this.feGaussianBlur.setAttribute('edgeMode', edgeMode);
    }
}
function SVGStrokeEffect(elem, filterManager){
    this.initialized = false;
    this.filterManager = filterManager;
    this.elem = elem;
    this.paths = [];
}

SVGStrokeEffect.prototype.initialize = function(){

    var elemChildren = this.elem.layerElement.children || this.elem.layerElement.childNodes;
    var path,groupPath, i, len;
    if(this.filterManager.effectElements[1].p.v === 1){
        len = this.elem.maskManager.masksProperties.length;
        i = 0;
    } else {
        i = this.filterManager.effectElements[0].p.v - 1;
        len = i + 1;
    }
    groupPath = createNS('g'); 
    groupPath.setAttribute('fill','none');
    groupPath.setAttribute('stroke-linecap','round');
    groupPath.setAttribute('stroke-dashoffset',1);
    for(i;i<len;i+=1){
        path = createNS('path');
        groupPath.appendChild(path);
        this.paths.push({p:path,m:i});
    }
    if(this.filterManager.effectElements[10].p.v === 3){
        var mask = createNS('mask');
        var id = createElementID();
        mask.setAttribute('id',id);
        mask.setAttribute('mask-type','alpha');
        mask.appendChild(groupPath);
        this.elem.globalData.defs.appendChild(mask);
        var g = createNS('g');
        g.setAttribute('mask','url(' + locationHref + '#'+id+')');
        while (elemChildren[0]) {
            g.appendChild(elemChildren[0]);
        }
        this.elem.layerElement.appendChild(g);
        this.masker = mask;
        groupPath.setAttribute('stroke','#fff');
    } else if(this.filterManager.effectElements[10].p.v === 1 || this.filterManager.effectElements[10].p.v === 2){
        if(this.filterManager.effectElements[10].p.v === 2){
            elemChildren = this.elem.layerElement.children || this.elem.layerElement.childNodes;
            while(elemChildren.length){
                this.elem.layerElement.removeChild(elemChildren[0]);
            }
        }
        this.elem.layerElement.appendChild(groupPath);
        this.elem.layerElement.removeAttribute('mask');
        groupPath.setAttribute('stroke','#fff');
    }
    this.initialized = true;
    this.pathMasker = groupPath;
};

SVGStrokeEffect.prototype.renderFrame = function(forceRender){
    if(!this.initialized){
        this.initialize();
    }
    var i, len = this.paths.length;
    var mask, path;
    for(i=0;i<len;i+=1){
        if(this.paths[i].m === -1) {
            continue;
        }
        mask = this.elem.maskManager.viewData[this.paths[i].m];
        path = this.paths[i].p;
        if(forceRender || this.filterManager._mdf || mask.prop._mdf){
            path.setAttribute('d',mask.lastPath);
        }
        if(forceRender || this.filterManager.effectElements[9].p._mdf || this.filterManager.effectElements[4].p._mdf || this.filterManager.effectElements[7].p._mdf || this.filterManager.effectElements[8].p._mdf || mask.prop._mdf){
            var dasharrayValue;
            if(this.filterManager.effectElements[7].p.v !== 0 || this.filterManager.effectElements[8].p.v !== 100){
                var s = Math.min(this.filterManager.effectElements[7].p.v,this.filterManager.effectElements[8].p.v)/100;
                var e = Math.max(this.filterManager.effectElements[7].p.v,this.filterManager.effectElements[8].p.v)/100;
                var l = path.getTotalLength();
                dasharrayValue = '0 0 0 ' + l*s + ' ';
                var lineLength = l*(e-s);
                var segment = 1+this.filterManager.effectElements[4].p.v*2*this.filterManager.effectElements[9].p.v/100;
                var units = Math.floor(lineLength/segment);
                var j;
                for(j=0;j<units;j+=1){
                    dasharrayValue += '1 ' + this.filterManager.effectElements[4].p.v*2*this.filterManager.effectElements[9].p.v/100 + ' ';
                }
                dasharrayValue += '0 ' + l*10 + ' 0 0';
            } else {
                dasharrayValue = '1 ' + this.filterManager.effectElements[4].p.v*2*this.filterManager.effectElements[9].p.v/100;
            }
            path.setAttribute('stroke-dasharray',dasharrayValue);
        }
    }
    if(forceRender || this.filterManager.effectElements[4].p._mdf){
        this.pathMasker.setAttribute('stroke-width',this.filterManager.effectElements[4].p.v*2);
    }
    
    if(forceRender || this.filterManager.effectElements[6].p._mdf){
        this.pathMasker.setAttribute('opacity',this.filterManager.effectElements[6].p.v);
    }
    if(this.filterManager.effectElements[10].p.v === 1 || this.filterManager.effectElements[10].p.v === 2){
        if(forceRender || this.filterManager.effectElements[3].p._mdf){
            var color = this.filterManager.effectElements[3].p.v;
            this.pathMasker.setAttribute('stroke','rgb('+bm_floor(color[0]*255)+','+bm_floor(color[1]*255)+','+bm_floor(color[2]*255)+')');
        }
    }
};
function SVGTritoneFilter(filter, filterManager){
    this.filterManager = filterManager;
    var feColorMatrix = createNS('feColorMatrix');
    feColorMatrix.setAttribute('type','matrix');
    feColorMatrix.setAttribute('color-interpolation-filters','linearRGB');
    feColorMatrix.setAttribute('values','0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0');
    feColorMatrix.setAttribute('result','f1');
    filter.appendChild(feColorMatrix);
    var feComponentTransfer = createNS('feComponentTransfer');
    feComponentTransfer.setAttribute('color-interpolation-filters','sRGB');
    filter.appendChild(feComponentTransfer);
    this.matrixFilter = feComponentTransfer;
    var feFuncR = createNS('feFuncR');
    feFuncR.setAttribute('type','table');
    feComponentTransfer.appendChild(feFuncR);
    this.feFuncR = feFuncR;
    var feFuncG = createNS('feFuncG');
    feFuncG.setAttribute('type','table');
    feComponentTransfer.appendChild(feFuncG);
    this.feFuncG = feFuncG;
    var feFuncB = createNS('feFuncB');
    feFuncB.setAttribute('type','table');
    feComponentTransfer.appendChild(feFuncB);
    this.feFuncB = feFuncB;
}

SVGTritoneFilter.prototype.renderFrame = function(forceRender){
    if(forceRender || this.filterManager._mdf){
        var color1 = this.filterManager.effectElements[0].p.v;
        var color2 = this.filterManager.effectElements[1].p.v;
        var color3 = this.filterManager.effectElements[2].p.v;
        var tableR = color3[0] + ' ' + color2[0] + ' ' + color1[0];
        var tableG = color3[1] + ' ' + color2[1] + ' ' + color1[1];
        var tableB = color3[2] + ' ' + color2[2] + ' ' + color1[2];
        this.feFuncR.setAttribute('tableValues', tableR);
        this.feFuncG.setAttribute('tableValues', tableG);
        this.feFuncB.setAttribute('tableValues', tableB);
        //var opacity = this.filterManager.effectElements[2].p.v/100;
        //this.matrixFilter.setAttribute('values',(colorWhite[0]- colorBlack[0])+' 0 0 0 '+ colorBlack[0] +' '+ (colorWhite[1]- colorBlack[1]) +' 0 0 0 '+ colorBlack[1] +' '+ (colorWhite[2]- colorBlack[2]) +' 0 0 0 '+ colorBlack[2] +' 0 0 0 ' + opacity + ' 0');
    }
};
function SVGProLevelsFilter(filter, filterManager){
    this.filterManager = filterManager;
    var effectElements = this.filterManager.effectElements;
    var feComponentTransfer = createNS('feComponentTransfer');
    var feFuncR, feFuncG, feFuncB;
    
    if(effectElements[10].p.k || effectElements[10].p.v !== 0 || effectElements[11].p.k || effectElements[11].p.v !== 1 || effectElements[12].p.k || effectElements[12].p.v !== 1 || effectElements[13].p.k || effectElements[13].p.v !== 0 || effectElements[14].p.k || effectElements[14].p.v !== 1){
        this.feFuncR = this.createFeFunc('feFuncR', feComponentTransfer);
    }
    if(effectElements[17].p.k || effectElements[17].p.v !== 0 || effectElements[18].p.k || effectElements[18].p.v !== 1 || effectElements[19].p.k || effectElements[19].p.v !== 1 || effectElements[20].p.k || effectElements[20].p.v !== 0 || effectElements[21].p.k || effectElements[21].p.v !== 1){
        this.feFuncG = this.createFeFunc('feFuncG', feComponentTransfer);
    }
    if(effectElements[24].p.k || effectElements[24].p.v !== 0 || effectElements[25].p.k || effectElements[25].p.v !== 1 || effectElements[26].p.k || effectElements[26].p.v !== 1 || effectElements[27].p.k || effectElements[27].p.v !== 0 || effectElements[28].p.k || effectElements[28].p.v !== 1){
        this.feFuncB = this.createFeFunc('feFuncB', feComponentTransfer);
    }
    if(effectElements[31].p.k || effectElements[31].p.v !== 0 || effectElements[32].p.k || effectElements[32].p.v !== 1 || effectElements[33].p.k || effectElements[33].p.v !== 1 || effectElements[34].p.k || effectElements[34].p.v !== 0 || effectElements[35].p.k || effectElements[35].p.v !== 1){
        this.feFuncA = this.createFeFunc('feFuncA', feComponentTransfer);
    }
    
    if(this.feFuncR || this.feFuncG || this.feFuncB || this.feFuncA){
        feComponentTransfer.setAttribute('color-interpolation-filters','sRGB');
        filter.appendChild(feComponentTransfer);
        feComponentTransfer = createNS('feComponentTransfer');
    }

    if(effectElements[3].p.k || effectElements[3].p.v !== 0 || effectElements[4].p.k || effectElements[4].p.v !== 1 || effectElements[5].p.k || effectElements[5].p.v !== 1 || effectElements[6].p.k || effectElements[6].p.v !== 0 || effectElements[7].p.k || effectElements[7].p.v !== 1){

        feComponentTransfer.setAttribute('color-interpolation-filters','sRGB');
        filter.appendChild(feComponentTransfer);
        this.feFuncRComposed = this.createFeFunc('feFuncR', feComponentTransfer);
        this.feFuncGComposed = this.createFeFunc('feFuncG', feComponentTransfer);
        this.feFuncBComposed = this.createFeFunc('feFuncB', feComponentTransfer);
    }
}

SVGProLevelsFilter.prototype.createFeFunc = function(type, feComponentTransfer) {
    var feFunc = createNS(type);
    feFunc.setAttribute('type','table');
    feComponentTransfer.appendChild(feFunc);
    return feFunc;
};

SVGProLevelsFilter.prototype.getTableValue = function(inputBlack, inputWhite, gamma, outputBlack, outputWhite) {
    var cnt = 0;
    var segments = 256;
    var perc;
    var min = Math.min(inputBlack, inputWhite);
    var max = Math.max(inputBlack, inputWhite);
    var table = Array.call(null,{length:segments});
    var colorValue;
    var pos = 0;
    var outputDelta = outputWhite - outputBlack; 
    var inputDelta = inputWhite - inputBlack; 
    while(cnt <= 256) {
        perc = cnt/256;
        if(perc <= min){
            colorValue = inputDelta < 0 ? outputWhite : outputBlack;
        } else if(perc >= max){
            colorValue = inputDelta < 0 ? outputBlack : outputWhite;
        } else {
            colorValue = (outputBlack + outputDelta * Math.pow((perc - inputBlack) / inputDelta, 1 / gamma));
        }
        table[pos++] = colorValue;
        cnt += 256/(segments-1);
    }
    return table.join(' ');
};

SVGProLevelsFilter.prototype.renderFrame = function(forceRender){
    if(forceRender || this.filterManager._mdf){
        var val, cnt, perc, bezier;
        var effectElements = this.filterManager.effectElements;
        if(this.feFuncRComposed && (forceRender || effectElements[3].p._mdf || effectElements[4].p._mdf || effectElements[5].p._mdf || effectElements[6].p._mdf || effectElements[7].p._mdf)){
            val = this.getTableValue(effectElements[3].p.v,effectElements[4].p.v,effectElements[5].p.v,effectElements[6].p.v,effectElements[7].p.v);
            this.feFuncRComposed.setAttribute('tableValues',val);
            this.feFuncGComposed.setAttribute('tableValues',val);
            this.feFuncBComposed.setAttribute('tableValues',val);
        }


        if(this.feFuncR && (forceRender || effectElements[10].p._mdf || effectElements[11].p._mdf || effectElements[12].p._mdf || effectElements[13].p._mdf || effectElements[14].p._mdf)){
            val = this.getTableValue(effectElements[10].p.v,effectElements[11].p.v,effectElements[12].p.v,effectElements[13].p.v,effectElements[14].p.v);
            this.feFuncR.setAttribute('tableValues',val);
        }

        if(this.feFuncG && (forceRender || effectElements[17].p._mdf || effectElements[18].p._mdf || effectElements[19].p._mdf || effectElements[20].p._mdf || effectElements[21].p._mdf)){
            val = this.getTableValue(effectElements[17].p.v,effectElements[18].p.v,effectElements[19].p.v,effectElements[20].p.v,effectElements[21].p.v);
            this.feFuncG.setAttribute('tableValues',val);
        }

        if(this.feFuncB && (forceRender || effectElements[24].p._mdf || effectElements[25].p._mdf || effectElements[26].p._mdf || effectElements[27].p._mdf || effectElements[28].p._mdf)){
            val = this.getTableValue(effectElements[24].p.v,effectElements[25].p.v,effectElements[26].p.v,effectElements[27].p.v,effectElements[28].p.v);
            this.feFuncB.setAttribute('tableValues',val);
        }

        if(this.feFuncA && (forceRender || effectElements[31].p._mdf || effectElements[32].p._mdf || effectElements[33].p._mdf || effectElements[34].p._mdf || effectElements[35].p._mdf)){
            val = this.getTableValue(effectElements[31].p.v,effectElements[32].p.v,effectElements[33].p.v,effectElements[34].p.v,effectElements[35].p.v);
            this.feFuncA.setAttribute('tableValues',val);
        }
        
    }
};
function SVGDropShadowEffect(filter, filterManager){
    filter.setAttribute('x','-100%');
    filter.setAttribute('y','-100%');
    filter.setAttribute('width','400%');
    filter.setAttribute('height','400%');
    this.filterManager = filterManager;

    var feGaussianBlur = createNS('feGaussianBlur');
    feGaussianBlur.setAttribute('in','SourceAlpha');
    feGaussianBlur.setAttribute('result','drop_shadow_1');
    feGaussianBlur.setAttribute('stdDeviation','0');
    this.feGaussianBlur = feGaussianBlur;
    filter.appendChild(feGaussianBlur);

    var feOffset = createNS('feOffset');
    feOffset.setAttribute('dx','25');
    feOffset.setAttribute('dy','0');
    feOffset.setAttribute('in','drop_shadow_1');
    feOffset.setAttribute('result','drop_shadow_2');
    this.feOffset = feOffset;
    filter.appendChild(feOffset);
    var feFlood = createNS('feFlood');
    feFlood.setAttribute('flood-color','#00ff00');
    feFlood.setAttribute('flood-opacity','1');
    feFlood.setAttribute('result','drop_shadow_3');
    this.feFlood = feFlood;
    filter.appendChild(feFlood);

    var feComposite = createNS('feComposite');
    feComposite.setAttribute('in','drop_shadow_3');
    feComposite.setAttribute('in2','drop_shadow_2');
    feComposite.setAttribute('operator','in');
    feComposite.setAttribute('result','drop_shadow_4');
    filter.appendChild(feComposite);


    var feMerge = createNS('feMerge');
    filter.appendChild(feMerge);
    var feMergeNode;
    feMergeNode = createNS('feMergeNode');
    feMerge.appendChild(feMergeNode);
    feMergeNode = createNS('feMergeNode');
    feMergeNode.setAttribute('in','SourceGraphic');
    this.feMergeNode = feMergeNode;
    this.feMerge = feMerge;
    this.originalNodeAdded = false;
    feMerge.appendChild(feMergeNode);
}

SVGDropShadowEffect.prototype.renderFrame = function(forceRender){
    if(forceRender || this.filterManager._mdf){
        if(forceRender || this.filterManager.effectElements[4].p._mdf){
            this.feGaussianBlur.setAttribute('stdDeviation', this.filterManager.effectElements[4].p.v / 4);
        }
        if(forceRender || this.filterManager.effectElements[0].p._mdf){
            var col = this.filterManager.effectElements[0].p.v;
            this.feFlood.setAttribute('flood-color',rgbToHex(Math.round(col[0]*255),Math.round(col[1]*255),Math.round(col[2]*255)));
        }
        if(forceRender || this.filterManager.effectElements[1].p._mdf){
            this.feFlood.setAttribute('flood-opacity',this.filterManager.effectElements[1].p.v/255);
        }
        if(forceRender || this.filterManager.effectElements[2].p._mdf || this.filterManager.effectElements[3].p._mdf){
            var distance = this.filterManager.effectElements[3].p.v;
            var angle = (this.filterManager.effectElements[2].p.v - 90) * degToRads;
            var x = distance * Math.cos(angle);
            var y = distance * Math.sin(angle);
            this.feOffset.setAttribute('dx', x);
            this.feOffset.setAttribute('dy', y);
        }
        /*if(forceRender || this.filterManager.effectElements[5].p._mdf){
            if(this.filterManager.effectElements[5].p.v === 1 && this.originalNodeAdded) {
                this.feMerge.removeChild(this.feMergeNode);
                this.originalNodeAdded = false;
            } else if(this.filterManager.effectElements[5].p.v === 0 && !this.originalNodeAdded) {
                this.feMerge.appendChild(this.feMergeNode);
                this.originalNodeAdded = true;
            }
        }*/
    }
};
var _svgMatteSymbols = [];

function SVGMatte3Effect(filterElem, filterManager, elem){
    this.initialized = false;
    this.filterManager = filterManager;
    this.filterElem = filterElem;
    this.elem = elem;
    elem.matteElement = createNS('g');
    elem.matteElement.appendChild(elem.layerElement);
    elem.matteElement.appendChild(elem.transformedElement);
    elem.baseElement = elem.matteElement;
}

SVGMatte3Effect.prototype.findSymbol = function(mask) {
    var i = 0, len = _svgMatteSymbols.length;
    while(i < len) {
        if(_svgMatteSymbols[i] === mask) {
            return _svgMatteSymbols[i];
        }
        i += 1;
    }
    return null;
};

SVGMatte3Effect.prototype.replaceInParent = function(mask, symbolId) {
    var parentNode = mask.layerElement.parentNode;
    if(!parentNode) {
        return;
    }
    var children = parentNode.children;
    var i = 0, len = children.length;
    while (i < len) {
        if (children[i] === mask.layerElement) {
            break;
        }
        i += 1;
    }
    var nextChild;
    if (i <= len - 2) {
        nextChild = children[i + 1];
    }
    var useElem = createNS('use');
    useElem.setAttribute('href', '#' + symbolId);
    if(nextChild) {
        parentNode.insertBefore(useElem, nextChild);
    } else {
        parentNode.appendChild(useElem);
    }
};

SVGMatte3Effect.prototype.setElementAsMask = function(elem, mask) {
    if(!this.findSymbol(mask)) {
        var symbolId = createElementID();
        var masker = createNS('mask');
        masker.setAttribute('id', mask.layerId);
        masker.setAttribute('mask-type', 'alpha');
        _svgMatteSymbols.push(mask);
        var defs = elem.globalData.defs;
        defs.appendChild(masker);
        var symbol = createNS('symbol');
        symbol.setAttribute('id', symbolId);
        this.replaceInParent(mask, symbolId);
        symbol.appendChild(mask.layerElement);
        defs.appendChild(symbol);
        var useElem = createNS('use');
        useElem.setAttribute('href', '#' + symbolId);
        masker.appendChild(useElem);
        mask.data.hd = false;
        mask.show();
    }
    elem.setMatte(mask.layerId);
};

SVGMatte3Effect.prototype.initialize = function() {
    var ind = this.filterManager.effectElements[0].p.v;
    var elements = this.elem.comp.elements;
    var i = 0, len = elements.length;
    while (i < len) {
    	if (elements[i] && elements[i].data.ind === ind) {
    		this.setElementAsMask(this.elem, elements[i]);
    	}
    	i += 1;
    }
    this.initialized = true;
};

SVGMatte3Effect.prototype.renderFrame = function() {
	if(!this.initialized) {
		this.initialize();
	}
};
function SVGEffects(elem){
    var i, len = elem.data.ef ? elem.data.ef.length : 0;
    var filId = createElementID();
    var fil = filtersFactory.createFilter(filId);
    var count = 0;
    this.filters = [];
    var filterManager;
    for(i=0;i<len;i+=1){
        filterManager = null;
        if(elem.data.ef[i].ty === 20){
            count += 1;
            filterManager = new SVGTintFilter(fil, elem.effectsManager.effectElements[i]);
        }else if(elem.data.ef[i].ty === 21){
            count += 1;
            filterManager = new SVGFillFilter(fil, elem.effectsManager.effectElements[i]);
        }else if(elem.data.ef[i].ty === 22){
            filterManager = new SVGStrokeEffect(elem, elem.effectsManager.effectElements[i]);
        }else if(elem.data.ef[i].ty === 23){
            count += 1;
            filterManager = new SVGTritoneFilter(fil, elem.effectsManager.effectElements[i]);
        }else if(elem.data.ef[i].ty === 24){
            count += 1;
            filterManager = new SVGProLevelsFilter(fil, elem.effectsManager.effectElements[i]);
        }else if(elem.data.ef[i].ty === 25){
            count += 1;
            filterManager = new SVGDropShadowEffect(fil, elem.effectsManager.effectElements[i]);
        }else if(elem.data.ef[i].ty === 28){
            //count += 1;
            filterManager = new SVGMatte3Effect(fil, elem.effectsManager.effectElements[i], elem);
        }else if(elem.data.ef[i].ty === 29){
            count += 1;
            filterManager = new SVGGaussianBlurEffect(fil, elem.effectsManager.effectElements[i]);
        }
        if(filterManager) {
            this.filters.push(filterManager);
        }
    }
    if(count){
        elem.globalData.defs.appendChild(fil);
        elem.layerElement.setAttribute('filter','url(' + locationHref + '#'+filId+')');
    }
    if (this.filters.length) {
        elem.addRenderableComponent(this);
    }
}

SVGEffects.prototype.renderFrame = function(_isFirstFrame){
    var i, len = this.filters.length;
    for(i=0;i<len;i+=1){
        this.filters[i].renderFrame(_isFirstFrame);
    }
};
function CVContextData() {
	this.saved = [];
    this.cArrPos = 0;
    this.cTr = new Matrix();
    this.cO = 1;
    var i, len = 15;
    this.savedOp = createTypedArray('float32', len);
    for(i=0;i<len;i+=1){
        this.saved[i] = createTypedArray('float32', 16);
    }
    this._length = len;
}

CVContextData.prototype.duplicate = function() {
	var newLength = this._length * 2;
	var currentSavedOp = this.savedOp;
    this.savedOp = createTypedArray('float32', newLength);
    this.savedOp.set(currentSavedOp);
    var i = 0;
    for(i = this._length; i < newLength; i += 1) {
        this.saved[i] = createTypedArray('float32', 16);
    }
    this._length = newLength;
};

CVContextData.prototype.reset = function() {
	this.cArrPos = 0;
	this.cTr.reset();
    this.cO = 1;
};
function CVBaseElement(){
}

CVBaseElement.prototype = {
    createElements: function(){},
    initRendererElement: function(){},
    createContainerElements: function(){
        this.canvasContext = this.globalData.canvasContext;
        this.renderableEffectsManager = new CVEffects(this);
    },
    createContent: function(){},
    setBlendMode: function(){
        var globalData = this.globalData;
        if(globalData.blendMode !== this.data.bm) {
            globalData.blendMode = this.data.bm;
            var blendModeValue = getBlendMode(this.data.bm);
            globalData.canvasContext.globalCompositeOperation = blendModeValue;
        }
    },
    createRenderableComponents: function(){
        this.maskManager = new CVMaskElement(this.data, this);
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
CVBaseElement.prototype.hide = CVBaseElement.prototype.hideElement;
CVBaseElement.prototype.show = CVBaseElement.prototype.showElement;

function CVImageElement(data, globalData, comp){
    this.assetData = globalData.getImageData(data.refId);
    this.img = globalData.imageLoader.getImage(this.assetData);
    this.initElement(data,globalData,comp);
}
extendPrototype([BaseElement, TransformElement, CVBaseElement, HierarchyElement, FrameElement, RenderableElement], CVImageElement);

CVImageElement.prototype.initElement = SVGShapeElement.prototype.initElement;
CVImageElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;

CVImageElement.prototype.createContent = function(){

    if (this.img.width && (this.assetData.w !== this.img.width || this.assetData.h !== this.img.height)) {
        var canvas = createTag('canvas');
        canvas.width = this.assetData.w;
        canvas.height = this.assetData.h;
        var ctx = canvas.getContext('2d');

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
        ctx.drawImage(this.img,(imgW-widthCrop)/2,(imgH-heightCrop)/2,widthCrop,heightCrop,0,0,this.assetData.w,this.assetData.h);
        this.img = canvas;
    }

};

CVImageElement.prototype.renderInnerContent = function(parentMatrix){
    this.canvasContext.drawImage(this.img, 0, 0);
};

CVImageElement.prototype.destroy = function(){
    this.img = null;
};
function CVCompElement(data, globalData, comp) {
    this.completeLayers = false;
    this.layers = data.layers;
    this.pendingElements = [];
    this.elements = createSizedArray(this.layers.length);
    this.initElement(data, globalData, comp);
    this.tm = data.tm ? PropertyFactory.getProp(this,data.tm,0,globalData.frameRate, this) : {_placeholder:true};
}

extendPrototype([CanvasRenderer, ICompElement, CVBaseElement], CVCompElement);

CVCompElement.prototype.renderInnerContent = function() {
    var ctx = this.canvasContext;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.data.w, 0);
    ctx.lineTo(this.data.w, this.data.h);
    ctx.lineTo(0, this.data.h);
    ctx.lineTo(0, 0);
    ctx.clip();
    var i,len = this.layers.length;
    for( i = len - 1; i >= 0; i -= 1 ){
        if(this.completeLayers || this.elements[i]){
            this.elements[i].renderFrame();
        }
    }
};

CVCompElement.prototype.destroy = function(){
    var i,len = this.layers.length;
    for( i = len - 1; i >= 0; i -= 1 ){
        if(this.elements[i]) {
            this.elements[i].destroy();
        }
    }
    this.layers = null;
    this.elements = null;
};

function CVMaskElement(data,element){
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

CVMaskElement.prototype.renderFrame = function () {
    if(!this.hasMasks){
        return;
    }
    var transform = this.element.finalTransform.mat;
    var ctx = this.element.canvasContext;
    var i, len = this.masksProperties.length;
    var pt,pts,data;
    ctx.beginPath();
    for (i = 0; i < len; i++) {
        if(this.masksProperties[i].mode !== 'n'){
            if (this.masksProperties[i].inv) {
                ctx.moveTo(0, 0);
                ctx.lineTo(this.element.globalData.compSize.w, 0);
                ctx.lineTo(this.element.globalData.compSize.w, this.element.globalData.compSize.h);
                ctx.lineTo(0, this.element.globalData.compSize.h);
                ctx.lineTo(0, 0);
            }
            data = this.viewData[i].v;
            pt = transform.applyToPointArray(data.v[0][0],data.v[0][1],0);
            ctx.moveTo(pt[0], pt[1]);
            var j, jLen = data._length;
            for (j = 1; j < jLen; j++) {
                pts = transform.applyToTriplePoints(data.o[j - 1], data.i[j], data.v[j]);
                ctx.bezierCurveTo(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
            }
            pts = transform.applyToTriplePoints(data.o[j - 1], data.i[0], data.v[0]);
            ctx.bezierCurveTo(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
        }
    }
    this.element.globalData.renderer.save(true);
    ctx.clip();
};

CVMaskElement.prototype.getMaskProperty = MaskElement.prototype.getMaskProperty;

CVMaskElement.prototype.destroy = function(){
    this.element = null;
};
function CVShapeElement(data, globalData, comp) {
    this.shapes = [];
    this.shapesData = data.shapes;
    this.stylesList = [];
    this.itemsData = [];
    this.prevViewData = [];
    this.shapeModifiers = [];
    this.processedElements = [];
    this.transformsManager = new ShapeTransformManager();
    this.initElement(data, globalData, comp);
}

extendPrototype([BaseElement,TransformElement,CVBaseElement,IShapeElement,HierarchyElement,FrameElement,RenderableElement], CVShapeElement);

CVShapeElement.prototype.initElement = RenderableDOMElement.prototype.initElement;

CVShapeElement.prototype.transformHelper = {opacity:1,_opMdf:false};

CVShapeElement.prototype.dashResetter = [];

CVShapeElement.prototype.createContent = function(){
    this.searchShapes(this.shapesData,this.itemsData,this.prevViewData, true, []);
};

CVShapeElement.prototype.createStyleElement = function(data, transforms) {
    var styleElem = {
        data: data,
        type: data.ty,
        preTransforms: this.transformsManager.addTransformSequence(transforms),
        transforms: [],
        elements: [],
        closed: data.hd === true
    };
    var elementData = {};
    if(data.ty == 'fl' || data.ty == 'st'){
        elementData.c = PropertyFactory.getProp(this,data.c,1,255,this);
        if(!elementData.c.k){
            styleElem.co = 'rgb('+bm_floor(elementData.c.v[0])+','+bm_floor(elementData.c.v[1])+','+bm_floor(elementData.c.v[2])+')';
        }
    } else if (data.ty === 'gf' || data.ty === 'gs') {
        elementData.s = PropertyFactory.getProp(this,data.s,1,null,this);
        elementData.e = PropertyFactory.getProp(this,data.e,1,null,this);
        elementData.h = PropertyFactory.getProp(this,data.h||{k:0},0,0.01,this);
        elementData.a = PropertyFactory.getProp(this,data.a||{k:0},0,degToRads,this);
        elementData.g = new GradientProperty(this,data.g,this);
    }
    elementData.o = PropertyFactory.getProp(this,data.o,0,0.01,this);
    if(data.ty == 'st' || data.ty == 'gs') {
        styleElem.lc = this.lcEnum[data.lc] || 'round';
        styleElem.lj = this.ljEnum[data.lj] || 'round';
        if(data.lj == 1) {
            styleElem.ml = data.ml;
        }
        elementData.w = PropertyFactory.getProp(this,data.w,0,null,this);
        if(!elementData.w.k){
            styleElem.wi = elementData.w.v;
        }
        if(data.d){
            var d = new DashProperty(this,data.d,'canvas', this);
            elementData.d = d;
            if(!elementData.d.k){
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

CVShapeElement.prototype.createGroupElement = function(data) {
    var elementData = {
        it: [],
        prevViewData: []
    };
    return elementData;
};

CVShapeElement.prototype.createTransformElement = function(data) {
    var elementData = {
        transform : {
            opacity: 1,
            _opMdf:false,
            key: this.transformsManager.getNewKey(),
            op: PropertyFactory.getProp(this,data.o,0,0.01,this),
            mProps: TransformPropertyFactory.getTransformProperty(this,data,this)
        }
    };
    return elementData;
};

CVShapeElement.prototype.createShapeElement = function(data) {
    var elementData = new CVShapeData(this, data, this.stylesList, this.transformsManager);
    
    this.shapes.push(elementData);
    this.addShapeToModifiers(elementData);
    return elementData;
};

CVShapeElement.prototype.reloadShapes = function() {
    this._isFirstFrame = true;
    var i, len = this.itemsData.length;
    for (i = 0; i < len; i += 1) {
        this.prevViewData[i] = this.itemsData[i];
    }
    this.searchShapes(this.shapesData,this.itemsData,this.prevViewData, true, []);
    len = this.dynamicProperties.length;
    for (i = 0; i < len; i += 1) {
        this.dynamicProperties[i].getValue();
    }
    this.renderModifiers();
    this.transformsManager.processSequences(this._isFirstFrame);
};

CVShapeElement.prototype.addTransformToStyleList = function(transform) {
    var i, len = this.stylesList.length;
    for (i = 0; i < len; i += 1) {
        if(!this.stylesList[i].closed) {
            this.stylesList[i].transforms.push(transform);
        }
    }
}

CVShapeElement.prototype.removeTransformFromStyleList = function() {
    var i, len = this.stylesList.length;
    for (i = 0; i < len; i += 1) {
        if(!this.stylesList[i].closed) {
            this.stylesList[i].transforms.pop();
        }
    }
}

CVShapeElement.prototype.closeStyles = function(styles) {
    var i, len = styles.length, j, jLen;
    for (i = 0; i < len; i += 1) {
        styles[i].closed = true;
    }
}

CVShapeElement.prototype.searchShapes = function(arr,itemsData, prevViewData, shouldRender, transforms){
    var i, len = arr.length - 1;
    var j, jLen;
    var ownStyles = [], ownModifiers = [], processedPos, modifier, currentTransform;
    var ownTransforms = [].concat(transforms);
    for(i=len;i>=0;i-=1){
        processedPos = this.searchProcessedElement(arr[i]);
        if(!processedPos){
            arr[i]._shouldRender = shouldRender;
        } else {
            itemsData[i] = prevViewData[processedPos - 1];
        }
        if(arr[i].ty == 'fl' || arr[i].ty == 'st'|| arr[i].ty == 'gf'|| arr[i].ty == 'gs'){
            if(!processedPos){
                itemsData[i] = this.createStyleElement(arr[i], ownTransforms);
            } else {
                itemsData[i].style.closed = false;
            }
            
            ownStyles.push(itemsData[i].style);
        }else if(arr[i].ty == 'gr'){
            if(!processedPos){
                itemsData[i] = this.createGroupElement(arr[i]);
            } else {
                jLen = itemsData[i].it.length;
                for(j=0;j<jLen;j+=1){
                    itemsData[i].prevViewData[j] = itemsData[i].it[j];
                }
            }
            this.searchShapes(arr[i].it,itemsData[i].it,itemsData[i].prevViewData, shouldRender, ownTransforms);
        }else if(arr[i].ty == 'tr'){
            if(!processedPos){
                currentTransform = this.createTransformElement(arr[i]);
                itemsData[i] = currentTransform;
            }
            ownTransforms.push(itemsData[i]);
            this.addTransformToStyleList(itemsData[i]);
        }else if(arr[i].ty == 'sh' || arr[i].ty == 'rc' || arr[i].ty == 'el' || arr[i].ty == 'sr'){
            if(!processedPos){
                itemsData[i] = this.createShapeElement(arr[i]);
            }
            
        }else if(arr[i].ty == 'tm' || arr[i].ty == 'rd'){
            if(!processedPos){
                modifier = ShapeModifiers.getModifier(arr[i].ty);
                modifier.init(this,arr[i]);
                itemsData[i] = modifier;
                this.shapeModifiers.push(modifier);
            } else {
                modifier = itemsData[i];
                modifier.closed = false;
            }
            ownModifiers.push(modifier);
        } else if(arr[i].ty == 'rp'){
            if(!processedPos){
                modifier = ShapeModifiers.getModifier(arr[i].ty);
                itemsData[i] = modifier;
                modifier.init(this,arr,i,itemsData);
                this.shapeModifiers.push(modifier);
                shouldRender = false;
            }else{
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
    for(i=0;i<len;i+=1){
        ownModifiers[i].closed = true;
    }
};

CVShapeElement.prototype.renderInnerContent = function() {
    this.transformHelper.opacity = 1;
    this.transformHelper._opMdf = false;
    this.renderModifiers();
    this.transformsManager.processSequences(this._isFirstFrame);
    this.renderShape(this.transformHelper,this.shapesData,this.itemsData,true);
};

CVShapeElement.prototype.renderShapeTransform = function(parentTransform, groupTransform) {
    var props, groupMatrix;
    if(parentTransform._opMdf || groupTransform.op._mdf || this._isFirstFrame) {
        groupTransform.opacity = parentTransform.opacity;
        groupTransform.opacity *= groupTransform.op.v;
        groupTransform._opMdf = true;
    }
};

CVShapeElement.prototype.drawLayer = function() {
    var i, len = this.stylesList.length;
    var j, jLen, k, kLen,elems,nodes, renderer = this.globalData.renderer, ctx = this.globalData.canvasContext, type, currentStyle;
    for(i=0;i<len;i+=1){
        currentStyle = this.stylesList[i];
        type = currentStyle.type;

        //Skipping style when
        //Stroke width equals 0
        //style should not be rendered (extra unused repeaters)
        //current opacity equals 0
        //global opacity equals 0
        if(((type === 'st' || type === 'gs') && currentStyle.wi === 0) || !currentStyle.data._shouldRender || currentStyle.coOp === 0 || this.globalData.currentGlobalAlpha === 0){
            continue;
        }
        renderer.save();
        elems = currentStyle.elements;
        if(type === 'st' || type === 'gs'){
            ctx.strokeStyle = type === 'st' ? currentStyle.co : currentStyle.grd;
            ctx.lineWidth = currentStyle.wi;
            ctx.lineCap = currentStyle.lc;
            ctx.lineJoin = currentStyle.lj;
            ctx.miterLimit = currentStyle.ml || 0;
        } else {
            ctx.fillStyle = type === 'fl' ? currentStyle.co : currentStyle.grd;
        }
        renderer.ctxOpacity(currentStyle.coOp);
        if(type !== 'st' && type !== 'gs'){
            ctx.beginPath();
        }
        renderer.ctxTransform(currentStyle.preTransforms.finalTransform.props);
        jLen = elems.length;
        for(j=0;j<jLen;j+=1){
            if(type === 'st' || type === 'gs'){
                ctx.beginPath();
                if(currentStyle.da){
                    ctx.setLineDash(currentStyle.da);
                    ctx.lineDashOffset = currentStyle.do;
                }
            }
            nodes = elems[j].trNodes;
            kLen = nodes.length;

            for(k=0;k<kLen;k+=1){
                if(nodes[k].t == 'm'){
                    ctx.moveTo(nodes[k].p[0],nodes[k].p[1]);
                }else if(nodes[k].t == 'c'){
                    ctx.bezierCurveTo(nodes[k].pts[0],nodes[k].pts[1],nodes[k].pts[2],nodes[k].pts[3],nodes[k].pts[4],nodes[k].pts[5]);
                }else{
                    ctx.closePath();
                }
            }
            if(type === 'st' || type === 'gs'){
                ctx.stroke();
                if(currentStyle.da){
                    ctx.setLineDash(this.dashResetter);
                }
            }
        }
        if(type !== 'st' && type !== 'gs'){
            ctx.fill(currentStyle.r);
        }
        renderer.restore();
    }
};

CVShapeElement.prototype.renderShape = function(parentTransform,items,data,isMain){
    var i, len = items.length - 1;
    var groupTransform;
    groupTransform = parentTransform;
    for(i=len;i>=0;i-=1){
        if(items[i].ty == 'tr'){
            groupTransform = data[i].transform;
            this.renderShapeTransform(parentTransform, groupTransform);
        }else if(items[i].ty == 'sh' || items[i].ty == 'el' || items[i].ty == 'rc' || items[i].ty == 'sr'){
            this.renderPath(items[i],data[i]);
        }else if(items[i].ty == 'fl'){
            this.renderFill(items[i],data[i],groupTransform);
        }else if(items[i].ty == 'st'){
            this.renderStroke(items[i],data[i],groupTransform);
        }else if(items[i].ty == 'gf' || items[i].ty == 'gs'){
            this.renderGradientFill(items[i],data[i],groupTransform);
        }else if(items[i].ty == 'gr'){
            this.renderShape(groupTransform,items[i].it,data[i].it);
        }else if(items[i].ty == 'tm'){
            //
        }
    }
    if(isMain){
        this.drawLayer();
    }
    
};

CVShapeElement.prototype.renderStyledShape = function(styledShape, shape){
    if(this._isFirstFrame || shape._mdf || styledShape.transforms._mdf) {
        var shapeNodes = styledShape.trNodes;
        var paths = shape.paths;
        var i, len, j, jLen = paths._length;
        shapeNodes.length = 0;
        var groupTransformMat = styledShape.transforms.finalTransform;
        for (j = 0; j < jLen; j += 1) {
            var pathNodes = paths.shapes[j];
            if(pathNodes && pathNodes.v){
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

CVShapeElement.prototype.renderPath = function(pathData,itemData){
    if(pathData.hd !== true && pathData._shouldRender) {
        var i, len = itemData.styledShapes.length;
        for (i = 0; i < len; i += 1) {
            this.renderStyledShape(itemData.styledShapes[i], itemData.sh);
        }
    }
};

CVShapeElement.prototype.renderFill = function(styleData,itemData, groupTransform){
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

CVShapeElement.prototype.renderGradientFill = function(styleData,itemData, groupTransform){
    var styleElem = itemData.style;
    if(!styleElem.grd || itemData.g._mdf || itemData.s._mdf || itemData.e._mdf || (styleData.t !== 1 && (itemData.h._mdf || itemData.a._mdf))) {
        var ctx = this.globalData.canvasContext;
        var grd;
        var pt1 = itemData.s.v, pt2 = itemData.e.v;
        if (styleData.t === 1) {
            grd = ctx.createLinearGradient(pt1[0], pt1[1], pt2[0], pt2[1]);
        } else {
            var rad = Math.sqrt(Math.pow(pt1[0] - pt2[0], 2) + Math.pow(pt1[1] - pt2[1], 2));
            var ang = Math.atan2(pt2[1] - pt1[1], pt2[0] - pt1[0]);

            var percent = itemData.h.v >= 1 ? 0.99 : itemData.h.v <= -1 ? -0.99: itemData.h.v;
            var dist = rad * percent;
            var x = Math.cos(ang + itemData.a.v) * dist + pt1[0];
            var y = Math.sin(ang + itemData.a.v) * dist + pt1[1];
            var grd = ctx.createRadialGradient(x, y, 0, pt1[0], pt1[1], rad);
        }

        var i, len = styleData.g.p;
        var cValues = itemData.g.c;
        var opacity = 1;

        for (i = 0; i < len; i += 1){
            if(itemData.g._hasOpacity && itemData.g._collapsable) {
                opacity = itemData.g.o[i*2 + 1];
            }
            grd.addColorStop(cValues[i * 4] / 100,'rgba('+ cValues[i * 4 + 1] + ',' + cValues[i * 4 + 2] + ','+cValues[i * 4 + 3] + ',' + opacity + ')');
        }
        styleElem.grd = grd;
    }
    styleElem.coOp = itemData.o.v*groupTransform.opacity;
    
};

CVShapeElement.prototype.renderStroke = function(styleData,itemData, groupTransform){
    var styleElem = itemData.style;
    var d = itemData.d;
    if(d && (d._mdf  || this._isFirstFrame)){
        styleElem.da = d.dashArray;
        styleElem.do = d.dashoffset[0];
    }
    if(itemData.c._mdf || this._isFirstFrame){
        styleElem.co = 'rgb('+bm_floor(itemData.c.v[0])+','+bm_floor(itemData.c.v[1])+','+bm_floor(itemData.c.v[2])+')';
    }
    if(itemData.o._mdf || groupTransform._opMdf || this._isFirstFrame){
        styleElem.coOp = itemData.o.v*groupTransform.opacity;
    }
    if(itemData.w._mdf || this._isFirstFrame){
        styleElem.wi = itemData.w.v;
    }
};


CVShapeElement.prototype.destroy = function(){
    this.shapesData = null;
    this.globalData = null;
    this.canvasContext = null;
    this.stylesList.length = 0;
    this.itemsData.length = 0;
};


function CVSolidElement(data, globalData, comp) {
    this.initElement(data,globalData,comp);
}
extendPrototype([BaseElement, TransformElement, CVBaseElement, HierarchyElement, FrameElement, RenderableElement], CVSolidElement);

CVSolidElement.prototype.initElement = SVGShapeElement.prototype.initElement;
CVSolidElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;

CVSolidElement.prototype.renderInnerContent = function() {
    var ctx = this.canvasContext;
    ctx.fillStyle = this.data.sc;
    ctx.fillRect(0, 0, this.data.sw, this.data.sh);
    //
};
function CVTextElement(data, globalData, comp){
    this.textSpans = [];
    this.yOffset = 0;
    this.fillColorAnim = false;
    this.strokeColorAnim = false;
    this.strokeWidthAnim = false;
    this.stroke = false;
    this.fill = false;
    this.justifyOffset = 0;
    this.currentRender = null;
    this.renderType = 'canvas';
    this.values = {
        fill: 'rgba(0,0,0,0)',
        stroke: 'rgba(0,0,0,0)',
        sWidth: 0,
        fValue: ''
    };
    this.initElement(data,globalData,comp);
}
extendPrototype([BaseElement,TransformElement,CVBaseElement,HierarchyElement,FrameElement,RenderableElement,ITextElement], CVTextElement);

CVTextElement.prototype.tHelper = createTag('canvas').getContext('2d');

CVTextElement.prototype.buildNewText = function(){
    var documentData = this.textProperty.currentData;
    this.renderedLetters = createSizedArray(documentData.l ? documentData.l.length : 0);

    var hasFill = false;
    if(documentData.fc) {
        hasFill = true;
        this.values.fill = this.buildColor(documentData.fc);
    }else{
        this.values.fill = 'rgba(0,0,0,0)';
    }
    this.fill = hasFill;
    var hasStroke = false;
    if(documentData.sc){
        hasStroke = true;
        this.values.stroke = this.buildColor(documentData.sc);
        this.values.sWidth = documentData.sw;
    }
    var fontData = this.globalData.fontManager.getFontByName(documentData.f);
    var i, len;
    var letters = documentData.l;
    var matrixHelper = this.mHelper;
    this.stroke = hasStroke;
    this.values.fValue = documentData.finalSize + 'px '+ this.globalData.fontManager.getFontByName(documentData.f).fFamily;
    len = documentData.finalText.length;
    //this.tHelper.font = this.values.fValue;
    var charData, shapeData, k, kLen, shapes, j, jLen, pathNodes, commands, pathArr, singleShape = this.data.singleShape;
    var trackingOffset = documentData.tr/1000*documentData.finalSize;
    var xPos = 0, yPos = 0, firstLine = true;
    var cnt = 0;
    for (i = 0; i < len; i += 1) {
        charData = this.globalData.fontManager.getCharData(documentData.finalText[i], fontData.fStyle, this.globalData.fontManager.getFontByName(documentData.f).fFamily);
        shapeData = charData && charData.data || {};
        matrixHelper.reset();
        if(singleShape && letters[i].n) {
            xPos = -trackingOffset;
            yPos += documentData.yOffset;
            yPos += firstLine ? 1 : 0;
            firstLine = false;
        }

        shapes = shapeData.shapes ? shapeData.shapes[0].it : [];
        jLen = shapes.length;
        matrixHelper.scale(documentData.finalSize/100,documentData.finalSize/100);
        if(singleShape){
            this.applyTextPropertiesToMatrix(documentData, matrixHelper, letters[i].line, xPos, yPos);
        }
        commands = createSizedArray(jLen);
        for(j=0;j<jLen;j+=1){
            kLen = shapes[j].ks.k.i.length;
            pathNodes = shapes[j].ks.k;
            pathArr = [];
            for(k=1;k<kLen;k+=1){
                if(k==1){
                    pathArr.push(matrixHelper.applyToX(pathNodes.v[0][0],pathNodes.v[0][1],0),matrixHelper.applyToY(pathNodes.v[0][0],pathNodes.v[0][1],0));
                }
                pathArr.push(matrixHelper.applyToX(pathNodes.o[k-1][0],pathNodes.o[k-1][1],0),matrixHelper.applyToY(pathNodes.o[k-1][0],pathNodes.o[k-1][1],0),matrixHelper.applyToX(pathNodes.i[k][0],pathNodes.i[k][1],0),matrixHelper.applyToY(pathNodes.i[k][0],pathNodes.i[k][1],0),matrixHelper.applyToX(pathNodes.v[k][0],pathNodes.v[k][1],0),matrixHelper.applyToY(pathNodes.v[k][0],pathNodes.v[k][1],0));
            }
            pathArr.push(matrixHelper.applyToX(pathNodes.o[k-1][0],pathNodes.o[k-1][1],0),matrixHelper.applyToY(pathNodes.o[k-1][0],pathNodes.o[k-1][1],0),matrixHelper.applyToX(pathNodes.i[0][0],pathNodes.i[0][1],0),matrixHelper.applyToY(pathNodes.i[0][0],pathNodes.i[0][1],0),matrixHelper.applyToX(pathNodes.v[0][0],pathNodes.v[0][1],0),matrixHelper.applyToY(pathNodes.v[0][0],pathNodes.v[0][1],0));
            commands[j] = pathArr;
        }
        if(singleShape){
            xPos += letters[i].l;
            xPos += trackingOffset;
        }
        if(this.textSpans[cnt]){
            this.textSpans[cnt].elem = commands;
        } else {
            this.textSpans[cnt] = {elem: commands};
        }
        cnt +=1;
    }
};

CVTextElement.prototype.renderInnerContent = function(){
    var ctx = this.canvasContext;
    var finalMat = this.finalTransform.mat.props;
    ctx.font = this.values.fValue;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 4;

    if(!this.data.singleShape){
        this.textAnimator.getMeasures(this.textProperty.currentData, this.lettersChangedFlag);
    }

    var  i,len, j, jLen, k, kLen;
    var renderedLetters = this.textAnimator.renderedLetters;

    var letters = this.textProperty.currentData.l;

    len = letters.length;
    var renderedLetter;
    var lastFill = null, lastStroke = null, lastStrokeW = null, commands, pathArr;
    for(i=0;i<len;i+=1){
        if(letters[i].n){
            continue;
        }
        renderedLetter = renderedLetters[i];
        if(renderedLetter){
            this.globalData.renderer.save();
            this.globalData.renderer.ctxTransform(renderedLetter.p);
            this.globalData.renderer.ctxOpacity(renderedLetter.o);
        }
        if(this.fill){
            if(renderedLetter && renderedLetter.fc){
                if(lastFill !== renderedLetter.fc){
                    lastFill = renderedLetter.fc;
                    ctx.fillStyle = renderedLetter.fc;
                }
            }else if(lastFill !== this.values.fill){
                lastFill = this.values.fill;
                ctx.fillStyle = this.values.fill;
            }
            commands = this.textSpans[i].elem;
            jLen = commands.length;
            this.globalData.canvasContext.beginPath();
            for(j=0;j<jLen;j+=1) {
                pathArr = commands[j];
                kLen = pathArr.length;
                this.globalData.canvasContext.moveTo(pathArr[0], pathArr[1]);
                for (k = 2; k < kLen; k += 6) {
                    this.globalData.canvasContext.bezierCurveTo(pathArr[k], pathArr[k + 1], pathArr[k + 2], pathArr[k + 3], pathArr[k + 4], pathArr[k + 5]);
                }
            }
            this.globalData.canvasContext.closePath();
            this.globalData.canvasContext.fill();
            ///ctx.fillText(this.textSpans[i].val,0,0);
        }
        if(this.stroke){
            if(renderedLetter && renderedLetter.sw){
                if(lastStrokeW !== renderedLetter.sw){
                    lastStrokeW = renderedLetter.sw;
                    ctx.lineWidth = renderedLetter.sw;
                }
            }else if(lastStrokeW !== this.values.sWidth){
                lastStrokeW = this.values.sWidth;
                ctx.lineWidth = this.values.sWidth;
            }
            if(renderedLetter && renderedLetter.sc){
                if(lastStroke !== renderedLetter.sc){
                    lastStroke = renderedLetter.sc;
                    ctx.strokeStyle = renderedLetter.sc;
                }
            }else if(lastStroke !== this.values.stroke){
                lastStroke = this.values.stroke;
                ctx.strokeStyle = this.values.stroke;
            }
            commands = this.textSpans[i].elem;
            jLen = commands.length;
            this.globalData.canvasContext.beginPath();
            for(j=0;j<jLen;j+=1) {
                pathArr = commands[j];
                kLen = pathArr.length;
                this.globalData.canvasContext.moveTo(pathArr[0], pathArr[1]);
                for (k = 2; k < kLen; k += 6) {
                    this.globalData.canvasContext.bezierCurveTo(pathArr[k], pathArr[k + 1], pathArr[k + 2], pathArr[k + 3], pathArr[k + 4], pathArr[k + 5]);
                }
            }
            this.globalData.canvasContext.closePath();
            this.globalData.canvasContext.stroke();
            ///ctx.strokeText(letters[i].val,0,0);
        }
        if(renderedLetter) {
            this.globalData.renderer.restore();
        }
    }
};
function CVEffects() {

}
CVEffects.prototype.renderFrame = function(){};
function SkiaContextData() {
	this.saved = [];
    this.cArrPos = 0;
    this.cTr = new Matrix();
    this.cO = 1;
    var i, len = 15;
    this.savedOp = createTypedArray('float32', len);
    for(i=0;i<len;i+=1){
        this.saved[i] = createTypedArray('float32', 16);
    }
    this._length = len;
}

SkiaContextData.prototype.duplicate = function() {
	var newLength = this._length * 2;
	var currentSavedOp = this.savedOp;
    this.savedOp = createTypedArray('float32', newLength);
    this.savedOp.set(currentSavedOp);
    var i = 0;
    for(i = this._length; i < newLength; i += 1) {
        this.saved[i] = createTypedArray('float32', 16);
    }
    this._length = newLength;
};

SkiaContextData.prototype.reset = function() {
	this.cArrPos = 0;
	this.cTr.reset();
    this.cO = 1;
};
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
        this.maskManager = new SkiaMaskElement(this.data, this,this.skcanvas);
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

function SkiaImageElement(data, globalData, comp){
    this.assetData = globalData.getImageData(data.refId);
    this.img = globalData.imageLoader.getImage(this.assetData);
    this.initElement(data,globalData,comp);
}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaImageElement);

SkiaImageElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaImageElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;

SkiaImageElement.prototype.createContent = function(){

    // 输入输出图片尺寸换算
    if (this.img.width && (this.assetData.w !== this.img.width || this.assetData.h !== this.img.height)) {

        const w = this.assetData.w;
        const h = this.assetData.h;
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
        this.srcRect = SKIA.CanvasKit().XYWHRect((imgW-widthCrop)/2,(imgH-heightCrop)/2,widthCrop,heightCrop);
        this.dstRect = SKIA.CanvasKit().XYWHRect(0,0,this.assetData.w,this.assetData.h);
    }

};

SkiaImageElement.prototype.renderInnerContent = function(parentMatrix){
    // 图片二进制数据 => skimage => skia绘制
    let skImg = SKIA.CanvasKit().MakeImageFromEncoded(this.img);

    if (this.srcRect && this.dstRect) {
        this.skcanvas.drawImageRect(skImg,srcRect,dstRect,null,false);
    }else{
        this.skcanvas.drawImage(skImg,0,0,null);
    }
};

SkiaImageElement.prototype.destroy = function(){
    this.img = null;
};
function SkiaCompElement(data, globalData, comp) {
    this.completeLayers = false;
    this.layers = data.layers;
    this.pendingElements = [];
    this.elements = createSizedArray(this.layers.length);
    this.initElement(data, globalData, comp);
    this.tm = data.tm ? PropertyFactory.getProp(this,data.tm,0,globalData.frameRate, this) : {_placeholder:true};

    var CK = SKIA.CanvasKit();
    this.path =new CK.SkPath();
}

extendPrototype([SkiaCanvasRenderer, ICompElement, SkiaBaseElement], SkiaCompElement);

SkiaCompElement.prototype.renderInnerContent = function() {
    this.path.reset();
    this.path.moveTo(0,0);
    this.path.lineTo(this.data.w,0);
    this.path.lineTo(this.data.w, this.data.h);
    this.path.lineTo(0, this.data.h);
    this.path.lineTo(0,0);
    this.skcanvas.clipPath(this.path,SKIA.CanvasKit().ClipOp.Intersect,true);
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
    this.path.delete();

};

function SkiaMaskElement(data,element,skcanvas){
    this.data = data;
    this.element = element;
    this.skcanvas = skcanvas;
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

    var CK = SKIA.CanvasKit();
    this.path = new CK.SkPath();
}

SkiaMaskElement.prototype.renderFrame = function () {
    if(!this.hasMasks){
        return;
    }
    this.path.reset();
    var transform = this.element.finalTransform.mat;
    var i, len = this.masksProperties.length;
    var pt,pts,data;
    for (i = 0; i < len; i++) {
        if(this.masksProperties[i].mode !== 'n'){
            if (this.masksProperties[i].inv) {
                this.path.moveTo(0, 0);
                this.path.lineTo(this.element.globalData.compSize.w, 0);
                this.path.lineTo(this.element.globalData.compSize.w, this.element.globalData.compSize.h);
                this.path.lineTo(0, this.element.globalData.compSize.h);
                this.path.lineTo(0, 0);
            }
            data = this.viewData[i].v;
            pt = transform.applyToPointArray(data.v[0][0],data.v[0][1],0);
            this.path.moveTo(pt[0], pt[1]);
            var j, jLen = data._length;
            for (j = 1; j < jLen; j++) {
                pts = transform.applyToTriplePoints(data.o[j - 1], data.i[j], data.v[j]);
                this.path.cubicTo(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
            }
            pts = transform.applyToTriplePoints(data.o[j - 1], data.i[0], data.v[0]);
            this.path.cubicTo(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
        }
    }
    this.element.globalData.renderer.save(true);
    this.skcanvas.clipPath(this.path,SKIA.CanvasKit().ClipOp.Intersect,true);
};

SkiaMaskElement.prototype.getMaskProperty = MaskElement.prototype.getMaskProperty;

SkiaMaskElement.prototype.destroy = function(){
    this.path.delete();
    this.element = null;
};
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

    // 绘制路径
    var CK = SKIA.CanvasKit();
    this.curPath =new CK.SkPath();
    // 填充工具
    this.fill = new SkiaFill();
    // 画笔工具
    this.stroke = new SkiaStroke();
    // 内存回收
    this._toCleanUp = [];

    this._toCleanUp.push(this.fill);
    this._toCleanUp.push(this.stroke);
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

SkiaShapeElement.prototype.drawLayer = function () {
    var i, len = this.stylesList.length;
    var j, jLen, k, kLen, elems, nodes, renderer = this.globalData.renderer, type, currentStyle;
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
            this.stroke.setStrokeStyle(type === 'st' ? currentStyle.co : currentStyle.grd);
            this.stroke.setStrokeWidth(currentStyle.wi);
            this.stroke.setStrokeCap(currentStyle.lc);
            this.stroke.setStrokeJoin(currentStyle.lj);
            this.stroke.setStrokeMiter(currentStyle.ml || 0);
        } else {
            this.fill.setFillStyle(type === 'fl' ? currentStyle.co : currentStyle.grd);
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
                this.stroke.draw(this.skcanvas,this.curPath);
                if (currentStyle.da) {
                    this.stroke.setLineDash(dashResetter, 0);
                }
            }
        }
        if (type !== 'st' && type !== 'gs') {
            this.fill.draw(this.skcanvas, this.curPath, currentStyle.r);
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
        var grd;
        var pt1 = itemData.s.v, pt2 = itemData.e.v;
        if (styleData.t === 1) {
            grd = new LinearCanvasGradient(pt1[0], pt1[1], pt2[0], pt2[1]);
            this._toCleanUp.push(grd);
        } else {
            var rad = Math.sqrt(Math.pow(pt1[0] - pt2[0], 2) + Math.pow(pt1[1] - pt2[1], 2));
            var ang = Math.atan2(pt2[1] - pt1[1], pt2[0] - pt1[0]);

            var percent = itemData.h.v >= 1 ? 0.99 : itemData.h.v <= -1 ? -0.99 : itemData.h.v;
            var dist = rad * percent;
            var x = Math.cos(ang + itemData.a.v) * dist + pt1[0];
            var y = Math.sin(ang + itemData.a.v) * dist + pt1[1];
            var grd = new RadialCanvasGradient(x, y, 0, pt1[0], pt1[1], rad);
            this._toCleanUp.push(grd);
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
    this.stylesList.length = 0;
    this.itemsData.length = 0;
    this._toCleanUp.forEach(function (c) {
        c._dispose();
    });
    this.curPath.delete();
};


function SkiaSolidElement(data, globalData, comp) {
    this.initElement(data, globalData, comp);

    var CK = SKIA.CanvasKit();
    this.paint = new CK.SkPaint();

}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement], SkiaSolidElement);

SkiaSolidElement.prototype.initElement = SVGShapeElement.prototype.initElement;
SkiaSolidElement.prototype.prepareFrame = IImageElement.prototype.prepareFrame;


SkiaSolidElement.prototype.renderInnerContent = function () {

    //skia solid render
    this.paint.setColor(ColorUtil.parseColor(this.data.sc));
    this.paint.setStyle(SKIA.CanvasKit().PaintStyle.Fill);
    this.paint.setAntiAlias(true);
    this.skcanvas.drawRect(SKIA.CanvasKit().XYWHRect(0, 0, this.data.sw, this.data.sh), this.paint);
};

SkiaSolidElement.prototype.destroy = function () {
    this.paint.delete();
};
function SkiaTextElement(data, globalData, comp) {
    this.textSpans = [];
    this.yOffset = 0;
    this.fillColorAnim = false;
    this.strokeColorAnim = false;
    this.strokeWidthAnim = false;
    this.stroke = false;
    this.fill = false;
    this.justifyOffset = 0;
    this.currentRender = null;
    this.renderType = 'canvas';
    this.values = {
        fill: 'rgba(0,0,0,0)',
        stroke: 'rgba(0,0,0,0)',
        sWidth: 0,
        fValue: ''
    };

    this.initElement(data, globalData, comp);

    //  获取字体
    var documentData = this.textProperty.currentData;
    var fontData = globalData.getFontData(documentData.f);
    var font = globalData.fontLoader.getFont(fontData);

    var CK = SKIA.CanvasKit();
    this.textFont = new CK.SkFont(font);
    this.textFont.setSize(documentData.s);

    this.textPaint = new CK.SkPaint();
    this.textPaint.setColor(ColorUtil.parseArray(documentData.fc));
}
extendPrototype([BaseElement, TransformElement, SkiaBaseElement, HierarchyElement, FrameElement, RenderableElement, ITextElement], SkiaTextElement);

SkiaTextElement.prototype.buildNewText = function () {

    return;
};

SkiaTextElement.prototype.renderInnerContent = function () {

    var documentData = this.textProperty.currentData;

    var text = documentData.t;
    var textLines = text.split(/[\r\n]/);
    const lineHight = documentData.lh;
    for (let i = 0; i < textLines.length; i++) {
        this.skcanvas.drawText(textLines[i], 0, i*lineHight, this.textPaint, this.textFont);
    }

    return;
};

SkiaTextElement.prototype.destroy = function () {
    this.textPaint.delete();
    this.textFont.delete();
};
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
function SkiaEffects() {

}
SkiaEffects.prototype.renderFrame = function(){};
function HBaseElement(data,globalData,comp){}
HBaseElement.prototype = {
    checkBlendMode: function(){},
    initRendererElement: function(){
        this.baseElement = createTag(this.data.tg || 'div');
        if(this.data.hasMask) {
            this.svgElement = createNS('svg');
            this.layerElement = createNS('g');
            this.maskedElement = this.layerElement;
            this.svgElement.appendChild(this.layerElement);
            this.baseElement.appendChild(this.svgElement);
        } else {
            this.layerElement = this.baseElement;
        }
        styleDiv(this.baseElement);
    },
    createContainerElements: function(){
        this.renderableEffectsManager = new CVEffects(this);
        this.transformedElement = this.baseElement;
        this.maskedElement = this.layerElement;
        if (this.data.ln) {
            this.layerElement.setAttribute('id',this.data.ln);
        }
        if (this.data.cl) {
            this.layerElement.setAttribute('class', this.data.cl);
        }
        if (this.data.bm !== 0) {
            this.setBlendMode();
        }
    },
    renderElement: function() {
        if(this.finalTransform._matMdf){
            this.transformedElement.style.transform = this.transformedElement.style.webkitTransform = this.finalTransform.mat.toCSS();
        }
        if(this.finalTransform._opMdf){
            this.transformedElement.style.opacity = this.finalTransform.mProp.o.v;
        }
    },
    renderFrame: function() {
        //If it is exported as hidden (data.hd === true) no need to render
        //If it is not visible no need to render
        if (this.data.hd || this.hidden) {
            return;
        }
        this.renderTransform();
        this.renderRenderable();
        this.renderElement();
        this.renderInnerContent();
        if (this._isFirstFrame) {
            this._isFirstFrame = false;
        }
    },
    destroy: function(){
        this.layerElement = null;
        this.transformedElement = null;
        if(this.matteElement) {
            this.matteElement = null;
        }
        if(this.maskManager) {
            this.maskManager.destroy();
            this.maskManager = null;
        }
    },
    createRenderableComponents: function(){
        this.maskManager = new MaskElement(this.data, this, this.globalData);
    },
    addEffects: function(){
    },
    setMatte: function(){}
};
HBaseElement.prototype.getBaseElement = SVGBaseElement.prototype.getBaseElement;
HBaseElement.prototype.destroyBaseElement = HBaseElement.prototype.destroy;
HBaseElement.prototype.buildElementParenting = HybridRenderer.prototype.buildElementParenting;
function HSolidElement(data,globalData,comp){
    this.initElement(data,globalData,comp);
}
extendPrototype([BaseElement,TransformElement,HBaseElement,HierarchyElement,FrameElement,RenderableDOMElement], HSolidElement);

HSolidElement.prototype.createContent = function(){
    var rect;
    if(this.data.hasMask){
        rect = createNS('rect');
        rect.setAttribute('width',this.data.sw);
        rect.setAttribute('height',this.data.sh);
        rect.setAttribute('fill',this.data.sc);
        this.svgElement.setAttribute('width',this.data.sw);
        this.svgElement.setAttribute('height',this.data.sh);
    } else {
        rect = createTag('div');
        rect.style.width = this.data.sw + 'px';
        rect.style.height = this.data.sh + 'px';
        rect.style.backgroundColor = this.data.sc;
    }
    this.layerElement.appendChild(rect);
};

function HCompElement(data,globalData,comp){
    this.layers = data.layers;
    this.supports3d = !data.hasMask;
    this.completeLayers = false;
    this.pendingElements = [];
    this.elements = this.layers ? createSizedArray(this.layers.length) : [];
    this.initElement(data,globalData,comp);
    this.tm = data.tm ? PropertyFactory.getProp(this,data.tm,0,globalData.frameRate,this) : {_placeholder:true};
}

extendPrototype([HybridRenderer, ICompElement, HBaseElement], HCompElement);
HCompElement.prototype._createBaseContainerElements = HCompElement.prototype.createContainerElements;

HCompElement.prototype.createContainerElements = function(){
    this._createBaseContainerElements();
    //divElement.style.clip = 'rect(0px, '+this.data.w+'px, '+this.data.h+'px, 0px)';
    if(this.data.hasMask){
        this.svgElement.setAttribute('width',this.data.w);
        this.svgElement.setAttribute('height',this.data.h);
        this.transformedElement = this.baseElement;
    } else {
        this.transformedElement = this.layerElement;
    }
};

HCompElement.prototype.addTo3dContainer = function(elem,pos) {
    var j = 0;
    var nextElement;
    while(j<pos){
        if(this.elements[j] && this.elements[j].getBaseElement){
            nextElement = this.elements[j].getBaseElement();
        }
        j += 1;
    }
    if(nextElement){
        this.layerElement.insertBefore(elem, nextElement);
    } else {
        this.layerElement.appendChild(elem);
    }
}

function HShapeElement(data,globalData,comp){
    //List of drawable elements
    this.shapes = [];
    // Full shape data
    this.shapesData = data.shapes;
    //List of styles that will be applied to shapes
    this.stylesList = [];
    //List of modifiers that will be applied to shapes
    this.shapeModifiers = [];
    //List of items in shape tree
    this.itemsData = [];
    //List of items in previous shape tree
    this.processedElements = [];
    // List of animated components
    this.animatedContents = [];
    this.shapesContainer = createNS('g');
    this.initElement(data,globalData,comp);
    //Moving any property that doesn't get too much access after initialization because of v8 way of handling more than 10 properties.
    // List of elements that have been created
    this.prevViewData = [];
    this.currentBBox = {
        x:999999,
        y: -999999,
        h: 0,
        w: 0
    };
}
extendPrototype([BaseElement,TransformElement,HSolidElement,SVGShapeElement,HBaseElement,HierarchyElement,FrameElement,RenderableElement], HShapeElement);
HShapeElement.prototype._renderShapeFrame = HShapeElement.prototype.renderInnerContent;

HShapeElement.prototype.createContent = function(){
    var cont;
    this.baseElement.style.fontSize = 0;
    if (this.data.hasMask) {
        this.layerElement.appendChild(this.shapesContainer);
        cont = this.svgElement;
    } else {
        cont = createNS('svg');
        var size = this.comp.data ? this.comp.data : this.globalData.compSize;
        cont.setAttribute('width',size.w);
        cont.setAttribute('height',size.h);
        cont.appendChild(this.shapesContainer);
        this.layerElement.appendChild(cont);
    }

    this.searchShapes(this.shapesData,this.itemsData,this.prevViewData,this.shapesContainer,0, [], true);
    this.filterUniqueShapes();
    this.shapeCont = cont;
};

HShapeElement.prototype.getTransformedPoint = function(transformers, point) {
    var i, len = transformers.length;
    for(i = 0; i < len; i += 1) {
        point = transformers[i].mProps.v.applyToPointArray(point[0], point[1], 0);
    }
    return point;
}

HShapeElement.prototype.calculateShapeBoundingBox = function(item, boundingBox) {
    var shape = item.sh.v;
    var transformers = item.transformers;
    var i, len = shape._length, vPoint, oPoint, nextIPoint, nextVPoint, bounds;
    if (len <= 1) {
        return;
    }
    for (i = 0; i < len - 1; i += 1) {
        vPoint = this.getTransformedPoint(transformers, shape.v[i]);
        oPoint = this.getTransformedPoint(transformers, shape.o[i]);
        nextIPoint = this.getTransformedPoint(transformers, shape.i[i + 1]);
        nextVPoint = this.getTransformedPoint(transformers, shape.v[i + 1]);
        this.checkBounds(vPoint, oPoint, nextIPoint, nextVPoint, boundingBox);
    }
    if(shape.c) {
        vPoint = this.getTransformedPoint(transformers, shape.v[i]);
        oPoint = this.getTransformedPoint(transformers, shape.o[i]);
        nextIPoint = this.getTransformedPoint(transformers, shape.i[0]);
        nextVPoint = this.getTransformedPoint(transformers, shape.v[0]);
        this.checkBounds(vPoint, oPoint, nextIPoint, nextVPoint, boundingBox);
    }
}

HShapeElement.prototype.checkBounds = function(vPoint, oPoint, nextIPoint, nextVPoint, boundingBox) {
    this.getBoundsOfCurve(vPoint, oPoint, nextIPoint, nextVPoint);
    var bounds = this.shapeBoundingBox;
    boundingBox.x = bm_min(bounds.left, boundingBox.x);
    boundingBox.xMax = bm_max(bounds.right, boundingBox.xMax);
    boundingBox.y = bm_min(bounds.top, boundingBox.y);
    boundingBox.yMax = bm_max(bounds.bottom, boundingBox.yMax);
}

HShapeElement.prototype.shapeBoundingBox = {
    left:0,
    right:0,
    top:0,
    bottom:0,
}

HShapeElement.prototype.tempBoundingBox = {
    x:0,
    xMax:0,
    y:0,
    yMax:0,
    width:0,
    height:0
}

HShapeElement.prototype.getBoundsOfCurve = function(p0, p1, p2, p3) {

    var bounds = [[p0[0],p3[0]], [p0[1],p3[1]]];

    for (var a, b, c, t, b2ac, t1, t2, i = 0; i < 2; ++i) {

      b = 6 * p0[i] - 12 * p1[i] + 6 * p2[i];
      a = -3 * p0[i] + 9 * p1[i] - 9 * p2[i] + 3 * p3[i];
      c = 3 * p1[i] - 3 * p0[i];

      b = b | 0;
      a = a | 0;
      c = c | 0;

      if (a === 0) {

        if (b === 0) {
          continue;
        }

        t = -c / b;

        if (0 < t && t < 1) {
          bounds[i].push(this.calculateF(t,p0,p1,p2,p3,i));
        }
        continue;
      }

      b2ac = b * b - 4 * c * a;

      if (b2ac < 0) {
        continue;
      }

      t1 = (-b + bm_sqrt(b2ac))/(2 * a);
      if (0 < t1 && t1 < 1) bounds[i].push(this.calculateF(t1,p0,p1,p2,p3,i));

      t2 = (-b - bm_sqrt(b2ac))/(2 * a);
      if (0 < t2 && t2 < 1) bounds[i].push(this.calculateF(t2,p0,p1,p2,p3,i));

    }

    this.shapeBoundingBox.left = bm_min.apply(null, bounds[0]);
    this.shapeBoundingBox.top = bm_min.apply(null, bounds[1]);
    this.shapeBoundingBox.right = bm_max.apply(null, bounds[0]);
    this.shapeBoundingBox.bottom = bm_max.apply(null, bounds[1]);
  };

  HShapeElement.prototype.calculateF = function(t, p0, p1, p2, p3, i) {
    return bm_pow(1-t, 3) * p0[i]
        + 3 * bm_pow(1-t, 2) * t * p1[i]
        + 3 * (1-t) * bm_pow(t, 2) * p2[i]
        + bm_pow(t, 3) * p3[i];
  }

HShapeElement.prototype.calculateBoundingBox = function(itemsData, boundingBox) {
    var i, len = itemsData.length, path;
    for(i = 0; i < len; i += 1) {
        if(itemsData[i] && itemsData[i].sh) {
            this.calculateShapeBoundingBox(itemsData[i], boundingBox)
        } else if(itemsData[i] && itemsData[i].it) {
            this.calculateBoundingBox(itemsData[i].it, boundingBox)
        }
    }
}

HShapeElement.prototype.currentBoxContains = function(box) {
    return this.currentBBox.x <= box.x 
    && this.currentBBox.y <= box.y 
    && this.currentBBox.width + this.currentBBox.x >= box.x + box.width
    && this.currentBBox.height + this.currentBBox.y >= box.y + box.height
}

HShapeElement.prototype.renderInnerContent = function() {
    this._renderShapeFrame();

    if(!this.hidden && (this._isFirstFrame || this._mdf)) {
        var tempBoundingBox = this.tempBoundingBox;
        var max = 999999;
        tempBoundingBox.x = max;
        tempBoundingBox.xMax = -max;
        tempBoundingBox.y = max;
        tempBoundingBox.yMax = -max;
        this.calculateBoundingBox(this.itemsData, tempBoundingBox);
        tempBoundingBox.width = tempBoundingBox.xMax < tempBoundingBox.x ? 0 : tempBoundingBox.xMax - tempBoundingBox.x;
        tempBoundingBox.height = tempBoundingBox.yMax < tempBoundingBox.y ? 0 : tempBoundingBox.yMax - tempBoundingBox.y;
        //var tempBoundingBox = this.shapeCont.getBBox();
        if(this.currentBoxContains(tempBoundingBox)) {
            return;
        }
        var changed = false;
        if(this.currentBBox.w !== tempBoundingBox.width){
            this.currentBBox.w = tempBoundingBox.width;
            this.shapeCont.setAttribute('width',tempBoundingBox.width);
            changed = true;
        }
        if(this.currentBBox.h !== tempBoundingBox.height){
            this.currentBBox.h = tempBoundingBox.height;
            this.shapeCont.setAttribute('height',tempBoundingBox.height);
            changed = true;
        }
        if(changed  || this.currentBBox.x !== tempBoundingBox.x  || this.currentBBox.y !== tempBoundingBox.y){
            this.currentBBox.w = tempBoundingBox.width;
            this.currentBBox.h = tempBoundingBox.height;
            this.currentBBox.x = tempBoundingBox.x;
            this.currentBBox.y = tempBoundingBox.y;

            this.shapeCont.setAttribute('viewBox',this.currentBBox.x+' '+this.currentBBox.y+' '+this.currentBBox.w+' '+this.currentBBox.h);
            this.shapeCont.style.transform = this.shapeCont.style.webkitTransform = 'translate(' + this.currentBBox.x + 'px,' + this.currentBBox.y + 'px)';
        }
    }

};
function HTextElement(data,globalData,comp){
    this.textSpans = [];
    this.textPaths = [];
    this.currentBBox = {
        x:999999,
        y: -999999,
        h: 0,
        w: 0
    };
    this.renderType = 'svg';
    this.isMasked = false;
    this.initElement(data,globalData,comp);

}
extendPrototype([BaseElement,TransformElement,HBaseElement,HierarchyElement,FrameElement,RenderableDOMElement,ITextElement], HTextElement);

HTextElement.prototype.createContent = function(){
    this.isMasked = this.checkMasks();
    if(this.isMasked){
        this.renderType = 'svg';
        this.compW = this.comp.data.w;
        this.compH = this.comp.data.h;
        this.svgElement.setAttribute('width',this.compW);
        this.svgElement.setAttribute('height',this.compH);
        var g = createNS('g');
        this.maskedElement.appendChild(g);
        this.innerElem = g;
    } else {
        this.renderType = 'html';
        this.innerElem = this.layerElement;
    }

    this.checkParenting();

};

HTextElement.prototype.buildNewText = function(){
    var documentData = this.textProperty.currentData;
    this.renderedLetters = createSizedArray(documentData.l ? documentData.l.length : 0);
    var innerElemStyle = this.innerElem.style;
    innerElemStyle.color = innerElemStyle.fill = documentData.fc ? this.buildColor(documentData.fc) : 'rgba(0,0,0,0)';
    if(documentData.sc){
        innerElemStyle.stroke = this.buildColor(documentData.sc);
        innerElemStyle.strokeWidth = documentData.sw+'px';
    }
    var fontData = this.globalData.fontManager.getFontByName(documentData.f);
    if(!this.globalData.fontManager.chars){
        innerElemStyle.fontSize = documentData.finalSize+'px';
        innerElemStyle.lineHeight = documentData.finalSize+'px';
        if(fontData.fClass){
            this.innerElem.className = fontData.fClass;
        } else {
            innerElemStyle.fontFamily = fontData.fFamily;
            var fWeight = documentData.fWeight, fStyle = documentData.fStyle;
            innerElemStyle.fontStyle = fStyle;
            innerElemStyle.fontWeight = fWeight;
        }
    }
    var i, len;

    var letters = documentData.l;
    len = letters.length;
    var tSpan,tParent,tCont;
    var matrixHelper = this.mHelper;
    var shapes, shapeStr = '';
    var cnt = 0;
    for (i = 0;i < len ;i += 1) {
        if(this.globalData.fontManager.chars){
            if(!this.textPaths[cnt]){
                tSpan = createNS('path');
                tSpan.setAttribute('stroke-linecap', 'butt');
                tSpan.setAttribute('stroke-linejoin','round');
                tSpan.setAttribute('stroke-miterlimit','4');
            } else {
                tSpan = this.textPaths[cnt];
            }
            if(!this.isMasked){
                if(this.textSpans[cnt]){
                    tParent = this.textSpans[cnt];
                    tCont = tParent.children[0];
                } else {

                    tParent = createTag('div');
                    tParent.style.lineHeight = 0;
                    tCont = createNS('svg');
                    tCont.appendChild(tSpan);
                    styleDiv(tParent);
                }
            }
        }else{
            if(!this.isMasked){
                if(this.textSpans[cnt]){
                    tParent = this.textSpans[cnt];
                    tSpan = this.textPaths[cnt];
                } else {
                    tParent = createTag('span');
                    styleDiv(tParent);
                    tSpan = createTag('span');
                    styleDiv(tSpan);
                    tParent.appendChild(tSpan);
                }
            } else {
                tSpan = this.textPaths[cnt] ? this.textPaths[cnt] : createNS('text');
            }
        }
        //tSpan.setAttribute('visibility', 'hidden');
        if(this.globalData.fontManager.chars){
            var charData = this.globalData.fontManager.getCharData(documentData.finalText[i], fontData.fStyle, this.globalData.fontManager.getFontByName(documentData.f).fFamily);
            var shapeData;
            if(charData){
                shapeData = charData.data;
            } else {
                shapeData = null;
            }
            matrixHelper.reset();
            if(shapeData && shapeData.shapes){
                shapes = shapeData.shapes[0].it;
                matrixHelper.scale(documentData.finalSize/100,documentData.finalSize/100);
                shapeStr = this.createPathShape(matrixHelper,shapes);
                tSpan.setAttribute('d',shapeStr);
            }
            if(!this.isMasked){
                this.innerElem.appendChild(tParent);
                if(shapeData && shapeData.shapes){

                    //document.body.appendChild is needed to get exact measure of shape
                    document.body.appendChild(tCont);
                    var boundingBox = tCont.getBBox();
                    tCont.setAttribute('width',boundingBox.width + 2);
                    tCont.setAttribute('height',boundingBox.height + 2);
                    tCont.setAttribute('viewBox',(boundingBox.x-1)+' '+ (boundingBox.y-1)+' '+ (boundingBox.width+2)+' '+ (boundingBox.height+2));
                    tCont.style.transform = tCont.style.webkitTransform = 'translate(' + (boundingBox.x-1) + 'px,' + (boundingBox.y-1) + 'px)';

                    letters[i].yOffset = boundingBox.y-1;

                } else{
                    tCont.setAttribute('width',1);
                    tCont.setAttribute('height',1);
                }
                    tParent.appendChild(tCont);
            }else{
                this.innerElem.appendChild(tSpan);
            }
        }else{
            tSpan.textContent = letters[i].val;
            tSpan.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space","preserve");
            if(!this.isMasked){
                this.innerElem.appendChild(tParent);
                //
                tSpan.style.transform = tSpan.style.webkitTransform = 'translate3d(0,'+ -documentData.finalSize/1.2+'px,0)';
            } else {
                this.innerElem.appendChild(tSpan);
            }
        }
        //
        if(!this.isMasked){
            this.textSpans[cnt] = tParent;
        }else{
            this.textSpans[cnt] = tSpan;
        }
        this.textSpans[cnt].style.display = 'block';
        this.textPaths[cnt] = tSpan;
        cnt += 1;
    }
    while(cnt < this.textSpans.length){
        this.textSpans[cnt].style.display = 'none';
        cnt += 1;
    }
};

HTextElement.prototype.renderInnerContent = function() {

    if(this.data.singleShape){
        if(!this._isFirstFrame && !this.lettersChangedFlag){
            return;
        } else {
            // Todo Benchmark if using this is better than getBBox
             if(this.isMasked && this.finalTransform._matMdf){
                 this.svgElement.setAttribute('viewBox',-this.finalTransform.mProp.p.v[0]+' '+ -this.finalTransform.mProp.p.v[1]+' '+this.compW+' '+this.compH);
                this.svgElement.style.transform = this.svgElement.style.webkitTransform = 'translate(' + -this.finalTransform.mProp.p.v[0] + 'px,' + -this.finalTransform.mProp.p.v[1] + 'px)';
             }
        }
    }

    this.textAnimator.getMeasures(this.textProperty.currentData, this.lettersChangedFlag);
    if(!this.lettersChangedFlag && !this.textAnimator.lettersChangedFlag){
        return;
    }
    var  i,len, count = 0;
    var renderedLetters = this.textAnimator.renderedLetters;

    var letters = this.textProperty.currentData.l;

    len = letters.length;
    var renderedLetter, textSpan, textPath;
    for(i=0;i<len;i+=1){
        if(letters[i].n){
            count += 1;
            continue;
        }
        textSpan = this.textSpans[i];
        textPath = this.textPaths[i];
        renderedLetter = renderedLetters[count];
        count += 1;
        if(renderedLetter._mdf.m) {
            if(!this.isMasked){
                textSpan.style.transform = textSpan.style.webkitTransform = renderedLetter.m;
            }else{
                textSpan.setAttribute('transform',renderedLetter.m);
            }
        }
        ////textSpan.setAttribute('opacity',renderedLetter.o);
        textSpan.style.opacity = renderedLetter.o;
        if(renderedLetter.sw && renderedLetter._mdf.sw){
            textPath.setAttribute('stroke-width',renderedLetter.sw);
        }
        if(renderedLetter.sc && renderedLetter._mdf.sc){
            textPath.setAttribute('stroke',renderedLetter.sc);
        }
        if(renderedLetter.fc && renderedLetter._mdf.fc){
            textPath.setAttribute('fill',renderedLetter.fc);
            textPath.style.color = renderedLetter.fc;
        }
    }

    if(this.innerElem.getBBox && !this.hidden && (this._isFirstFrame || this._mdf)){
        var boundingBox = this.innerElem.getBBox();

        if(this.currentBBox.w !== boundingBox.width){
            this.currentBBox.w = boundingBox.width;
            this.svgElement.setAttribute('width',boundingBox.width);
        }
        if(this.currentBBox.h !== boundingBox.height){
            this.currentBBox.h = boundingBox.height;
            this.svgElement.setAttribute('height',boundingBox.height);
        }

        var margin = 1;
        if(this.currentBBox.w !== (boundingBox.width + margin*2) || this.currentBBox.h !== (boundingBox.height + margin*2)  || this.currentBBox.x !== (boundingBox.x - margin)  || this.currentBBox.y !== (boundingBox.y - margin)){
            this.currentBBox.w = boundingBox.width + margin*2;
            this.currentBBox.h = boundingBox.height + margin*2;
            this.currentBBox.x = boundingBox.x - margin;
            this.currentBBox.y = boundingBox.y - margin;

            this.svgElement.setAttribute('viewBox',this.currentBBox.x+' '+this.currentBBox.y+' '+this.currentBBox.w+' '+this.currentBBox.h);
            this.svgElement.style.transform = this.svgElement.style.webkitTransform = 'translate(' + this.currentBBox.x + 'px,' + this.currentBBox.y + 'px)';
        }
    }
};
function HImageElement(data,globalData,comp){
    this.assetData = globalData.getImageData(data.refId);
    this.initElement(data,globalData,comp);
}

extendPrototype([BaseElement,TransformElement,HBaseElement,HSolidElement,HierarchyElement,FrameElement,RenderableElement], HImageElement);


HImageElement.prototype.createContent = function(){
    var assetPath = this.globalData.getAssetsPath(this.assetData);
    var img = new Image();

    if(this.data.hasMask){
        this.imageElem = createNS('image');
        this.imageElem.setAttribute('width',this.assetData.w+"px");
        this.imageElem.setAttribute('height',this.assetData.h+"px");
        this.imageElem.setAttributeNS('http://www.w3.org/1999/xlink','href',assetPath);
        this.layerElement.appendChild(this.imageElem);
        this.baseElement.setAttribute('width',this.assetData.w);
        this.baseElement.setAttribute('height',this.assetData.h);
    } else {
        this.layerElement.appendChild(img);
    }
    img.src = assetPath;
    if(this.data.ln){
        this.baseElement.setAttribute('id',this.data.ln);
    }
};
function HCameraElement(data,globalData,comp){
    this.initFrame();
    this.initBaseData(data,globalData,comp);
    this.initHierarchy();
    var getProp = PropertyFactory.getProp;
    this.pe = getProp(this,data.pe,0,0,this);
    if(data.ks.p.s){
        this.px = getProp(this,data.ks.p.x,1,0,this);
        this.py = getProp(this,data.ks.p.y,1,0,this);
        this.pz = getProp(this,data.ks.p.z,1,0,this);
    }else{
        this.p = getProp(this,data.ks.p,1,0,this);
    }
    if(data.ks.a){
        this.a = getProp(this,data.ks.a,1,0,this);
    }
    if(data.ks.or.k.length && data.ks.or.k[0].to){
        var i,len = data.ks.or.k.length;
        for(i=0;i<len;i+=1){
            data.ks.or.k[i].to = null;
            data.ks.or.k[i].ti = null;
        }
    }
    this.or = getProp(this,data.ks.or,1,degToRads,this);
    this.or.sh = true;
    this.rx = getProp(this,data.ks.rx,0,degToRads,this);
    this.ry = getProp(this,data.ks.ry,0,degToRads,this);
    this.rz = getProp(this,data.ks.rz,0,degToRads,this);
    this.mat = new Matrix();
    this._prevMat = new Matrix();
    this._isFirstFrame = true;
    
    // TODO: find a better way to make the HCamera element to be compatible with the LayerInterface and TransformInterface.
    this.finalTransform = {
        mProp: this
    };
}
extendPrototype([BaseElement, FrameElement, HierarchyElement], HCameraElement);

HCameraElement.prototype.setup = function() {
    var i, len = this.comp.threeDElements.length, comp;
    for(i=0;i<len;i+=1){
        //[perspectiveElem,container]
        comp = this.comp.threeDElements[i];
        if(comp.type === '3d') {
            comp.perspectiveElem.style.perspective = comp.perspectiveElem.style.webkitPerspective = this.pe.v+'px';
            comp.container.style.transformOrigin = comp.container.style.mozTransformOrigin = comp.container.style.webkitTransformOrigin = "0px 0px 0px";
            comp.perspectiveElem.style.transform = comp.perspectiveElem.style.webkitTransform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)';
        }
    }
};

HCameraElement.prototype.createElements = function(){
};

HCameraElement.prototype.hide = function(){
};

HCameraElement.prototype.renderFrame = function(){
    var _mdf = this._isFirstFrame;
    var i, len;
    if(this.hierarchy){
        len = this.hierarchy.length;
        for(i=0;i<len;i+=1){
            _mdf = this.hierarchy[i].finalTransform.mProp._mdf || _mdf;
        }
    }
    if(_mdf || this.pe._mdf || (this.p && this.p._mdf) || (this.px && (this.px._mdf || this.py._mdf || this.pz._mdf)) || this.rx._mdf || this.ry._mdf || this.rz._mdf || this.or._mdf || (this.a && this.a._mdf)) {
        this.mat.reset();

        if(this.hierarchy){
            var mat;
            len = this.hierarchy.length - 1;
            for (i = len; i >= 0; i -= 1) {
                var mTransf = this.hierarchy[i].finalTransform.mProp;
                this.mat.translate(-mTransf.p.v[0],-mTransf.p.v[1],mTransf.p.v[2]);
                this.mat.rotateX(-mTransf.or.v[0]).rotateY(-mTransf.or.v[1]).rotateZ(mTransf.or.v[2]);
                this.mat.rotateX(-mTransf.rx.v).rotateY(-mTransf.ry.v).rotateZ(mTransf.rz.v);
                this.mat.scale(1/mTransf.s.v[0],1/mTransf.s.v[1],1/mTransf.s.v[2]);
                this.mat.translate(mTransf.a.v[0],mTransf.a.v[1],mTransf.a.v[2]);
            }
        }
        if (this.p) {
            this.mat.translate(-this.p.v[0],-this.p.v[1],this.p.v[2]);
        } else {
            this.mat.translate(-this.px.v,-this.py.v,this.pz.v);
        }
        if (this.a) {
            var diffVector
            if (this.p) {
                diffVector = [this.p.v[0] - this.a.v[0], this.p.v[1] - this.a.v[1], this.p.v[2] - this.a.v[2]];
            } else {
                diffVector = [this.px.v - this.a.v[0], this.py.v - this.a.v[1], this.pz.v - this.a.v[2]];
            }
            var mag = Math.sqrt(Math.pow(diffVector[0],2)+Math.pow(diffVector[1],2)+Math.pow(diffVector[2],2));
            //var lookDir = getNormalizedPoint(getDiffVector(this.a.v,this.p.v));
            var lookDir = [diffVector[0]/mag,diffVector[1]/mag,diffVector[2]/mag];
            var lookLengthOnXZ = Math.sqrt( lookDir[2]*lookDir[2] + lookDir[0]*lookDir[0] );
            var m_rotationX = (Math.atan2( lookDir[1], lookLengthOnXZ ));
            var m_rotationY = (Math.atan2( lookDir[0], -lookDir[2]));
            this.mat.rotateY(m_rotationY).rotateX(-m_rotationX);

        }
        this.mat.rotateX(-this.rx.v).rotateY(-this.ry.v).rotateZ(this.rz.v);
        this.mat.rotateX(-this.or.v[0]).rotateY(-this.or.v[1]).rotateZ(this.or.v[2]);
        this.mat.translate(this.globalData.compSize.w/2,this.globalData.compSize.h/2,0);
        this.mat.translate(0,0,this.pe.v);


        

        var hasMatrixChanged = !this._prevMat.equals(this.mat);
        if((hasMatrixChanged || this.pe._mdf) && this.comp.threeDElements) {
            len = this.comp.threeDElements.length;
            var comp;
            for(i=0;i<len;i+=1){
                comp = this.comp.threeDElements[i];
                if(comp.type === '3d') {
                    if(hasMatrixChanged) {
                        comp.container.style.transform = comp.container.style.webkitTransform = this.mat.toCSS();
                    }
                    if(this.pe._mdf) {
                        comp.perspectiveElem.style.perspective = comp.perspectiveElem.style.webkitPerspective = this.pe.v+'px';
                    }
                }
            }
            this.mat.clone(this._prevMat);
        }
    }
    this._isFirstFrame = false;
};

HCameraElement.prototype.prepareFrame = function(num) {
    this.prepareProperties(num, true);
};

HCameraElement.prototype.destroy = function(){
};
HCameraElement.prototype.getBaseElement = function(){return null;};
function HEffects() {
}
HEffects.prototype.renderFrame = function(){};
var animationManager = (function () {
    var moduleOb = {};
    var registeredAnimations = [];
    var initTime = 0;
    var len = 0;
    var playingAnimationsNum = 0;
    var _stopped = true;
    var _isFrozen = false;

    function removeElement(ev) {
        var i = 0;
        var animItem = ev.target;
        while (i < len) {
            if (registeredAnimations[i].animation === animItem) {
                registeredAnimations.splice(i, 1);
                i -= 1;
                len -= 1;
                if (!animItem.isPaused) {
                    subtractPlayingCount();
                }
            }
            i += 1;
        }
    }

    function registerAnimation(element, animationData) {
        if (!element) {
            return null;
        }
        var i = 0;
        while (i < len) {
            if (registeredAnimations[i].elem == element && registeredAnimations[i].elem !== null) {
                return registeredAnimations[i].animation;
            }
            i += 1;
        }
        var animItem = new AnimationItem();
        setupAnimation(animItem, element);
        animItem.setData(element, animationData);
        return animItem;
    }

    function getRegisteredAnimations() {
        var i, len = registeredAnimations.length;
        var animations = [];
        for (i = 0; i < len; i += 1) {
            animations.push(registeredAnimations[i].animation);
        }
        return animations;
    }

    function addPlayingCount() {
        playingAnimationsNum += 1;
        activate();
    }

    function subtractPlayingCount() {
        playingAnimationsNum -= 1;
    }

    function setupAnimation(animItem, element) {
        animItem.addEventListener('destroy', removeElement);
        animItem.addEventListener('_active', addPlayingCount);
        animItem.addEventListener('_idle', subtractPlayingCount);
        registeredAnimations.push({ elem: element, animation: animItem });
        len += 1;
    }

    function loadAnimation(params) {
        var animItem = new AnimationItem();
        setupAnimation(animItem, null);
        animItem.setParams(params);
        return animItem;
    }

   


    function setSpeed(val, animation) {
        var i;
        for (i = 0; i < len; i += 1) {
            registeredAnimations[i].animation.setSpeed(val, animation);
        }
    }

    function setDirection(val, animation) {
        var i;
        for (i = 0; i < len; i += 1) {
            registeredAnimations[i].animation.setDirection(val, animation);
        }
    }

    function play(animation) {
        var i;
        for (i = 0; i < len; i += 1) {
            registeredAnimations[i].animation.play(animation);
        }
    }
    function resume(nowTime) {
        var elapsedTime = nowTime - initTime;
        var i;
        for (i = 0; i < len; i += 1) {
            registeredAnimations[i].animation.advanceTime(elapsedTime);
        }
        initTime = nowTime;
        if (playingAnimationsNum && !_isFrozen) {
            window.requestAnimationFrame(resume);
        } else {
            _stopped = true;
        }
    }

    function first(nowTime) {
        initTime = nowTime;
        window.requestAnimationFrame(resume);
    }

    function pause(animation) {
        var i;
        for (i = 0; i < len; i += 1) {
            registeredAnimations[i].animation.pause(animation);
        }
    }

    function goToAndStop(value, isFrame, animation) {
        var i;
        for (i = 0; i < len; i += 1) {
            registeredAnimations[i].animation.goToAndStop(value, isFrame, animation);
        }
    }

    function stop(animation) {
        var i;
        for (i = 0; i < len; i += 1) {
            registeredAnimations[i].animation.stop(animation);
        }
    }

    function togglePause(animation) {
        var i;
        for (i = 0; i < len; i += 1) {
            registeredAnimations[i].animation.togglePause(animation);
        }
    }

    function destroy(animation) {
        var i;
        for (i = (len - 1); i >= 0; i -= 1) {
            registeredAnimations[i].animation.destroy(animation);
        }
    }

    function searchAnimations(animationData, standalone, renderer) {
        var animElements = [].concat([].slice.call(document.getElementsByClassName('lottie')),
            [].slice.call(document.getElementsByClassName('bodymovin')));
        var i, len = animElements.length;
        for (i = 0; i < len; i += 1) {
            if (renderer) {
                animElements[i].setAttribute('data-bm-type', renderer);
            }
            registerAnimation(animElements[i], animationData);
        }
        if (standalone && len === 0) {
            if (!renderer) {
                renderer = 'svg';
            }
            var body = document.getElementsByTagName('body')[0];
            body.innerHTML = '';
            var div = createTag('div');
            div.style.width = '100%';
            div.style.height = '100%';
            div.setAttribute('data-bm-type', renderer);
            body.appendChild(div);
            registerAnimation(div, animationData);
        }
    }

    function resize() {
        var i;
        for (i = 0; i < len; i += 1) {
            registeredAnimations[i].animation.resize();
        }
    }

    function activate() {
        if (!_isFrozen && playingAnimationsNum) {
            if (_stopped) {
                window.requestAnimationFrame(first);
                _stopped = false;
            }
        }
    }

    function freeze() {
        _isFrozen = true;
    }

    function unfreeze() {
        _isFrozen = false;
        activate();
    }

    moduleOb.registerAnimation = registerAnimation;
    moduleOb.loadAnimation = loadAnimation;
    moduleOb.setSpeed = setSpeed;
    moduleOb.setDirection = setDirection;
    moduleOb.play = play;
    moduleOb.pause = pause;
    moduleOb.stop = stop;
    moduleOb.togglePause = togglePause;
    moduleOb.searchAnimations = searchAnimations;
    moduleOb.resize = resize;
    //moduleOb.start = start;
    moduleOb.goToAndStop = goToAndStop;
    moduleOb.destroy = destroy;
    moduleOb.freeze = freeze;
    moduleOb.unfreeze = unfreeze;
    moduleOb.getRegisteredAnimations = getRegisteredAnimations;
    return moduleOb;
}());

var AnimationItem = function () {
    this._cbs = [];
    this.name = '';
    this.path = '';
    this.isLoaded = false;
    this.currentFrame = 0;
    this.currentRawFrame = 0;
    this.firstFrame = 0;
    this.totalFrames = 0;
    this.frameRate = 0;
    this.frameMult = 0;
    this.playSpeed = 1;
    this.playDirection = 1;
    this.playCount = 0;
    this.animationData = {};
    this.fonts = [];
    this.isPaused = true;
    this.autoplay = false;
    this.loop = true;
    this.renderer = null;
    this.animationID = createElementID();
    this.assetsPath = '';
    this.timeCompleted = 0;
    this.segmentPos = 0;
    this.subframeEnabled = subframeEnabled;
    this.segments = [];
    this._idle = true;
    this._completedLoop = false;
    this.projectInterface = ProjectInterface();
    this.imagePreloader = new ImagePreloader();
    this.videoPreloader = new VideoPreloader();
    this.audioPreloader = new AudioPreloader();
    this.fontPreloader = new FontPreloader();
    this.assetsHolder = new AssetsHolder();
};

extendPrototype([BaseEvent], AnimationItem);

AnimationItem.prototype.setParams = function (params) {
    if (params.context) {
        this.context = params.context;
    }
    if (params.wrapper || params.container) {
        this.wrapper = params.wrapper || params.container;
    }
    var animType = params.animType ? params.animType : params.renderer ? params.renderer : 'svg';
    switch (animType) {
        case 'canvas':
            this.renderer = new CanvasRenderer(this, params.rendererSettings);
            break;
        case 'skia':
            this.renderer = new SkiaCanvasRenderer(this, params.rendererSettings);
            break;
        case 'svg':
            this.renderer = new SVGRenderer(this, params.rendererSettings);
            break;
        default:
            this.renderer = new HybridRenderer(this, params.rendererSettings);
            break;
    }
    this.renderer.setProjectInterface(this.projectInterface);
    this.animType = animType;

    if (params.loop === '' || params.loop === null) {
    } else if (params.loop === false) {
        this.loop = false;
    } else if (params.loop === true) {
        this.loop = true;
    } else {
        this.loop = parseInt(params.loop);
    }
    this.autoplay = 'autoplay' in params ? params.autoplay : true;
    this.name = params.name ? params.name : '';
    this.autoloadSegments = params.hasOwnProperty('autoloadSegments') ? params.autoloadSegments : true;
    this.assetsPath = params.assetsPath;
    if (params.animationData) {
        this.configAnimation(params.animationData);
    } else if (params.path) {

        if (params.path.lastIndexOf('\\') !== -1) {
            this.path = params.path.substr(0, params.path.lastIndexOf('\\') + 1);
        } else {
            this.path = params.path.substr(0, params.path.lastIndexOf('/') + 1);
        }
        this.fileName = params.path.substr(params.path.lastIndexOf('/') + 1);
        this.fileName = this.fileName.substr(0, this.fileName.lastIndexOf('.json'));

        assetLoader.load(params.path, this.configAnimation.bind(this), function () {
            this.trigger('data_failed');
        }.bind(this));
    }

    this.initialSegment = params.initialSegment;
};

AnimationItem.prototype.setData = function (wrapper, animationData) {
    var params = {
        wrapper: wrapper,
        animationData: animationData ? (typeof animationData === "object") ? animationData : JSON.parse(animationData) : null
    };
    var wrapperAttributes = wrapper.attributes;

    params.path = wrapperAttributes.getNamedItem('data-animation-path') ? wrapperAttributes.getNamedItem('data-animation-path').value : wrapperAttributes.getNamedItem('data-bm-path') ? wrapperAttributes.getNamedItem('data-bm-path').value : wrapperAttributes.getNamedItem('bm-path') ? wrapperAttributes.getNamedItem('bm-path').value : '';
    params.animType = wrapperAttributes.getNamedItem('data-anim-type') ? wrapperAttributes.getNamedItem('data-anim-type').value : wrapperAttributes.getNamedItem('data-bm-type') ? wrapperAttributes.getNamedItem('data-bm-type').value : wrapperAttributes.getNamedItem('bm-type') ? wrapperAttributes.getNamedItem('bm-type').value : wrapperAttributes.getNamedItem('data-bm-renderer') ? wrapperAttributes.getNamedItem('data-bm-renderer').value : wrapperAttributes.getNamedItem('bm-renderer') ? wrapperAttributes.getNamedItem('bm-renderer').value : 'canvas';

    var loop = wrapperAttributes.getNamedItem('data-anim-loop') ? wrapperAttributes.getNamedItem('data-anim-loop').value : wrapperAttributes.getNamedItem('data-bm-loop') ? wrapperAttributes.getNamedItem('data-bm-loop').value : wrapperAttributes.getNamedItem('bm-loop') ? wrapperAttributes.getNamedItem('bm-loop').value : '';
    if (loop === '') {
    } else if (loop === 'false') {
        params.loop = false;
    } else if (loop === 'true') {
        params.loop = true;
    } else {
        params.loop = parseInt(loop);
    }
    var autoplay = wrapperAttributes.getNamedItem('data-anim-autoplay') ? wrapperAttributes.getNamedItem('data-anim-autoplay').value : wrapperAttributes.getNamedItem('data-bm-autoplay') ? wrapperAttributes.getNamedItem('data-bm-autoplay').value : wrapperAttributes.getNamedItem('bm-autoplay') ? wrapperAttributes.getNamedItem('bm-autoplay').value : true;
    params.autoplay = autoplay !== "false";

    params.name = wrapperAttributes.getNamedItem('data-name') ? wrapperAttributes.getNamedItem('data-name').value : wrapperAttributes.getNamedItem('data-bm-name') ? wrapperAttributes.getNamedItem('data-bm-name').value : wrapperAttributes.getNamedItem('bm-name') ? wrapperAttributes.getNamedItem('bm-name').value : '';
    var prerender = wrapperAttributes.getNamedItem('data-anim-prerender') ? wrapperAttributes.getNamedItem('data-anim-prerender').value : wrapperAttributes.getNamedItem('data-bm-prerender') ? wrapperAttributes.getNamedItem('data-bm-prerender').value : wrapperAttributes.getNamedItem('bm-prerender') ? wrapperAttributes.getNamedItem('bm-prerender').value : '';

    if (prerender === 'false') {
        params.prerender = false;
    }
    this.setParams(params);
};

AnimationItem.prototype.includeLayers = function (data) {
    if (data.op > this.animationData.op) {
        this.animationData.op = data.op;
        this.totalFrames = Math.floor(data.op - this.animationData.ip);
    }
    var layers = this.animationData.layers;
    var i, len = layers.length;
    var newLayers = data.layers;
    var j, jLen = newLayers.length;
    for (j = 0; j < jLen; j += 1) {
        i = 0;
        while (i < len) {
            if (layers[i].id == newLayers[j].id) {
                layers[i] = newLayers[j];
                break;
            }
            i += 1;
        }
    }
    if (data.chars || data.fonts) {
        this.renderer.globalData.fontManager.addChars(data.chars);
        this.renderer.globalData.fontManager.addFonts(data.fonts, this.renderer.globalData.defs);
    }
    if (data.assets) {
        len = data.assets.length;
        for (i = 0; i < len; i += 1) {
            this.animationData.assets.push(data.assets[i]);
        }
    }
    this.animationData.__complete = false;
    dataManager.completeData(this.animationData, this.renderer.globalData.fontManager);
    this.renderer.includeLayers(data.layers);
    if (expressionsPlugin) {
        expressionsPlugin.initExpressions(this);
    }
    this.loadNextSegment();
};

AnimationItem.prototype.loadNextSegment = function () {
    var segments = this.animationData.segments;
    if (!segments || segments.length === 0 || !this.autoloadSegments) {
        this.trigger('data_ready');
        this.timeCompleted = this.totalFrames;
        return;
    }
    var segment = segments.shift();
    this.timeCompleted = segment.time * this.frameRate;
    var segmentPath = this.path + this.fileName + '_' + this.segmentPos + '.json';
    this.segmentPos += 1;
    assetLoader.load(segmentPath, this.includeLayers.bind(this), function () {
        this.trigger('data_failed');
    }.bind(this));
};

AnimationItem.prototype.loadSegments = function () {
    var segments = this.animationData.segments;
    if (!segments) {
        this.timeCompleted = this.totalFrames;
    }
    this.loadNextSegment();
};

/**
 * 图片加载完成的回调
 */
AnimationItem.prototype.imagesLoaded = function () {
    this.trigger('loaded_images');
    this.checkLoaded()
}


/**
 * 预加载图片
 */
AnimationItem.prototype.preloadImages = function () {
    this.imagePreloader.setAssetsPath(this.assetsPath);
    this.imagePreloader.setPath(this.path);
    if (this.renderer.rendererType == 'skia') {
        this.imagePreloader.loadAssetsBinary(this.assetsHolder.imageAssets(), this.imagesLoaded.bind(this));
    } else {
        this.imagePreloader.loadAssets(this.assetsHolder.imageAssets(), this.imagesLoaded.bind(this));
    }
}


/**
 * 视频加载完成的回调
 */
AnimationItem.prototype.videosLoaded = function () {
    this.trigger('loaded_videos');
    this.checkLoaded()
}

/**
 * 预加载视频
 */
AnimationItem.prototype.preloadVideos = function () {
    if (this.renderer.rendererType == 'skia') {
        this.videoPreloader.loadAssetsBinary(this.assetsHolder.videoAssets(), this.videosLoaded.bind(this));
    }
}

/**
 * 音频加载完成的回调
 */
AnimationItem.prototype.audiosLoaded = function () {
    this.trigger('loaded_audios');
    this.checkLoaded()
}

/**
 * 预加载音频
 */
AnimationItem.prototype.preloadAudios = function () {
    if (this.renderer.rendererType == 'skia') {
        this.audioPreloader.loadAssetsBinary(this.assetsHolder.audioAssets(), this.audiosLoaded.bind(this));
    }
}


/**
 * 字体加载完成的回调
 */
AnimationItem.prototype.fontsLoaded = function () {
    this.trigger('loaded_fonts');
    this.checkLoaded()
}

/**
 *  预加加载字体
 */
AnimationItem.prototype.preloadFonts = function () {
    if (this.renderer.rendererType == 'skia') {
        this.fontPreloader.loadAssetsBinary(this.animationData.fonts, this.fontsLoaded.bind(this));
    }
}

/**
 * 解析json文件，初始化资源，图层
 */
AnimationItem.prototype.configAnimation = function (animData) {
    if (!this.renderer) {
        return;
    }
    try {
        this.animationData = animData;

        if (this.initialSegment) {
            this.totalFrames = Math.floor(this.initialSegment[1] - this.initialSegment[0]);
            this.firstFrame = Math.round(this.initialSegment[0]);
        } else {
            this.totalFrames = Math.floor(this.animationData.op - this.animationData.ip);
            this.firstFrame = Math.round(this.animationData.ip);
        }
        this.renderer.configAnimation(animData);
        if (!animData.assets) {
            animData.assets = [];
        }

        if (!animData.fonts) {
            animData.fonts = {};
        }

        this.assetsHolder.parse(this.animationData.assets);
        this.fonts = this.animationData.fonts.list;
        this.frameRate = this.animationData.fr;
        this.frameMult = this.animationData.fr / 1000;
        this.renderer.searchExtraCompositions(animData.assets);
        this.trigger('config_ready');
        this.preloadImages();
        this.preloadVideos();
        this.preloadFonts();
        this.loadSegments();
        this.updaFrameModifier();
        this.waitForFontsLoaded();
    } catch (error) {
        this.triggerConfigError(error);
    }
};

AnimationItem.prototype.waitForFontsLoaded = function () {
    if (!this.renderer) {
        return;
    }

    if (this.renderer.rendererType == 'skia' || this.renderer.globalData.fontManager.loaded()) {
        this.checkLoaded();
    } else {
        setTimeout(this.waitForFontsLoaded.bind(this), 20);
    }
}

AnimationItem.prototype.checkLoaded = function () {
    var b_canvas = this.renderer.rendererType == 'canvas';
    var b_skia = this.renderer.rendererType == 'skia';
    if (!this.isLoaded &&
        (b_skia || this.renderer.globalData.fontManager.loaded()) &&
        (this.fontPreloader.loaded() || !b_skia) &&
        (this.videoPreloader.loaded() || !b_skia) &&
        (this.audioPreloader.loaded() || !b_skia) &&
        (this.imagePreloader.loaded() || (!b_canvas && !b_skia))) {
        this.isLoaded = true;
        dataManager.completeData(this.animationData, this.renderer.globalData.fontManager);
        if (expressionsPlugin) {
            expressionsPlugin.initExpressions(this);
        }
        this.renderer.initItems();
        setTimeout(function () {
            this.trigger('DOMLoaded');
        }.bind(this), 0);
        this.gotoFrame();
        if (this.autoplay) {
            this.play();
        }
    }
};

AnimationItem.prototype.resize = function () {
    this.renderer.updateContainerSize();
};

AnimationItem.prototype.setSubframe = function (flag) {
    this.subframeEnabled = flag ? true : false;
};

AnimationItem.prototype.gotoFrame = function () {
    this.currentFrame = this.subframeEnabled ? this.currentRawFrame : ~~this.currentRawFrame;

    if (this.timeCompleted !== this.totalFrames && this.currentFrame > this.timeCompleted) {
        this.currentFrame = this.timeCompleted;
    }
    this.trigger('enterFrame');
    this.renderFrame();
};

AnimationItem.prototype.renderFrame = function () {
    if (this.isLoaded === false) {
        return;
    }
    try {
        this.renderer.renderFrame(this.currentFrame + this.firstFrame);
    } catch (error) {
        this.triggerRenderFrameError(error);
    }
};

AnimationItem.prototype.play = function (name) {
    if (name && this.name != name) {
        return;
    }
    if (this.isPaused === true) {
        this.isPaused = false;
        if (this._idle) {
            this._idle = false;
            this.trigger('_active');
        }
    }
};

AnimationItem.prototype.pause = function (name) {
    if (name && this.name != name) {
        return;
    }
    if (this.isPaused === false) {
        this.isPaused = true;
        this._idle = true;
        this.trigger('_idle');
    }
};

AnimationItem.prototype.togglePause = function (name) {
    if (name && this.name != name) {
        return;
    }
    if (this.isPaused === true) {
        this.play();
    } else {
        this.pause();
    }
};

AnimationItem.prototype.stop = function (name) {
    if (name && this.name != name) {
        return;
    }
    this.pause();
    this.playCount = 0;
    this._completedLoop = false;
    this.setCurrentRawFrameValue(0);
};

AnimationItem.prototype.goToAndStop = function (value, isFrame, name) {
    if (name && this.name != name) {
        return;
    }
    if (isFrame) {
        this.setCurrentRawFrameValue(value);
    } else {
        this.setCurrentRawFrameValue(value * this.frameModifier);
    }
    this.pause();
};

AnimationItem.prototype.goToAndPlay = function (value, isFrame, name) {
    this.goToAndStop(value, isFrame, name);
    this.play();
};

AnimationItem.prototype.advanceTime = function (value) {
    if (this.isPaused === true || this.isLoaded === false) {
        return;
    }
    var nextValue = this.currentRawFrame + value * this.frameModifier;
    var _isComplete = false;
    // Checking if nextValue > totalFrames - 1 for addressing non looping and looping animations.
    // If animation won't loop, it should stop at totalFrames - 1. If it will loop it should complete the last frame and then loop.
    if (nextValue >= this.totalFrames - 1 && this.frameModifier > 0) {
        if (!this.loop || this.playCount === this.loop) {
            if (!this.checkSegments(nextValue > this.totalFrames ? nextValue % this.totalFrames : 0)) {
                _isComplete = true;
                nextValue = this.totalFrames - 1;
            }
        } else if (nextValue >= this.totalFrames) {
            this.playCount += 1;
            if (!this.checkSegments(nextValue % this.totalFrames)) {
                this.setCurrentRawFrameValue(nextValue % this.totalFrames);
                this._completedLoop = true;
                this.trigger('loopComplete');
            }
        } else {
            this.setCurrentRawFrameValue(nextValue);
        }
    } else if (nextValue < 0) {
        if (!this.checkSegments(nextValue % this.totalFrames)) {
            if (this.loop && !(this.playCount-- <= 0 && this.loop !== true)) {
                this.setCurrentRawFrameValue(this.totalFrames + (nextValue % this.totalFrames));
                if (!this._completedLoop) {
                    this._completedLoop = true;
                } else {
                    this.trigger('loopComplete');
                }
            } else {
                _isComplete = true;
                nextValue = 0;
            }
        }
    } else {
        this.setCurrentRawFrameValue(nextValue);
    }
    if (_isComplete) {
        this.setCurrentRawFrameValue(nextValue);
        this.pause();
        this.trigger('complete');
    }
};

AnimationItem.prototype.adjustSegment = function (arr, offset) {
    this.playCount = 0;
    if (arr[1] < arr[0]) {
        if (this.frameModifier > 0) {
            if (this.playSpeed < 0) {
                this.setSpeed(-this.playSpeed);
            } else {
                this.setDirection(-1);
            }
        }
        this.timeCompleted = this.totalFrames = arr[0] - arr[1];
        this.firstFrame = arr[1];
        this.setCurrentRawFrameValue(this.totalFrames - 0.001 - offset);
    } else if (arr[1] > arr[0]) {
        if (this.frameModifier < 0) {
            if (this.playSpeed < 0) {
                this.setSpeed(-this.playSpeed);
            } else {
                this.setDirection(1);
            }
        }
        this.timeCompleted = this.totalFrames = arr[1] - arr[0];
        this.firstFrame = arr[0];
        this.setCurrentRawFrameValue(0.001 + offset);
    }
    this.trigger('segmentStart');
};
AnimationItem.prototype.setSegment = function (init, end) {
    var pendingFrame = -1;
    if (this.isPaused) {
        if (this.currentRawFrame + this.firstFrame < init) {
            pendingFrame = init;
        } else if (this.currentRawFrame + this.firstFrame > end) {
            pendingFrame = end - init;
        }
    }

    this.firstFrame = init;
    this.timeCompleted = this.totalFrames = end - init;
    if (pendingFrame !== -1) {
        this.goToAndStop(pendingFrame, true);
    }
};

AnimationItem.prototype.playSegments = function (arr, forceFlag) {
    if (forceFlag) {
        this.segments.length = 0;
    }
    if (typeof arr[0] === 'object') {
        var i, len = arr.length;
        for (i = 0; i < len; i += 1) {
            this.segments.push(arr[i]);
        }
    } else {
        this.segments.push(arr);
    }
    if (this.segments.length && forceFlag) {
        this.adjustSegment(this.segments.shift(), 0);
    }
    if (this.isPaused) {
        this.play();
    }
};

AnimationItem.prototype.resetSegments = function (forceFlag) {
    this.segments.length = 0;
    this.segments.push([this.animationData.ip, this.animationData.op]);
    //this.segments.push([this.animationData.ip*this.frameRate,Math.floor(this.animationData.op - this.animationData.ip+this.animationData.ip*this.frameRate)]);
    if (forceFlag) {
        this.checkSegments(0);
    }
};
AnimationItem.prototype.checkSegments = function (offset) {
    if (this.segments.length) {
        this.adjustSegment(this.segments.shift(), offset);
        return true;
    }
    return false;
};

AnimationItem.prototype.destroy = function (name) {
    if ((name && this.name != name) || !this.renderer) {
        return;
    }
    this.renderer.destroy();
    this.assetsHolder.destroy();
    this.imagePreloader.destroy();
    this.videoPreloader.destroy();
    this.audioPreloader.destroy();
    this.fontPreloader.destroy();
    this.trigger('destroy');
    this._cbs = null;
    this.onEnterFrame = this.onLoopComplete = this.onComplete = this.onSegmentStart = this.onDestroy = null;
    this.renderer = null;
};

AnimationItem.prototype.setCurrentRawFrameValue = function (value) {
    this.currentRawFrame = value;
    this.gotoFrame();
};

AnimationItem.prototype.setSpeed = function (val) {
    this.playSpeed = val;
    this.updaFrameModifier();
};

AnimationItem.prototype.setDirection = function (val) {
    this.playDirection = val < 0 ? -1 : 1;
    this.updaFrameModifier();
};

AnimationItem.prototype.updaFrameModifier = function () {
    this.frameModifier = this.frameMult * this.playSpeed * this.playDirection;
};

AnimationItem.prototype.getPath = function () {
    return this.path;
};

AnimationItem.prototype.getAssetsPath = function (assetData) {
    var path = '';
    if (assetData.e) {
        path = assetData.p;
    } else if (this.assetsPath) {
        var imagePath = assetData.p;
        if (imagePath.indexOf('images/') !== -1) {
            imagePath = imagePath.split('/')[1];
        }
        path = this.assetsPath + imagePath;
    } else {
        path = this.path;
        path += assetData.u ? assetData.u : '';
        path += assetData.p;
    }
    return path;
};

/**
 * 根据id，获取图片资源
 */
AnimationItem.prototype.getImageData = function (id) {
    let is = this.assetsHolder.imageAssets();
    var i = 0, len = is.length;
    while (i < len) {
        if (id == is[i].id) {
            return is[i];
        }
        i += 1;
    }
};


/**
 * 根据id，获取视频资源
 */
AnimationItem.prototype.getVideoData = function (id) {
    let vs = this.assetsHolder.videoAssets();
    var i = 0, len = vs.length;
    while (i < len) {
        if (id == vs[i].id) {
            return vs[i];
        }
        i += 1;
    }
};

/**
 * 根据fName，获取字体
 */
AnimationItem.prototype.getFontData = function (fName) {
    var i = 0, len = this.fonts.length;
    while (i < len) {
        if (fName == this.fonts[i].fName) {
            return this.fonts[i];
        }
        i += 1;
    }
};

AnimationItem.prototype.hide = function () {
    this.renderer.hide();
};

AnimationItem.prototype.show = function () {
    this.renderer.show();
};

AnimationItem.prototype.getDuration = function (isFrame) {
    return isFrame ? this.totalFrames : this.totalFrames / this.frameRate;
};

AnimationItem.prototype.trigger = function (name) {
    if (this._cbs && this._cbs[name]) {
        switch (name) {
            case 'enterFrame':
                this.triggerEvent(name, new BMEnterFrameEvent(name, this.currentFrame, this.totalFrames, this.frameModifier));
                break;
            case 'loopComplete':
                this.triggerEvent(name, new BMCompleteLoopEvent(name, this.loop, this.playCount, this.frameMult));
                break;
            case 'complete':
                this.triggerEvent(name, new BMCompleteEvent(name, this.frameMult));
                break;
            case 'segmentStart':
                this.triggerEvent(name, new BMSegmentStartEvent(name, this.firstFrame, this.totalFrames));
                break;
            case 'destroy':
                this.triggerEvent(name, new BMDestroyEvent(name, this));
                break;
            default:
                this.triggerEvent(name);
        }
    }
    if (name === 'enterFrame' && this.onEnterFrame) {
        this.onEnterFrame.call(this, new BMEnterFrameEvent(name, this.currentFrame, this.totalFrames, this.frameMult));
    }
    if (name === 'loopComplete' && this.onLoopComplete) {
        this.onLoopComplete.call(this, new BMCompleteLoopEvent(name, this.loop, this.playCount, this.frameMult));
    }
    if (name === 'complete' && this.onComplete) {
        this.onComplete.call(this, new BMCompleteEvent(name, this.frameMult));
    }
    if (name === 'segmentStart' && this.onSegmentStart) {
        this.onSegmentStart.call(this, new BMSegmentStartEvent(name, this.firstFrame, this.totalFrames));
    }
    if (name === 'destroy' && this.onDestroy) {
        this.onDestroy.call(this, new BMDestroyEvent(name, this));
    }
};

AnimationItem.prototype.onError = function (error) {
    console.log(error.nativeError);
}

AnimationItem.prototype.triggerRenderFrameError = function (nativeError) {

    var error = new BMRenderFrameErrorEvent(nativeError, this.currentFrame);
    this.triggerEvent('error', error);

    if (this.onError) {
        this.onError.call(this, error);
    }
}

AnimationItem.prototype.triggerConfigError = function (nativeError) {

    var error = new BMConfigErrorEvent(nativeError, this.currentFrame);
    this.triggerEvent('error', error);

    if (this.onError) {
        this.onError.call(this, error);
    }
}
var Expressions = (function(){
    var ob = {};
    ob.initExpressions = initExpressions;


    function initExpressions(animation){

    	var stackCount = 0;
    	var registers = [];

    	function pushExpression() {
			stackCount += 1;
    	}

    	function popExpression() {
			stackCount -= 1;
			if (stackCount === 0) {
				releaseInstances();
			}
    	}

    	function registerExpressionProperty(expression) {
    		if (registers.indexOf(expression) === -1) {
				registers.push(expression)
    		}
    	}

    	function releaseInstances() {
    		var i, len = registers.length;
    		for (i = 0; i < len; i += 1) {
				registers[i].release();
    		}
    		registers.length = 0;
    	}

        animation.renderer.compInterface = CompExpressionInterface(animation.renderer);
        animation.renderer.globalData.projectInterface.registerComposition(animation.renderer);
        animation.renderer.globalData.pushExpression = pushExpression;
        animation.renderer.globalData.popExpression = popExpression;
        animation.renderer.globalData.registerExpressionProperty = registerExpressionProperty;
    }
   return ob;
}());

expressionsPlugin = Expressions;

var ExpressionManager = (function(){
    'use strict';
    var ob = {};
    var Math = BMMath;
    var window = null;
    var document = null;

    function $bm_isInstanceOfArray(arr) {
        return arr.constructor === Array || arr.constructor === Float32Array;
    }

    function isNumerable(tOfV, v) {
        return tOfV === 'number' || tOfV === 'boolean' || tOfV === 'string' || v instanceof Number;
    }

    function $bm_neg(a){
        var tOfA = typeof a;
        if(tOfA === 'number' || tOfA === 'boolean'  || a instanceof Number ){
            return -a;
        }
        if($bm_isInstanceOfArray(a)){
            var i, lenA = a.length;
            var retArr = [];
            for(i=0;i<lenA;i+=1){
                retArr[i] = -a[i];
            }
            return retArr;
        }
        if (a.propType) {
            return a.v;
        }
    }

    var easeInBez = BezierFactory.getBezierEasing(0.333,0,.833,.833, 'easeIn').get;
    var easeOutBez = BezierFactory.getBezierEasing(0.167,0.167,.667,1, 'easeOut').get;
    var easeInOutBez = BezierFactory.getBezierEasing(.33,0,.667,1, 'easeInOut').get;

    function sum(a,b) {
        var tOfA = typeof a;
        var tOfB = typeof b;
        if(tOfA === 'string' || tOfB === 'string'){
            return a + b;
        }
        if(isNumerable(tOfA, a) && isNumerable(tOfB, b)) {
            return a + b;
        }
        if($bm_isInstanceOfArray(a) && isNumerable(tOfB, b)){
            a = a.slice(0);
            a[0] = a[0] + b;
            return a;
        }
        if(isNumerable(tOfA, a) && $bm_isInstanceOfArray(b)){
            b = b.slice(0);
            b[0] = a + b[0];
            return b;
        }
        if($bm_isInstanceOfArray(a) && $bm_isInstanceOfArray(b)){
            
            var i = 0, lenA = a.length, lenB = b.length;
            var retArr = [];
            while(i<lenA || i < lenB){
                if((typeof a[i] === 'number' || a[i] instanceof Number) && (typeof b[i] === 'number' || b[i] instanceof Number)){
                    retArr[i] = a[i] + b[i];
                }else{
                    retArr[i] = b[i] === undefined ? a[i] : a[i] || b[i];
                }
                i += 1;
            }
            return retArr;
        }
        return 0;
    }
    var add = sum;

    function sub(a,b) {
        var tOfA = typeof a;
        var tOfB = typeof b;
        if(isNumerable(tOfA, a) && isNumerable(tOfB, b)) {
            if(tOfA === 'string') {
                a = parseInt(a);
            }
            if(tOfB === 'string') {
                b = parseInt(b);
            }
            return a - b;
        }
        if( $bm_isInstanceOfArray(a) && isNumerable(tOfB, b)){
            a = a.slice(0);
            a[0] = a[0] - b;
            return a;
        }
        if(isNumerable(tOfA, a) &&  $bm_isInstanceOfArray(b)){
            b = b.slice(0);
            b[0] = a - b[0];
            return b;
        }
        if($bm_isInstanceOfArray(a) && $bm_isInstanceOfArray(b)){
            var i = 0, lenA = a.length, lenB = b.length;
            var retArr = [];
            while(i<lenA || i < lenB){
                if((typeof a[i] === 'number' || a[i] instanceof Number) && (typeof b[i] === 'number' || b[i] instanceof Number)){
                    retArr[i] = a[i] - b[i];
                }else{
                    retArr[i] = b[i] === undefined ? a[i] : a[i] || b[i];
                }
                i += 1;
            }
            return retArr;
        }
        return 0;
    }

    function mul(a,b) {
        var tOfA = typeof a;
        var tOfB = typeof b;
        var arr;
        if(isNumerable(tOfA, a) && isNumerable(tOfB, b)) {
            return a * b;
        }

        var i, len;
        if($bm_isInstanceOfArray(a) && isNumerable(tOfB, b)){
            len = a.length;
            arr = createTypedArray('float32', len);
            for(i=0;i<len;i+=1){
                arr[i] = a[i] * b;
            }
            return arr;
        }
        if(isNumerable(tOfA, a) && $bm_isInstanceOfArray(b)){
            len = b.length;
            arr = createTypedArray('float32', len);
            for(i=0;i<len;i+=1){
                arr[i] = a * b[i];
            }
            return arr;
        }
        return 0;
    }

    function div(a,b) {
        var tOfA = typeof a;
        var tOfB = typeof b;
        var arr;
        if(isNumerable(tOfA, a) && isNumerable(tOfB, b)) {
            return a / b;
        }
        var i, len;
        if($bm_isInstanceOfArray(a) && isNumerable(tOfB, b)){
            len = a.length;
            arr = createTypedArray('float32', len);
            for(i=0;i<len;i+=1){
                arr[i] = a[i] / b;
            }
            return arr;
        }
        if(isNumerable(tOfA, a) && $bm_isInstanceOfArray(b)){
            len = b.length;
            arr = createTypedArray('float32', len);
            for(i=0;i<len;i+=1){
                arr[i] = a / b[i];
            }
            return arr;
        }
        return 0;
    }
    function mod(a,b) {
        if(typeof a === 'string') {
            a = parseInt(a);
        }
        if(typeof b === 'string') {
            b = parseInt(b);
        }
        return a % b;
    }
    var $bm_sum = sum;
    var $bm_sub = sub;
    var $bm_mul = mul;
    var $bm_div = div;
    var $bm_mod = mod;

    function clamp(num, min, max) {
        if(min > max){
            var mm = max;
            max = min;
            min = mm;
        }
        return Math.min(Math.max(num, min), max);
    }

    function radiansToDegrees(val) {
        return val/degToRads;
    }
    var radians_to_degrees = radiansToDegrees;

    function degreesToRadians(val) {
        return val*degToRads;
    }
    var degrees_to_radians = radiansToDegrees;

    var helperLengthArray = [0,0,0,0,0,0];

    function length(arr1, arr2) {
        if (typeof arr1 === 'number' || arr1 instanceof Number) {
            arr2 = arr2 || 0;
            return Math.abs(arr1 - arr2);
        }
        if(!arr2) {
            arr2 = helperLengthArray;
        }
        var i, len = Math.min(arr1.length, arr2.length);
        var addedLength = 0;
        for (i = 0; i < len; i += 1) {
            addedLength += Math.pow(arr2[i] - arr1[i], 2);
        }
        return Math.sqrt(addedLength);
    }

    function normalize(vec) {
        return div(vec, length(vec));
    }

    function rgbToHsl(val) {
        var r = val[0]; var g = val[1]; var b = val[2];
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if(max == min){
            h = s = 0; // achromatic
        }else{
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h, s, l,val[3]];
    }

    function hue2rgb(p, q, t){
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    function hslToRgb(val){
        var h = val[0];
        var s = val[1];
        var l = val[2];

        var r, g, b;

        if(s === 0){
            r = g = b = l; // achromatic
        }else{

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [r, g , b, val[3]];
    }

    function linear(t, tMin, tMax, value1, value2){
        if(value1 === undefined || value2 === undefined){
            value1 = tMin;
            value2 = tMax;
            tMin = 0;
            tMax = 1;
        }
        if(tMax < tMin) {
            var _tMin = tMax;
            tMax = tMin;
            tMin = _tMin;
        }
        if(t <= tMin) {
            return value1;
        }else if(t >= tMax){
            return value2;
        }
        var perc = tMax === tMin ? 0 : (t-tMin)/(tMax-tMin);
        if(!value1.length){
            return value1 + (value2-value1)*perc;
        }
        var i, len = value1.length;
        var arr = createTypedArray('float32', len);
        for(i=0;i<len;i+=1){
            arr[i] = value1[i] + (value2[i]-value1[i])*perc;
        }
        return arr;
    }
    function random(min,max){
        if(max === undefined){
            if(min === undefined){
                min = 0;
                max = 1;
            } else {
                max = min;
                min = undefined;
            }
        }
        if(max.length){
            var i, len = max.length;
            if(!min){
                min = createTypedArray('float32', len);
            }
            var arr = createTypedArray('float32', len);
            var rnd = BMMath.random();
            for(i=0;i<len;i+=1){
                arr[i] = min[i] + rnd*(max[i]-min[i]);
            }
            return arr;
        }
        if(min === undefined){
            min = 0;
        }
        var rndm = BMMath.random();
        return min + rndm*(max-min);
    }

    function createPath(points, inTangents, outTangents, closed) {
        var i, len = points.length;
        var path = shape_pool.newElement();
        path.setPathData(!!closed, len);
        var arrPlaceholder = [0,0], inVertexPoint, outVertexPoint;
        for(i = 0; i < len; i += 1) {
            inVertexPoint = (inTangents && inTangents[i]) ? inTangents[i] : arrPlaceholder;
            outVertexPoint = (outTangents && outTangents[i]) ? outTangents[i] : arrPlaceholder;
            path.setTripleAt(points[i][0],points[i][1],outVertexPoint[0] + points[i][0],outVertexPoint[1] + points[i][1],inVertexPoint[0] + points[i][0],inVertexPoint[1] + points[i][1],i,true);
        }
        return path;
    }

    function initiateExpression(elem,data,property){
        var val = data.x;
        var needsVelocity = /velocity(?![\w\d])/.test(val);
        var _needsRandom = val.indexOf('random') !== -1;
        var elemType = elem.data.ty;
        var transform,$bm_transform,content,effect;
        var thisProperty = property;
        thisProperty.valueAtTime = thisProperty.getValueAtTime;
        Object.defineProperty(thisProperty, 'value', {
            get: function() {
                return thisProperty.v
            }
        })
        elem.comp.frameDuration = 1/elem.comp.globalData.frameRate;
        elem.comp.displayStartTime = 0;
        var inPoint = elem.data.ip/elem.comp.globalData.frameRate;
        var outPoint = elem.data.op/elem.comp.globalData.frameRate;
        var width = elem.data.sw ? elem.data.sw : 0;
        var height = elem.data.sh ? elem.data.sh : 0;
        var name = elem.data.nm;
        var loopIn, loop_in, loopOut, loop_out, smooth;
        var toWorld,fromWorld,fromComp,toComp,fromCompToSurface, position, rotation, anchorPoint, scale, thisLayer, thisComp,mask,valueAtTime,velocityAtTime;
        var __expression_functions = [];
        if(data.xf) {
            var i, len = data.xf.length;
            for(i = 0; i < len; i += 1) {
                __expression_functions[i] = eval('(function(){ return ' + data.xf[i] + '}())');
            }
        }

        var scoped_bm_rt;
        var expression_function = eval('[function _expression_function(){' + val+';scoped_bm_rt=$bm_rt}' + ']')[0];
        var numKeys = property.kf ? data.k.length : 0;

        var active = !this.data || this.data.hd !== true;

        var wiggle = function wiggle(freq,amp){
            var i,j, len = this.pv.length ? this.pv.length : 1;
            var addedAmps = createTypedArray('float32', len);
            freq = 5;
            var iterations = Math.floor(time*freq);
            i = 0;
            j = 0;
            while(i<iterations){
                //var rnd = BMMath.random();
                for(j=0;j<len;j+=1){
                    addedAmps[j] += -amp + amp*2*BMMath.random();
                    //addedAmps[j] += -amp + amp*2*rnd;
                }
                i += 1;
            }
            //var rnd2 = BMMath.random();
            var periods = time*freq;
            var perc = periods - Math.floor(periods);
            var arr = createTypedArray('float32', len);
            if(len>1){
                for(j=0;j<len;j+=1){
                    arr[j] = this.pv[j] + addedAmps[j] + (-amp + amp*2*BMMath.random())*perc;
                    //arr[j] = this.pv[j] + addedAmps[j] + (-amp + amp*2*rnd)*perc;
                    //arr[i] = this.pv[i] + addedAmp + amp1*perc + amp2*(1-perc);
                }
                return arr;
            } else {
                return this.pv + addedAmps[0] + (-amp + amp*2*BMMath.random())*perc;
            }
        }.bind(this);

        if(thisProperty.loopIn) {
            loopIn = thisProperty.loopIn.bind(thisProperty);
            loop_in = loopIn;
        }

        if(thisProperty.loopOut) {
            loopOut = thisProperty.loopOut.bind(thisProperty);
            loop_out = loopOut;
        }

        if(thisProperty.smooth) {
            smooth = thisProperty.smooth.bind(thisProperty);
        }

        function loopInDuration(type,duration){
            return loopIn(type,duration,true);
        }

        function loopOutDuration(type,duration){
            return loopOut(type,duration,true);
        }

        if(this.getValueAtTime) {
            valueAtTime = this.getValueAtTime.bind(this);
        }

        if(this.getVelocityAtTime) {
            velocityAtTime = this.getVelocityAtTime.bind(this);
        }

        var comp = elem.comp.globalData.projectInterface.bind(elem.comp.globalData.projectInterface);

        function lookAt(elem1,elem2){
            var fVec = [elem2[0]-elem1[0],elem2[1]-elem1[1],elem2[2]-elem1[2]];
            var pitch = Math.atan2(fVec[0],Math.sqrt(fVec[1]*fVec[1]+fVec[2]*fVec[2]))/degToRads;
            var yaw = -Math.atan2(fVec[1],fVec[2])/degToRads;
            return [yaw,pitch,0];
        }

        function easeOut(t, tMin, tMax, val1, val2){
            return applyEase(easeOutBez, t, tMin, tMax, val1, val2);
        }

        function easeIn(t, tMin, tMax, val1, val2){
            return applyEase(easeInBez, t, tMin, tMax, val1, val2);
        }

        function ease(t, tMin, tMax, val1, val2){
            return applyEase(easeInOutBez, t, tMin, tMax, val1, val2);
        }

        function applyEase(fn, t, tMin, tMax, val1, val2) {
            if(val1 === undefined){
                val1 = tMin;
                val2 = tMax;
            } else {
                t = (t - tMin) / (tMax - tMin);
            }
            t = t > 1 ? 1 : t < 0 ? 0 : t;
            var mult = fn(t);
            if($bm_isInstanceOfArray(val1)) {
                var i, len = val1.length;
                var arr = createTypedArray('float32', len);
                for (i = 0; i < len; i += 1) {
                    arr[i] = (val2[i] - val1[i]) * mult + val1[i];
                }
                return arr;
            } else {
                return (val2 - val1) * mult + val1;
            }
        }

        function nearestKey(time){
            var i, len = data.k.length,index,keyTime;
            if(!data.k.length || typeof(data.k[0]) === 'number'){
                index = 0;
                keyTime = 0;
            } else {
                index = -1;
                time *= elem.comp.globalData.frameRate;
                if (time < data.k[0].t) {
                    index = 1;
                    keyTime = data.k[0].t;
                } else {
                    for(i=0;i<len-1;i+=1){
                        if(time === data.k[i].t){
                            index = i + 1;
                            keyTime = data.k[i].t;
                            break;
                        }else if(time>data.k[i].t && time<data.k[i+1].t){
                            if(time-data.k[i].t > data.k[i+1].t - time){
                                index = i + 2;
                                keyTime = data.k[i+1].t;
                            } else {
                                index = i + 1;
                                keyTime = data.k[i].t;
                            }
                            break;
                        }
                    }
                    if(index === -1){
                        index = i + 1;
                        keyTime = data.k[i].t;
                    }
                }
                
            }
            var ob = {};
            ob.index = index;
            ob.time = keyTime/elem.comp.globalData.frameRate;
            return ob;
        }

        function key(ind){
            var ob, i, len;
            if(!data.k.length || typeof(data.k[0]) === 'number'){
                throw new Error('The property has no keyframe at index ' + ind);
            }
            ind -= 1;
            ob = {
                time: data.k[ind].t/elem.comp.globalData.frameRate,
                value: []
            };
            var arr = data.k[ind].hasOwnProperty('s') ? data.k[ind].s : data.k[ind - 1].e;

            len = arr.length;
            for(i=0;i<len;i+=1){
                ob[i] = arr[i];
                ob.value[i] = arr[i]
            }
            return ob;
        }

        function framesToTime(frames, fps) { 
            if (!fps) {
                fps = elem.comp.globalData.frameRate;
            }
            return frames / fps;
        }

        function timeToFrames(t, fps) {
            if (!t && t !== 0) {
                t = time;
            }
            if (!fps) {
                fps = elem.comp.globalData.frameRate;
            }
            return t * fps;
        }

        function seedRandom(seed){
            BMMath.seedrandom(randSeed + seed);
        }

        function sourceRectAtTime() {
            return elem.sourceRectAtTime();
        }

        function substring(init, end) {
            if(typeof value === 'string') {
                if(end === undefined) {
                return value.substring(init)
                }
                return value.substring(init, end)
            }
            return '';
        }

        function substr(init, end) {
            if(typeof value === 'string') {
                if(end === undefined) {
                return value.substr(init)
                }
                return value.substr(init, end)
            }
            return '';
        }

        function posterizeTime(framesPerSecond) {
            time = framesPerSecond === 0 ? 0 : Math.floor(time * framesPerSecond) / framesPerSecond
            value = valueAtTime(time)
        }

        var time, velocity, value, text, textIndex, textTotal, selectorValue;
        var index = elem.data.ind;
        var hasParent = !!(elem.hierarchy && elem.hierarchy.length);
        var parent;
        var randSeed = Math.floor(Math.random()*1000000);
        var globalData = elem.globalData;
        function executeExpression(_value) {
            // globalData.pushExpression();
            value = _value;
            if (_needsRandom) {
                seedRandom(randSeed);
            }
            if (this.frameExpressionId === elem.globalData.frameId && this.propType !== 'textSelector') {
                return value;
            }
            if(this.propType === 'textSelector'){
                textIndex = this.textIndex;
                textTotal = this.textTotal;
                selectorValue = this.selectorValue;
            }
            if (!thisLayer) {
                text = elem.layerInterface.text;
                thisLayer = elem.layerInterface;
                thisComp = elem.comp.compInterface;
                toWorld = thisLayer.toWorld.bind(thisLayer);
                fromWorld = thisLayer.fromWorld.bind(thisLayer);
                fromComp = thisLayer.fromComp.bind(thisLayer);
                toComp = thisLayer.toComp.bind(thisLayer);
                mask = thisLayer.mask ? thisLayer.mask.bind(thisLayer) : null;
                fromCompToSurface = fromComp;
            }
            if (!transform) {
                transform = elem.layerInterface("ADBE Transform Group");
                $bm_transform = transform;
                if(transform) {
                    anchorPoint = transform.anchorPoint;
                    /*position = transform.position;
                    rotation = transform.rotation;
                    scale = transform.scale;*/
                }
            }
            
            if (elemType === 4 && !content) {
                content = thisLayer("ADBE Root Vectors Group");
            }
            if (!effect) {
                effect = thisLayer(4);
            }
            hasParent = !!(elem.hierarchy && elem.hierarchy.length);
            if (hasParent && !parent) {
                parent = elem.hierarchy[0].layerInterface;
            }
            time = this.comp.renderedFrame/this.comp.globalData.frameRate;
            if (needsVelocity) {
                velocity = velocityAtTime(time);
            }
            expression_function();
            this.frameExpressionId = elem.globalData.frameId;


            //TODO: Check if it's possible to return on ShapeInterface the .v value
            if (scoped_bm_rt.propType === "shape") {
                scoped_bm_rt = scoped_bm_rt.v;
            }
            // globalData.popExpression();
            return scoped_bm_rt;
        }
        return executeExpression;
    }

    ob.initiateExpression = initiateExpression;
    return ob;
}());
var expressionHelpers = (function(){

    function searchExpressions(elem,data,prop){
        if(data.x){
            prop.k = true;
            prop.x = true;
            prop.initiateExpression = ExpressionManager.initiateExpression;
            prop.effectsSequence.push(prop.initiateExpression(elem,data,prop).bind(prop));
        }
    }

    function getValueAtTime(frameNum) {
        frameNum *= this.elem.globalData.frameRate;
        frameNum -= this.offsetTime;
        if(frameNum !== this._cachingAtTime.lastFrame) {
            this._cachingAtTime.lastIndex = this._cachingAtTime.lastFrame < frameNum ? this._cachingAtTime.lastIndex : 0;
            this._cachingAtTime.value = this.interpolateValue(frameNum, this._cachingAtTime);
            this._cachingAtTime.lastFrame = frameNum;
        }
        return this._cachingAtTime.value;

    }

    function getSpeedAtTime(frameNum) {
        var delta = -0.01;
        var v1 = this.getValueAtTime(frameNum);
        var v2 = this.getValueAtTime(frameNum + delta);
        var speed = 0;
        if(v1.length){
            var i;
            for(i=0;i<v1.length;i+=1){
                speed += Math.pow(v2[i] - v1[i], 2);
            }
            speed = Math.sqrt(speed) * 100;
        } else {
            speed = 0;
        }
        return speed;
    }

    function getVelocityAtTime(frameNum) {
        if(this.vel !== undefined){
            return this.vel;
        }
        var delta = -0.001;
        //frameNum += this.elem.data.st;
        var v1 = this.getValueAtTime(frameNum);
        var v2 = this.getValueAtTime(frameNum + delta);
        var velocity;
        if(v1.length){
            velocity = createTypedArray('float32', v1.length);
            var i;
            for(i=0;i<v1.length;i+=1){
                //removing frameRate
                //if needed, don't add it here
                //velocity[i] = this.elem.globalData.frameRate*((v2[i] - v1[i])/delta);
                velocity[i] = (v2[i] - v1[i])/delta;
            }
        } else {
            velocity = (v2 - v1)/delta;
        }
        return velocity;
    }

    function getStaticValueAtTime() {
        return this.pv;
    }

    function setGroupProperty(propertyGroup){
        this.propertyGroup = propertyGroup;
    }

	return {
		searchExpressions: searchExpressions,
		getSpeedAtTime: getSpeedAtTime,
		getVelocityAtTime: getVelocityAtTime,
		getValueAtTime: getValueAtTime,
		getStaticValueAtTime: getStaticValueAtTime,
		setGroupProperty: setGroupProperty,
	}
}());
(function addPropertyDecorator() {

    function loopOut(type,duration,durationFlag){
        if(!this.k || !this.keyframes){
            return this.pv;
        }
        type = type ? type.toLowerCase() : '';
        var currentFrame = this.comp.renderedFrame;
        var keyframes = this.keyframes;
        var lastKeyFrame = keyframes[keyframes.length - 1].t;
        if(currentFrame<=lastKeyFrame){
            return this.pv;
        }else{
            var cycleDuration, firstKeyFrame;
            if(!durationFlag){
                if(!duration || duration > keyframes.length - 1){
                    duration = keyframes.length - 1;
                }
                firstKeyFrame = keyframes[keyframes.length - 1 - duration].t;
                cycleDuration = lastKeyFrame - firstKeyFrame;
            } else {
                if(!duration){
                    cycleDuration = Math.max(0,lastKeyFrame - this.elem.data.ip);
                } else {
                    cycleDuration = Math.abs(lastKeyFrame - elem.comp.globalData.frameRate*duration);
                }
                firstKeyFrame = lastKeyFrame - cycleDuration;
            }
            var i, len, ret;
            if(type === 'pingpong') {
                var iterations = Math.floor((currentFrame - firstKeyFrame)/cycleDuration);
                if(iterations % 2 !== 0){
                    return this.getValueAtTime(((cycleDuration - (currentFrame - firstKeyFrame) % cycleDuration +  firstKeyFrame)) / this.comp.globalData.frameRate, 0);
                }
            } else if(type === 'offset'){
                var initV = this.getValueAtTime(firstKeyFrame / this.comp.globalData.frameRate, 0);
                var endV = this.getValueAtTime(lastKeyFrame / this.comp.globalData.frameRate, 0);
                var current = this.getValueAtTime(((currentFrame - firstKeyFrame) % cycleDuration +  firstKeyFrame) / this.comp.globalData.frameRate, 0);
                var repeats = Math.floor((currentFrame - firstKeyFrame)/cycleDuration);
                if(this.pv.length){
                    ret = new Array(initV.length);
                    len = ret.length;
                    for(i=0;i<len;i+=1){
                        ret[i] = (endV[i]-initV[i])*repeats + current[i];
                    }
                    return ret;
                }
                return (endV-initV)*repeats + current;
            } else if(type === 'continue'){
                var lastValue = this.getValueAtTime(lastKeyFrame / this.comp.globalData.frameRate, 0);
                var nextLastValue = this.getValueAtTime((lastKeyFrame - 0.001) / this.comp.globalData.frameRate, 0);
                if(this.pv.length){
                    ret = new Array(lastValue.length);
                    len = ret.length;
                    for(i=0;i<len;i+=1){
                        ret[i] = lastValue[i] + (lastValue[i]-nextLastValue[i])*((currentFrame - lastKeyFrame)/ this.comp.globalData.frameRate)/0.0005;
                    }
                    return ret;
                }
                return lastValue + (lastValue-nextLastValue)*(((currentFrame - lastKeyFrame))/0.001);
            }
            return this.getValueAtTime((((currentFrame - firstKeyFrame) % cycleDuration +  firstKeyFrame)) / this.comp.globalData.frameRate, 0);
        }
    }

    function loopIn(type,duration, durationFlag) {
        if(!this.k){
            return this.pv;
        }
        type = type ? type.toLowerCase() : '';
        var currentFrame = this.comp.renderedFrame;
        var keyframes = this.keyframes;
        var firstKeyFrame = keyframes[0].t;
        if(currentFrame>=firstKeyFrame){
            return this.pv;
        }else{
            var cycleDuration, lastKeyFrame;
            if(!durationFlag){
                if(!duration || duration > keyframes.length - 1){
                    duration = keyframes.length - 1;
                }
                lastKeyFrame = keyframes[duration].t;
                cycleDuration = lastKeyFrame - firstKeyFrame;
            } else {
                if(!duration){
                    cycleDuration = Math.max(0,this.elem.data.op - firstKeyFrame);
                } else {
                    cycleDuration = Math.abs(elem.comp.globalData.frameRate*duration);
                }
                lastKeyFrame = firstKeyFrame + cycleDuration;
            }
            var i, len, ret;
            if(type === 'pingpong') {
                var iterations = Math.floor((firstKeyFrame - currentFrame)/cycleDuration);
                if(iterations % 2 === 0){
                    return this.getValueAtTime((((firstKeyFrame - currentFrame)%cycleDuration +  firstKeyFrame)) / this.comp.globalData.frameRate, 0);
                }
            } else if(type === 'offset'){
                var initV = this.getValueAtTime(firstKeyFrame / this.comp.globalData.frameRate, 0);
                var endV = this.getValueAtTime(lastKeyFrame / this.comp.globalData.frameRate, 0);
                var current = this.getValueAtTime((cycleDuration - (firstKeyFrame - currentFrame)%cycleDuration +  firstKeyFrame) / this.comp.globalData.frameRate, 0);
                var repeats = Math.floor((firstKeyFrame - currentFrame)/cycleDuration)+1;
                if(this.pv.length){
                    ret = new Array(initV.length);
                    len = ret.length;
                    for(i=0;i<len;i+=1){
                        ret[i] = current[i]-(endV[i]-initV[i])*repeats;
                    }
                    return ret;
                }
                return current-(endV-initV)*repeats;
            } else if(type === 'continue'){
                var firstValue = this.getValueAtTime(firstKeyFrame / this.comp.globalData.frameRate, 0);
                var nextFirstValue = this.getValueAtTime((firstKeyFrame + 0.001) / this.comp.globalData.frameRate, 0);
                if(this.pv.length){
                    ret = new Array(firstValue.length);
                    len = ret.length;
                    for(i=0;i<len;i+=1){
                        ret[i] = firstValue[i] + (firstValue[i]-nextFirstValue[i])*(firstKeyFrame - currentFrame)/0.001;
                    }
                    return ret;
                }
                return firstValue + (firstValue-nextFirstValue)*(firstKeyFrame - currentFrame)/0.001;
            }
            return this.getValueAtTime(((cycleDuration - (firstKeyFrame - currentFrame) % cycleDuration +  firstKeyFrame)) / this.comp.globalData.frameRate, 0);
        }
    }

    function smooth(width, samples) {
        if (!this.k){
            return this.pv;
        }
        width = (width || 0.4) * 0.5;
        samples = Math.floor(samples || 5);
        if (samples <= 1) {
            return this.pv;
        }
        var currentTime = this.comp.renderedFrame / this.comp.globalData.frameRate;
        var initFrame = currentTime - width;
        var endFrame = currentTime + width;
        var sampleFrequency = samples > 1 ? (endFrame - initFrame) / (samples - 1) : 1;
        var i = 0, j = 0;
        var value;
        if (this.pv.length) {
            value = createTypedArray('float32', this.pv.length);
        } else {
            value = 0;
        }
        var sampleValue;
        while (i < samples) {
            sampleValue = this.getValueAtTime(initFrame + i * sampleFrequency);
            if(this.pv.length) {
                for (j = 0; j < this.pv.length; j += 1) {
                    value[j] += sampleValue[j];
                }
            } else {
                value += sampleValue;
            }
            i += 1;
        }
        if(this.pv.length) {
            for (j = 0; j < this.pv.length; j += 1) {
                value[j] /= samples;
            }
        } else {
            value /= samples;
        }
        return value;
    }

    function getValueAtTime(frameNum) {
        frameNum *= this.elem.globalData.frameRate;
        frameNum -= this.offsetTime;
        if(frameNum !== this._cachingAtTime.lastFrame) {
            this._cachingAtTime.lastIndex = this._cachingAtTime.lastFrame < frameNum ? this._cachingAtTime.lastIndex : 0;
            this._cachingAtTime.value = this.interpolateValue(frameNum, this._cachingAtTime);
            this._cachingAtTime.lastFrame = frameNum;
        }
        return this._cachingAtTime.value;

    }

    function getTransformValueAtTime(time) {
        console.warn('Transform at time not supported');
    }

    function getTransformStaticValueAtTime(time) {

    }

    var getTransformProperty = TransformPropertyFactory.getTransformProperty;
    TransformPropertyFactory.getTransformProperty = function(elem, data, container) {
        var prop = getTransformProperty(elem, data, container);
        if(prop.dynamicProperties.length) {
            prop.getValueAtTime = getTransformValueAtTime.bind(prop);
        } else {
            prop.getValueAtTime = getTransformStaticValueAtTime.bind(prop);
        }
        prop.setGroupProperty = expressionHelpers.setGroupProperty;
        return prop;
    };

    var propertyGetProp = PropertyFactory.getProp;
    PropertyFactory.getProp = function(elem,data,type, mult, container){
        var prop = propertyGetProp(elem,data,type, mult, container);
        //prop.getVelocityAtTime = getVelocityAtTime;
        //prop.loopOut = loopOut;
        //prop.loopIn = loopIn;
        if(prop.kf){
            prop.getValueAtTime = expressionHelpers.getValueAtTime.bind(prop);
        } else {
            prop.getValueAtTime = expressionHelpers.getStaticValueAtTime.bind(prop);
        }
        prop.setGroupProperty = expressionHelpers.setGroupProperty;
        prop.loopOut = loopOut;
        prop.loopIn = loopIn;
        prop.smooth = smooth;
        prop.getVelocityAtTime = expressionHelpers.getVelocityAtTime.bind(prop);
        prop.getSpeedAtTime = expressionHelpers.getSpeedAtTime.bind(prop);
        prop.numKeys = data.a === 1 ? data.k.length : 0;
        prop.propertyIndex = data.ix;
        var value = 0;
        if(type !== 0) {
            value = createTypedArray('float32', data.a === 1 ?  data.k[0].s.length : data.k.length);
        }
        prop._cachingAtTime = {
            lastFrame: initialDefaultFrame,
            lastIndex: 0,
            value: value
        };
        expressionHelpers.searchExpressions(elem,data,prop);
        if(prop.k){
            container.addDynamicProperty(prop);
        }

        return prop;
    };

    function getShapeValueAtTime(frameNum) {
        //For now this caching object is created only when needed instead of creating it when the shape is initialized.
        if (!this._cachingAtTime) {
            this._cachingAtTime = {
                shapeValue: shape_pool.clone(this.pv),
                lastIndex: 0,
                lastTime: initialDefaultFrame
            };
        }
        
        frameNum *= this.elem.globalData.frameRate;
        frameNum -= this.offsetTime;
        if(frameNum !== this._cachingAtTime.lastTime) {
            this._cachingAtTime.lastIndex = this._cachingAtTime.lastTime < frameNum ? this._caching.lastIndex : 0;
            this._cachingAtTime.lastTime = frameNum;
            this.interpolateShape(frameNum, this._cachingAtTime.shapeValue, this._cachingAtTime);
        }
        return this._cachingAtTime.shapeValue;
    }

    var ShapePropertyConstructorFunction = ShapePropertyFactory.getConstructorFunction();
    var KeyframedShapePropertyConstructorFunction = ShapePropertyFactory.getKeyframedConstructorFunction();

    function ShapeExpressions(){}
    ShapeExpressions.prototype = {
        vertices: function(prop, time){
            if (this.k) {
                this.getValue();
            }
            var shapePath = this.v;
            if(time !== undefined) {
                shapePath = this.getValueAtTime(time, 0);
            }
            var i, len = shapePath._length;
            var vertices = shapePath[prop];
            var points = shapePath.v;
            var arr = createSizedArray(len);
            for(i = 0; i < len; i += 1) {
                if(prop === 'i' || prop === 'o') {
                    arr[i] = [vertices[i][0] - points[i][0], vertices[i][1] - points[i][1]];
                } else {
                    arr[i] = [vertices[i][0], vertices[i][1]];
                }
                
            }
            return arr;
        },
        points: function(time){
            return this.vertices('v', time);
        },
        inTangents: function(time){
            return this.vertices('i', time);
        },
        outTangents: function(time){
            return this.vertices('o', time);
        },
        isClosed: function(){
            return this.v.c;
        },
        pointOnPath: function(perc, time){
            var shapePath = this.v;
            if(time !== undefined) {
                shapePath = this.getValueAtTime(time, 0);
            }
            if(!this._segmentsLength) {
                this._segmentsLength = bez.getSegmentsLength(shapePath);
            }

            var segmentsLength = this._segmentsLength;
            var lengths = segmentsLength.lengths;
            var lengthPos = segmentsLength.totalLength * perc;
            var i = 0, len = lengths.length;
            var j = 0, jLen;
            var accumulatedLength = 0, pt;
            while(i < len) {
                if(accumulatedLength + lengths[i].addedLength > lengthPos) {
                    var initIndex = i;
                    var endIndex = (shapePath.c && i === len - 1) ? 0 : i + 1;
                    var segmentPerc = (lengthPos - accumulatedLength)/lengths[i].addedLength;
                    pt = bez.getPointInSegment(shapePath.v[initIndex], shapePath.v[endIndex], shapePath.o[initIndex], shapePath.i[endIndex], segmentPerc, lengths[i]);
                    break;
                } else {
                    accumulatedLength += lengths[i].addedLength;
                }
                i += 1;
            }
            if(!pt){
                pt = shapePath.c ? [shapePath.v[0][0],shapePath.v[0][1]]:[shapePath.v[shapePath._length-1][0],shapePath.v[shapePath._length-1][1]];
            }
            return pt;
        },
        vectorOnPath: function(perc, time, vectorType){
            //perc doesn't use triple equality because it can be a Number object as well as a primitive.
            perc = perc == 1 ? this.v.c ? 0 : 0.999 : perc;
            var pt1 = this.pointOnPath(perc, time);
            var pt2 = this.pointOnPath(perc + 0.001, time);
            var xLength = pt2[0] - pt1[0];
            var yLength = pt2[1] - pt1[1];
            var magnitude = Math.sqrt(Math.pow(xLength,2) + Math.pow(yLength,2));
            if (magnitude === 0) {
                return [0,0];
            }
            var unitVector = vectorType === 'tangent' ? [xLength/magnitude, yLength/magnitude] : [-yLength/magnitude, xLength/magnitude];
            return unitVector;
        },
        tangentOnPath: function(perc, time){
            return this.vectorOnPath(perc, time, 'tangent');
        },
        normalOnPath: function(perc, time){
            return this.vectorOnPath(perc, time, 'normal');
        },
        setGroupProperty: expressionHelpers.setGroupProperty,
        getValueAtTime: expressionHelpers.getStaticValueAtTime
    };
    extendPrototype([ShapeExpressions], ShapePropertyConstructorFunction);
    extendPrototype([ShapeExpressions], KeyframedShapePropertyConstructorFunction);
    KeyframedShapePropertyConstructorFunction.prototype.getValueAtTime = getShapeValueAtTime;
    KeyframedShapePropertyConstructorFunction.prototype.initiateExpression = ExpressionManager.initiateExpression;

    var propertyGetShapeProp = ShapePropertyFactory.getShapeProp;
    ShapePropertyFactory.getShapeProp = function(elem,data,type, arr, trims){
        var prop = propertyGetShapeProp(elem,data,type, arr, trims);
        prop.propertyIndex = data.ix;
        prop.lock = false;
        if(type === 3){
            expressionHelpers.searchExpressions(elem,data.pt,prop);
        } else if(type === 4){
            expressionHelpers.searchExpressions(elem,data.ks,prop);
        }
        if(prop.k){
            elem.addDynamicProperty(prop);
        }
        return prop;
    };
}());
(function addDecorator() {

    function searchExpressions(){
        if(this.data.d.x){
            this.calculateExpression = ExpressionManager.initiateExpression.bind(this)(this.elem,this.data.d,this);
            this.addEffect(this.getExpressionValue.bind(this));
            return true;
        }
    }

    TextProperty.prototype.getExpressionValue = function(currentValue, text) {
        var newValue = this.calculateExpression(text);
        if(currentValue.t !== newValue) {
            var newData = {};
            this.copyData(newData, currentValue);
            newData.t = newValue.toString();
            newData.__complete = false;
            return newData;
        }
        return currentValue;
    }

    TextProperty.prototype.searchProperty = function(){

        var isKeyframed = this.searchKeyframes();
        var hasExpressions = this.searchExpressions();
        this.kf = isKeyframed || hasExpressions;
        return this.kf;
    };

    TextProperty.prototype.searchExpressions = searchExpressions;
    
}());
var ShapeExpressionInterface = (function(){

    function iterateElements(shapes,view, propertyGroup){
        var arr = [];
        var i, len = shapes ? shapes.length : 0;
        for(i=0;i<len;i+=1){
            if(shapes[i].ty == 'gr'){
                arr.push(groupInterfaceFactory(shapes[i],view[i],propertyGroup));
            }else if(shapes[i].ty == 'fl'){
                arr.push(fillInterfaceFactory(shapes[i],view[i],propertyGroup));
            }else if(shapes[i].ty == 'st'){
                arr.push(strokeInterfaceFactory(shapes[i],view[i],propertyGroup));
            }else if(shapes[i].ty == 'tm'){
                arr.push(trimInterfaceFactory(shapes[i],view[i],propertyGroup));
            }else if(shapes[i].ty == 'tr'){
                //arr.push(transformInterfaceFactory(shapes[i],view[i],propertyGroup));
            }else if(shapes[i].ty == 'el'){
                arr.push(ellipseInterfaceFactory(shapes[i],view[i],propertyGroup));
            }else if(shapes[i].ty == 'sr'){
                arr.push(starInterfaceFactory(shapes[i],view[i],propertyGroup));
            } else if(shapes[i].ty == 'sh'){
                arr.push(pathInterfaceFactory(shapes[i],view[i],propertyGroup));
            } else if(shapes[i].ty == 'rc'){
                arr.push(rectInterfaceFactory(shapes[i],view[i],propertyGroup));
            } else if(shapes[i].ty == 'rd'){
                arr.push(roundedInterfaceFactory(shapes[i],view[i],propertyGroup));
            } else if(shapes[i].ty == 'rp'){
                arr.push(repeaterInterfaceFactory(shapes[i],view[i],propertyGroup));
            }
        }
        return arr;
    }

    function contentsInterfaceFactory(shape,view, propertyGroup){
       var interfaces;
       var interfaceFunction = function _interfaceFunction(value){
           var i = 0, len = interfaces.length;
            while(i<len){
                if(interfaces[i]._name === value || interfaces[i].mn === value || interfaces[i].propertyIndex === value || interfaces[i].ix === value || interfaces[i].ind === value){
                   return interfaces[i];
                }
                i+=1;
            }
            if(typeof value === 'number'){
               return interfaces[value-1];
            }
       };
       interfaceFunction.propertyGroup = function(val){
           if(val === 1){
               return interfaceFunction;
           } else{
               return propertyGroup(val-1);
           }
       };
       interfaces = iterateElements(shape.it, view.it, interfaceFunction.propertyGroup);
       interfaceFunction.numProperties = interfaces.length;
       interfaceFunction.propertyIndex = shape.cix;
       interfaceFunction._name = shape.nm;

       return interfaceFunction;
   }

    function groupInterfaceFactory(shape,view, propertyGroup){
        var interfaceFunction = function _interfaceFunction(value){
            switch(value){
                case 'ADBE Vectors Group':
                case 'Contents':
                case 2:
                    return interfaceFunction.content;
                //Not necessary for now. Keeping them here in case a new case appears
                //case 'ADBE Vector Transform Group':
                //case 3:
                default:
                    return interfaceFunction.transform;
            }
        };
        interfaceFunction.propertyGroup = function(val){
            if(val === 1){
                return interfaceFunction;
            } else{
                return propertyGroup(val-1);
            }
        };
        var content = contentsInterfaceFactory(shape,view,interfaceFunction.propertyGroup);
        var transformInterface = transformInterfaceFactory(shape.it[shape.it.length - 1],view.it[view.it.length - 1],interfaceFunction.propertyGroup);
        interfaceFunction.content = content;
        interfaceFunction.transform = transformInterface;
        Object.defineProperty(interfaceFunction, '_name', {
            get: function(){
                return shape.nm;
            }
        });
        //interfaceFunction.content = interfaceFunction;
        interfaceFunction.numProperties = shape.np;
        interfaceFunction.propertyIndex = shape.ix;
        interfaceFunction.nm = shape.nm;
        interfaceFunction.mn = shape.mn;
        return interfaceFunction;
    }

    function fillInterfaceFactory(shape,view,propertyGroup){
        function interfaceFunction(val){
            if(val === 'Color' || val === 'color'){
                return interfaceFunction.color;
            } else if(val === 'Opacity' || val === 'opacity'){
                return interfaceFunction.opacity;
            }
        }
        Object.defineProperties(interfaceFunction, {
            'color': {
                get: ExpressionPropertyInterface(view.c)
            },
            'opacity': {
                get: ExpressionPropertyInterface(view.o)
            },
            '_name': { value: shape.nm },
            'mn': { value: shape.mn }
        });

        view.c.setGroupProperty(propertyGroup);
        view.o.setGroupProperty(propertyGroup);
        return interfaceFunction;
    }

    function strokeInterfaceFactory(shape,view,propertyGroup){
        function _propertyGroup(val){
            if(val === 1){
                return ob;
            } else{
                return propertyGroup(val-1);
            }
        }
        function _dashPropertyGroup(val){
            if(val === 1){
                return dashOb;
            } else{
                return _propertyGroup(val-1);
            }
        }
        function addPropertyToDashOb(i) {
            Object.defineProperty(dashOb, shape.d[i].nm, {
                get: ExpressionPropertyInterface(view.d.dataProps[i].p)
            });
        }
        var i, len = shape.d ? shape.d.length : 0;
        var dashOb = {};
        for (i = 0; i < len; i += 1) {
            addPropertyToDashOb(i);
            view.d.dataProps[i].p.setGroupProperty(_dashPropertyGroup);
        }

        function interfaceFunction(val){
            if(val === 'Color' || val === 'color'){
                return interfaceFunction.color;
            } else if(val === 'Opacity' || val === 'opacity'){
                return interfaceFunction.opacity;
            } else if(val === 'Stroke Width' || val === 'stroke width'){
                return interfaceFunction.strokeWidth;
            }
        }
        Object.defineProperties(interfaceFunction, {
            'color': {
                get: ExpressionPropertyInterface(view.c)
            },
            'opacity': {
                get: ExpressionPropertyInterface(view.o)
            },
            'strokeWidth': {
                get: ExpressionPropertyInterface(view.w)
            },
            'dash': {
                get: function() {
                    return dashOb;
                }
            },
            '_name': { value: shape.nm },
            'mn': { value: shape.mn }
        });

        view.c.setGroupProperty(_propertyGroup);
        view.o.setGroupProperty(_propertyGroup);
        view.w.setGroupProperty(_propertyGroup);
        return interfaceFunction;
    }

    function trimInterfaceFactory(shape,view,propertyGroup){
        function _propertyGroup(val){
            if(val == 1){
                return interfaceFunction;
            } else {
                return propertyGroup(--val);
            }
        }
        interfaceFunction.propertyIndex = shape.ix;

        view.s.setGroupProperty(_propertyGroup);
        view.e.setGroupProperty(_propertyGroup);
        view.o.setGroupProperty(_propertyGroup);

        function interfaceFunction(val){
            if(val === shape.e.ix || val === 'End' || val === 'end'){
                return interfaceFunction.end;
            }
            if(val === shape.s.ix){
                return interfaceFunction.start;
            }
            if(val === shape.o.ix){
                return interfaceFunction.offset;
            }
        }
        interfaceFunction.propertyIndex = shape.ix;
        interfaceFunction.propertyGroup = propertyGroup;

        Object.defineProperties(interfaceFunction, {
            'start': {
                get: ExpressionPropertyInterface(view.s)
            },
            'end': {
                get: ExpressionPropertyInterface(view.e)
            },
            'offset': {
                get: ExpressionPropertyInterface(view.o)
            },
            '_name': { value: shape.nm }
        });
        interfaceFunction.mn = shape.mn;
        return interfaceFunction;
    }

    function transformInterfaceFactory(shape,view,propertyGroup){
        function _propertyGroup(val){
            if(val == 1){
                return interfaceFunction;
            } else {
                return propertyGroup(--val);
            }
        }
        view.transform.mProps.o.setGroupProperty(_propertyGroup);
        view.transform.mProps.p.setGroupProperty(_propertyGroup);
        view.transform.mProps.a.setGroupProperty(_propertyGroup);
        view.transform.mProps.s.setGroupProperty(_propertyGroup);
        view.transform.mProps.r.setGroupProperty(_propertyGroup);
        if(view.transform.mProps.sk){
            view.transform.mProps.sk.setGroupProperty(_propertyGroup);
            view.transform.mProps.sa.setGroupProperty(_propertyGroup);
        }
        view.transform.op.setGroupProperty(_propertyGroup);

        function interfaceFunction(value){
            if(shape.a.ix === value || value === 'Anchor Point'){
                return interfaceFunction.anchorPoint;
            }
            if(shape.o.ix === value || value === 'Opacity'){
                return interfaceFunction.opacity;
            }
            if(shape.p.ix === value || value === 'Position'){
                return interfaceFunction.position;
            }
            if(shape.r.ix === value || value === 'Rotation' || value === 'ADBE Vector Rotation'){
                return interfaceFunction.rotation;
            }
            if(shape.s.ix === value || value === 'Scale'){
                return interfaceFunction.scale;
            }
            if(shape.sk && shape.sk.ix === value || value === 'Skew'){
                return interfaceFunction.skew;
            }
            if(shape.sa && shape.sa.ix === value || value === 'Skew Axis'){
                return interfaceFunction.skewAxis;
            }

        }
        Object.defineProperties(interfaceFunction, {
            'opacity': {
                get: ExpressionPropertyInterface(view.transform.mProps.o)
            },
            'position': {
                get: ExpressionPropertyInterface(view.transform.mProps.p)
            },
            'anchorPoint': {
                get: ExpressionPropertyInterface(view.transform.mProps.a)
            },
            'scale': {
                get: ExpressionPropertyInterface(view.transform.mProps.s)
            },
            'rotation': {
                get: ExpressionPropertyInterface(view.transform.mProps.r)
            },
            'skew': {
                get: ExpressionPropertyInterface(view.transform.mProps.sk)
            },
            'skewAxis': {
                get: ExpressionPropertyInterface(view.transform.mProps.sa)
            },
            '_name': { value: shape.nm }
        });
        interfaceFunction.ty = 'tr';
        interfaceFunction.mn = shape.mn;
        interfaceFunction.propertyGroup = propertyGroup;
        return interfaceFunction;
    }

    function ellipseInterfaceFactory(shape,view,propertyGroup){
        function _propertyGroup(val){
            if(val == 1){
                return interfaceFunction;
            } else {
                return propertyGroup(--val);
            }
        }
        interfaceFunction.propertyIndex = shape.ix;
        var prop = view.sh.ty === 'tm' ? view.sh.prop : view.sh;
        prop.s.setGroupProperty(_propertyGroup);
        prop.p.setGroupProperty(_propertyGroup);
        function interfaceFunction(value){
            if(shape.p.ix === value){
                return interfaceFunction.position;
            }
            if(shape.s.ix === value){
                return interfaceFunction.size;
            }
        }

        Object.defineProperties(interfaceFunction, {
            'size': {
                get: ExpressionPropertyInterface(prop.s)
            },
            'position': {
                get: ExpressionPropertyInterface(prop.p)
            },
            '_name': { value: shape.nm }
        });
        interfaceFunction.mn = shape.mn;
        return interfaceFunction;
    }

    function starInterfaceFactory(shape,view,propertyGroup){
        function _propertyGroup(val){
            if(val == 1){
                return interfaceFunction;
            } else {
                return propertyGroup(--val);
            }
        }
        var prop = view.sh.ty === 'tm' ? view.sh.prop : view.sh;
        interfaceFunction.propertyIndex = shape.ix;
        prop.or.setGroupProperty(_propertyGroup);
        prop.os.setGroupProperty(_propertyGroup);
        prop.pt.setGroupProperty(_propertyGroup);
        prop.p.setGroupProperty(_propertyGroup);
        prop.r.setGroupProperty(_propertyGroup);
        if(shape.ir){
            prop.ir.setGroupProperty(_propertyGroup);
            prop.is.setGroupProperty(_propertyGroup);
        }

        function interfaceFunction(value){
            if(shape.p.ix === value){
                return interfaceFunction.position;
            }
            if(shape.r.ix === value){
                return interfaceFunction.rotation;
            }
            if(shape.pt.ix === value){
                return interfaceFunction.points;
            }
            if(shape.or.ix === value || 'ADBE Vector Star Outer Radius' === value){
                return interfaceFunction.outerRadius;
            }
            if(shape.os.ix === value){
                return interfaceFunction.outerRoundness;
            }
            if(shape.ir && (shape.ir.ix === value || 'ADBE Vector Star Inner Radius' === value)){
                return interfaceFunction.innerRadius;
            }
            if(shape.is && shape.is.ix === value){
                return interfaceFunction.innerRoundness;
            }

        }

        Object.defineProperties(interfaceFunction, {
            'position': {
                get: ExpressionPropertyInterface(prop.p)
            },
            'rotation': {
                get: ExpressionPropertyInterface(prop.r)
            },
            'points': {
                get: ExpressionPropertyInterface(prop.pt)
            },
            'outerRadius': {
                get: ExpressionPropertyInterface(prop.or)
            },
            'outerRoundness': {
                get: ExpressionPropertyInterface(prop.os)
            },
            'innerRadius': {
                get: ExpressionPropertyInterface(prop.ir)
            },
            'innerRoundness': {
                get: ExpressionPropertyInterface(prop.is)
            },
            '_name': { value: shape.nm }
        });
        interfaceFunction.mn = shape.mn;
        return interfaceFunction;
    }

    function rectInterfaceFactory(shape,view,propertyGroup){
        function _propertyGroup(val){
            if(val == 1){
                return interfaceFunction;
            } else {
                return propertyGroup(--val);
            }
        }
        var prop = view.sh.ty === 'tm' ? view.sh.prop : view.sh;
        interfaceFunction.propertyIndex = shape.ix;
        prop.p.setGroupProperty(_propertyGroup);
        prop.s.setGroupProperty(_propertyGroup);
        prop.r.setGroupProperty(_propertyGroup);

        function interfaceFunction(value){
            if(shape.p.ix === value){
                return interfaceFunction.position;
            }
            if(shape.r.ix === value){
                return interfaceFunction.roundness;
            }
            if(shape.s.ix === value || value === 'Size' || value === 'ADBE Vector Rect Size'){
                return interfaceFunction.size;
            }

        }
        Object.defineProperties(interfaceFunction, {
            'position': {
                get: ExpressionPropertyInterface(prop.p)
            },
            'roundness': {
                get: ExpressionPropertyInterface(prop.r)
            },
            'size': {
                get: ExpressionPropertyInterface(prop.s)
            },
            '_name': { value: shape.nm }
        });
        interfaceFunction.mn = shape.mn;
        return interfaceFunction;
    }

    function roundedInterfaceFactory(shape,view,propertyGroup){
        function _propertyGroup(val){
            if(val == 1){
                return interfaceFunction;
            } else {
                return propertyGroup(--val);
            }
        }
        var prop = view;
        interfaceFunction.propertyIndex = shape.ix;
        prop.rd.setGroupProperty(_propertyGroup);

        function interfaceFunction(value){
            if(shape.r.ix === value || 'Round Corners 1' === value){
                return interfaceFunction.radius;
            }

        }
        Object.defineProperties(interfaceFunction, {
            'radius': {
                get: ExpressionPropertyInterface(prop.rd)
            },
            '_name': { value: shape.nm }
        });
        interfaceFunction.mn = shape.mn;
        return interfaceFunction;
    }

    function repeaterInterfaceFactory(shape,view,propertyGroup){
        function _propertyGroup(val){
            if(val == 1){
                return interfaceFunction;
            } else {
                return propertyGroup(--val);
            }
        }
        var prop = view;
        interfaceFunction.propertyIndex = shape.ix;
        prop.c.setGroupProperty(_propertyGroup);
        prop.o.setGroupProperty(_propertyGroup);

        function interfaceFunction(value){
            if(shape.c.ix === value || 'Copies' === value){
                return interfaceFunction.copies;
            } else if(shape.o.ix === value || 'Offset' === value){
                return interfaceFunction.offset;
            }

        }
        Object.defineProperties(interfaceFunction, {
            'copies': {
                get: ExpressionPropertyInterface(prop.c)
            },
            'offset': {
                get: ExpressionPropertyInterface(prop.o)
            },
            '_name': { value: shape.nm }
        });
        interfaceFunction.mn = shape.mn;
        return interfaceFunction;
    }

    function pathInterfaceFactory(shape,view,propertyGroup){
        var prop = view.sh;
        function _propertyGroup(val){
            if(val == 1){
                return interfaceFunction;
            } else {
                return propertyGroup(--val);
            }
        }
        prop.setGroupProperty(_propertyGroup);

        function interfaceFunction(val){
            if(val === 'Shape' || val === 'shape' || val === 'Path' || val === 'path' || val === 'ADBE Vector Shape' || val === 2){
                return interfaceFunction.path;
            }
        }
        Object.defineProperties(interfaceFunction, {
            'path': {
                get: function(){
                    if(prop.k){
                        prop.getValue();
                    }
                    return prop;
                }
            },
            'shape': {
                get: function(){
                    if(prop.k){
                        prop.getValue();
                    }
                    return prop;
                }
            },
            '_name': { value: shape.nm },
            'ix': { value: shape.ix },
            'propertyIndex': { value: shape.ix },
            'mn': { value: shape.mn }
        });
        return interfaceFunction;
    }

    return function(shapes,view,propertyGroup) {
        var interfaces;
        function _interfaceFunction(value){
            if(typeof value === 'number'){
                return interfaces[value-1];
            } else {
                var i = 0, len = interfaces.length;
                while(i<len){
                    if(interfaces[i]._name === value){
                        return interfaces[i];
                    }
                    i+=1;
                }
            }
        }
        _interfaceFunction.propertyGroup = propertyGroup;
        interfaces = iterateElements(shapes, view, _interfaceFunction);
        _interfaceFunction.numProperties = interfaces.length;
        return _interfaceFunction;
    };
}());

var TextExpressionInterface = (function(){
	return function(elem){
        var _prevValue, _sourceText;
        function _thisLayerFunction(){
        }
        Object.defineProperty(_thisLayerFunction, "sourceText", {
            get: function(){
                elem.textProperty.getValue()
                var stringValue = elem.textProperty.currentData.t;
                if(stringValue !== _prevValue) {
                    elem.textProperty.currentData.t = _prevValue;
                    _sourceText = new String(stringValue);
                    //If stringValue is an empty string, eval returns undefined, so it has to be returned as a String primitive
                    _sourceText.value = stringValue ? stringValue : new String(stringValue);
                }
                return _sourceText;
            }
        });
        return _thisLayerFunction;
    };
}());
var LayerExpressionInterface = (function (){
    function toWorld(arr, time){
        var toWorldMat = new Matrix();
        toWorldMat.reset();
        var transformMat;
        if(time) {
            //Todo implement value at time on transform properties
            //transformMat = this._elem.finalTransform.mProp.getValueAtTime(time);
            transformMat = this._elem.finalTransform.mProp;
        } else {
            transformMat = this._elem.finalTransform.mProp;
        }
        transformMat.applyToMatrix(toWorldMat);
        if(this._elem.hierarchy && this._elem.hierarchy.length){
            var i, len = this._elem.hierarchy.length;
            for(i=0;i<len;i+=1){
                this._elem.hierarchy[i].finalTransform.mProp.applyToMatrix(toWorldMat);
            }
            return toWorldMat.applyToPointArray(arr[0],arr[1],arr[2]||0);
        }
        return toWorldMat.applyToPointArray(arr[0],arr[1],arr[2]||0);
    }
    function fromWorld(arr, time){
        var toWorldMat = new Matrix();
        toWorldMat.reset();
        var transformMat;
        if(time) {
            //Todo implement value at time on transform properties
            //transformMat = this._elem.finalTransform.mProp.getValueAtTime(time);
            transformMat = this._elem.finalTransform.mProp;
        } else {
            transformMat = this._elem.finalTransform.mProp;
        }
        transformMat.applyToMatrix(toWorldMat);
        if(this._elem.hierarchy && this._elem.hierarchy.length){
            var i, len = this._elem.hierarchy.length;
            for(i=0;i<len;i+=1){
                this._elem.hierarchy[i].finalTransform.mProp.applyToMatrix(toWorldMat);
            }
            return toWorldMat.inversePoint(arr);
        }
        return toWorldMat.inversePoint(arr);
    }
    function fromComp(arr){
        var toWorldMat = new Matrix();
        toWorldMat.reset();
        this._elem.finalTransform.mProp.applyToMatrix(toWorldMat);
        if(this._elem.hierarchy && this._elem.hierarchy.length){
            var i, len = this._elem.hierarchy.length;
            for(i=0;i<len;i+=1){
                this._elem.hierarchy[i].finalTransform.mProp.applyToMatrix(toWorldMat);
            }
            return toWorldMat.inversePoint(arr);
        }
        return toWorldMat.inversePoint(arr);
    }

    function sampleImage() {
        return [1,1,1,1];
    }


    return function(elem){

        var transformInterface;

        function _registerMaskInterface(maskManager){
            _thisLayerFunction.mask = new MaskManagerInterface(maskManager, elem);
        }
        function _registerEffectsInterface(effects){
            _thisLayerFunction.effect = effects;
        }

        function _thisLayerFunction(name){
            switch(name){
                case "ADBE Root Vectors Group":
                case "Contents":
                case 2:
                    return _thisLayerFunction.shapeInterface;
                case 1:
                case 6:
                case "Transform":
                case "transform":
                case "ADBE Transform Group":
                    return transformInterface;
                case 4:
                case "ADBE Effect Parade":
                case "effects":
                case "Effects":
                    return _thisLayerFunction.effect;
            }
        }
        _thisLayerFunction.toWorld = toWorld;
        _thisLayerFunction.fromWorld = fromWorld;
        _thisLayerFunction.toComp = toWorld;
        _thisLayerFunction.fromComp = fromComp;
        _thisLayerFunction.sampleImage = sampleImage;
        _thisLayerFunction.sourceRectAtTime = elem.sourceRectAtTime.bind(elem);
        _thisLayerFunction._elem = elem;
        transformInterface = TransformExpressionInterface(elem.finalTransform.mProp);
        var anchorPointDescriptor = getDescriptor(transformInterface, 'anchorPoint');
        Object.defineProperties(_thisLayerFunction,{
            hasParent: {
                get: function(){
                    return elem.hierarchy.length;
                }
            },
            parent: {
                get: function(){
                    return elem.hierarchy[0].layerInterface;
                }
            },
            rotation: getDescriptor(transformInterface, 'rotation'),
            scale: getDescriptor(transformInterface, 'scale'),
            position: getDescriptor(transformInterface, 'position'),
            opacity: getDescriptor(transformInterface, 'opacity'),
            anchorPoint: anchorPointDescriptor,
            anchor_point: anchorPointDescriptor,
            transform: {
                get: function () {
                    return transformInterface;
                }
            },
            active: {
                get: function(){
                    return elem.isInRange;
                }
            }
        });

        _thisLayerFunction.startTime = elem.data.st;
        _thisLayerFunction.index = elem.data.ind;
        _thisLayerFunction.source = elem.data.refId;
        _thisLayerFunction.height = elem.data.ty === 0 ? elem.data.h : 100;
        _thisLayerFunction.width = elem.data.ty === 0 ? elem.data.w : 100;
        _thisLayerFunction.inPoint = elem.data.ip/elem.comp.globalData.frameRate;
        _thisLayerFunction.outPoint = elem.data.op/elem.comp.globalData.frameRate;
        _thisLayerFunction._name = elem.data.nm;

        _thisLayerFunction.registerMaskInterface = _registerMaskInterface;
        _thisLayerFunction.registerEffectsInterface = _registerEffectsInterface;
        return _thisLayerFunction;
    };
}());

var CompExpressionInterface = (function () {
    return function(comp) {
        function _thisLayerFunction(name) {
            var i = 0, len = comp.layers.length;
            while ( i < len) {
                if (comp.layers[i].nm === name || comp.layers[i].ind === name) {
                    return comp.elements[i].layerInterface;
                }
                i += 1;
            }
            return null;
            //return {active:false};
        }
        Object.defineProperty(_thisLayerFunction, "_name", { value: comp.data.nm });
        _thisLayerFunction.layer = _thisLayerFunction;
        _thisLayerFunction.pixelAspect = 1;
        _thisLayerFunction.height = comp.data.h || comp.globalData.compSize.h;
        _thisLayerFunction.width = comp.data.w || comp.globalData.compSize.w;
        _thisLayerFunction.pixelAspect = 1;
        _thisLayerFunction.frameDuration = 1 / comp.globalData.frameRate;
        _thisLayerFunction.displayStartTime = 0;
        _thisLayerFunction.numLayers = comp.layers.length;
        return _thisLayerFunction;
    };
}());
var TransformExpressionInterface = (function (){
    return function(transform){
        function _thisFunction(name){
            switch(name){
                case "scale":
                case "Scale":
                case "ADBE Scale":
                case 6:
                    return _thisFunction.scale;
                case "rotation":
                case "Rotation":
                case "ADBE Rotation":
                case "ADBE Rotate Z":
                case 10:
                    return _thisFunction.rotation;
                case "ADBE Rotate X":
                    return _thisFunction.xRotation;
                case "ADBE Rotate Y":
                    return _thisFunction.yRotation;
                case "position":
                case "Position":
                case "ADBE Position":
                case 2:
                    return _thisFunction.position;
                case 'ADBE Position_0':
                    return _thisFunction.xPosition;
                case 'ADBE Position_1':
                    return _thisFunction.yPosition;
                case 'ADBE Position_2':
                    return _thisFunction.zPosition;
                case "anchorPoint":
                case "AnchorPoint":
                case "Anchor Point":
                case "ADBE AnchorPoint":
                case 1:
                    return _thisFunction.anchorPoint;
                case "opacity":
                case "Opacity":
                case 11:
                    return _thisFunction.opacity;
            }
        }

        Object.defineProperty(_thisFunction, "rotation", {
            get: ExpressionPropertyInterface(transform.r || transform.rz)
        });

        Object.defineProperty(_thisFunction, "zRotation", {
            get: ExpressionPropertyInterface(transform.rz || transform.r)
        });

        Object.defineProperty(_thisFunction, "xRotation", {
            get: ExpressionPropertyInterface(transform.rx)
        });

        Object.defineProperty(_thisFunction, "yRotation", {
            get: ExpressionPropertyInterface(transform.ry)
        });
        Object.defineProperty(_thisFunction, "scale", {
            get: ExpressionPropertyInterface(transform.s)
        });

        if(transform.p) {
            var _transformFactory = ExpressionPropertyInterface(transform.p);
        }
        Object.defineProperty(_thisFunction, "position", {
            get: function () {
                if(transform.p) {
                    return _transformFactory();
                } else {
                    return [transform.px.v, transform.py.v, transform.pz ? transform.pz.v : 0];
                }
            }
        });

        Object.defineProperty(_thisFunction, "xPosition", {
            get: ExpressionPropertyInterface(transform.px)
        });

        Object.defineProperty(_thisFunction, "yPosition", {
            get: ExpressionPropertyInterface(transform.py)
        });

        Object.defineProperty(_thisFunction, "zPosition", {
            get: ExpressionPropertyInterface(transform.pz)
        });

        Object.defineProperty(_thisFunction, "anchorPoint", {
            get: ExpressionPropertyInterface(transform.a)
        });

        Object.defineProperty(_thisFunction, "opacity", {
            get: ExpressionPropertyInterface(transform.o)
        });

        Object.defineProperty(_thisFunction, "skew", {
            get: ExpressionPropertyInterface(transform.sk)
        });

        Object.defineProperty(_thisFunction, "skewAxis", {
            get: ExpressionPropertyInterface(transform.sa)
        });

        Object.defineProperty(_thisFunction, "orientation", {
            get: ExpressionPropertyInterface(transform.or)
        });

        return _thisFunction;
    };
}());
var ProjectInterface = (function (){

    function registerComposition(comp){
        this.compositions.push(comp);
    }

    return function(){
        function _thisProjectFunction(name){
            var i = 0, len = this.compositions.length;
            while(i<len){
                if(this.compositions[i].data && this.compositions[i].data.nm === name){
                    if(this.compositions[i].prepareFrame && this.compositions[i].data.xt) {
                        this.compositions[i].prepareFrame(this.currentFrame);
                    }
                    return this.compositions[i].compInterface;
                }
                i+=1;
            }
        }

        _thisProjectFunction.compositions = [];
        _thisProjectFunction.currentFrame = 0;

        _thisProjectFunction.registerComposition = registerComposition;



        return _thisProjectFunction;
    };
}());
var EffectsExpressionInterface = (function (){
    var ob = {
        createEffectsInterface: createEffectsInterface
    };

    function createEffectsInterface(elem, propertyGroup){
        if(elem.effectsManager){

            var effectElements = [];
            var effectsData = elem.data.ef;
            var i, len = elem.effectsManager.effectElements.length;
            for(i=0;i<len;i+=1){
                effectElements.push(createGroupInterface(effectsData[i],elem.effectsManager.effectElements[i],propertyGroup,elem));
            }

            return function(name){
                var effects = elem.data.ef || [], i = 0, len = effects.length;
                while(i<len) {
                    if(name === effects[i].nm || name === effects[i].mn || name === effects[i].ix){
                        return effectElements[i];
                    }
                    i += 1;
                }
            };
        }
    }

    function createGroupInterface(data,elements, propertyGroup, elem){
        var effectElements = [];
        var i, len = data.ef.length;
        for(i=0;i<len;i+=1){
            if(data.ef[i].ty === 5){
                effectElements.push(createGroupInterface(data.ef[i],elements.effectElements[i],elements.effectElements[i].propertyGroup, elem));
            } else {
                effectElements.push(createValueInterface(elements.effectElements[i],data.ef[i].ty, elem, _propertyGroup));
            }
        }

        function _propertyGroup(val) {
            if(val === 1){
               return groupInterface;
            } else{
               return propertyGroup(val-1);
            }
        }

        var groupInterface = function(name){
            var effects = data.ef, i = 0, len = effects.length;
            while(i<len) {
                if(name === effects[i].nm || name === effects[i].mn || name === effects[i].ix){
                    if(effects[i].ty === 5){
                        return effectElements[i];
                    } else {
                        return effectElements[i]();
                    }
                }
                i += 1;
            }
            return effectElements[0]();
        };

        groupInterface.propertyGroup = _propertyGroup;

        if(data.mn === 'ADBE Color Control'){
            Object.defineProperty(groupInterface, 'color', {
                get: function(){
                    return effectElements[0]();
                }
            });
        }
        Object.defineProperty(groupInterface, 'numProperties', {
            get: function(){
                return data.np;
            }
        });
        groupInterface.active = groupInterface.enabled = data.en !== 0;
        return groupInterface;
    }

    function createValueInterface(element, type, elem, propertyGroup){
        var expressionProperty = ExpressionPropertyInterface(element.p);
        function interfaceFunction(){
            if(type === 10){
                return elem.comp.compInterface(element.p.v);
            }
            return expressionProperty();
        }

        if(element.p.setGroupProperty) {
            element.p.setGroupProperty(propertyGroup);
        }

        return interfaceFunction;
    }

    return ob;

}());
var MaskManagerInterface = (function(){

	function MaskInterface(mask, data){
		this._mask = mask;
		this._data = data;
	}
	Object.defineProperty(MaskInterface.prototype, 'maskPath', {
        get: function(){
            if(this._mask.prop.k){
                this._mask.prop.getValue();
            }
            return this._mask.prop;
        }
    });
	Object.defineProperty(MaskInterface.prototype, 'maskOpacity', {
        get: function(){
            if(this._mask.op.k){
                this._mask.op.getValue();
            }
            return this._mask.op.v * 100;
        }
    });

	var MaskManager = function(maskManager, elem){
		var _maskManager = maskManager;
		var _elem = elem;
		var _masksInterfaces = createSizedArray(maskManager.viewData.length);
		var i, len = maskManager.viewData.length;
		for(i = 0; i < len; i += 1) {
			_masksInterfaces[i] = new MaskInterface(maskManager.viewData[i], maskManager.masksProperties[i]);
		}

		var maskFunction = function(name){
			i = 0;
		    while(i<len){
		        if(maskManager.masksProperties[i].nm === name){
		            return _masksInterfaces[i];
		        }
		        i += 1;
		    }
		};
		return maskFunction;
	};
	return MaskManager;
}());

var ExpressionPropertyInterface = (function() {

    var defaultUnidimensionalValue = {pv:0, v:0, mult: 1}
    var defaultMultidimensionalValue = {pv:[0,0,0], v:[0,0,0], mult: 1}

    function completeProperty(expressionValue, property, type) {
        Object.defineProperty(expressionValue, 'velocity', {
            get: function(){
                return property.getVelocityAtTime(property.comp.currentFrame);
            }
        });
        expressionValue.numKeys = property.keyframes ? property.keyframes.length : 0;
        expressionValue.key = function(pos) {
            if (!expressionValue.numKeys) {
                return 0;
            } else {
                var value = '';
                if ('s' in property.keyframes[pos-1]) {
                    value = property.keyframes[pos-1].s;
                } else if ('e' in property.keyframes[pos-2]) {
                    value = property.keyframes[pos-2].e;
                } else {
                    value = property.keyframes[pos-2].s;
                }
                var valueProp = type === 'unidimensional' ? new Number(value) : Object.assign({}, value);
                valueProp.time = property.keyframes[pos-1].t / property.elem.comp.globalData.frameRate;
                return valueProp;
            }
        };
        expressionValue.valueAtTime = property.getValueAtTime;
        expressionValue.speedAtTime = property.getSpeedAtTime;
        expressionValue.velocityAtTime = property.getVelocityAtTime;
        expressionValue.propertyGroup = property.propertyGroup;
    }

    function UnidimensionalPropertyInterface(property) {
        if(!property || !('pv' in property)) {
            property = defaultUnidimensionalValue;
        }
        var mult = 1 / property.mult;
        var val = property.pv * mult;
        var expressionValue = new Number(val);
        expressionValue.value = val;
        completeProperty(expressionValue, property, 'unidimensional');

        return function() {
            if (property.k) {
                property.getValue();
            }
            val = property.v * mult;
            if(expressionValue.value !== val) {
                expressionValue = new Number(val);
                expressionValue.value = val;
                completeProperty(expressionValue, property, 'unidimensional');
            }
            return expressionValue;
        }
    }

    function MultidimensionalPropertyInterface(property) {
        if(!property || !('pv' in property)) {
            property = defaultMultidimensionalValue;
        }
        var mult = 1 / property.mult;
        var len = property.pv.length;
        var expressionValue = createTypedArray('float32', len);
        var arrValue = createTypedArray('float32', len);
        expressionValue.value = arrValue;
        completeProperty(expressionValue, property, 'multidimensional');

        return function() {
            if (property.k) {
                property.getValue();
            }
            for (var i = 0; i < len; i += 1) {
                expressionValue[i] = arrValue[i] = property.v[i] * mult;
            }
            return expressionValue;
        }
    }

    //TODO: try to avoid using this getter
    function defaultGetter() {
        return defaultUnidimensionalValue;
    }
    
    return function(property) {
        if(!property) {
            return defaultGetter;
        } else if (property.propType === 'unidimensional') {
            return UnidimensionalPropertyInterface(property);
        } else {
            return MultidimensionalPropertyInterface(property);
        }
    }
}());

(function(){

    var TextExpressionSelectorProp = (function(){

        function getValueProxy(index,total){
            this.textIndex = index+1;
            this.textTotal = total;
            this.v = this.getValue() * this.mult;
            return this.v;
        }

        return function TextExpressionSelectorProp(elem,data){
            this.pv = 1;
            this.comp = elem.comp;
            this.elem = elem;
            this.mult = 0.01;
            this.propType = 'textSelector';
            this.textTotal = data.totalChars;
            this.selectorValue = 100;
            this.lastValue = [1,1,1];
            this.k = true;
            this.x = true;
            this.getValue = ExpressionManager.initiateExpression.bind(this)(elem,data,this);
            this.getMult = getValueProxy;
            this.getVelocityAtTime = expressionHelpers.getVelocityAtTime;
            if(this.kf){
                this.getValueAtTime = expressionHelpers.getValueAtTime.bind(this);
            } else {
                this.getValueAtTime = expressionHelpers.getStaticValueAtTime.bind(this);
            }
            this.setGroupProperty = expressionHelpers.setGroupProperty;
        };
    }());

	var propertyGetTextProp = TextSelectorProp.getTextSelectorProp;
	TextSelectorProp.getTextSelectorProp = function(elem, data,arr){
	    if(data.t === 1){
	        return new TextExpressionSelectorProp(elem, data,arr);
	    } else {
	        return propertyGetTextProp(elem,data,arr);
	    }
	};
}());
function SliderEffect(data,elem, container){
    this.p = PropertyFactory.getProp(elem,data.v,0,0,container);
}
function AngleEffect(data,elem, container){
    this.p = PropertyFactory.getProp(elem,data.v,0,0,container);
}
function ColorEffect(data,elem, container){
    this.p = PropertyFactory.getProp(elem,data.v,1,0,container);
}
function PointEffect(data,elem, container){
    this.p = PropertyFactory.getProp(elem,data.v,1,0,container);
}
function LayerIndexEffect(data,elem, container){
    this.p = PropertyFactory.getProp(elem,data.v,0,0,container);
}
function MaskIndexEffect(data,elem, container){
    this.p = PropertyFactory.getProp(elem,data.v,0,0,container);
}
function CheckboxEffect(data,elem, container){
    this.p = PropertyFactory.getProp(elem,data.v,0,0,container);
}
function NoValueEffect(){
    this.p = {};
}
function EffectsManager(){}
function EffectsManager(data,element){
    var effects = data.ef || [];
    this.effectElements = [];
    var i,len = effects.length;
    var effectItem;
    for(i=0;i<len;i++) {
        effectItem = new GroupEffect(effects[i],element);
        this.effectElements.push(effectItem);
    }
}

function GroupEffect(data,element){
    this.init(data,element);
}

extendPrototype([DynamicPropertyContainer], GroupEffect);

GroupEffect.prototype.getValue = GroupEffect.prototype.iterateDynamicProperties;

GroupEffect.prototype.init = function(data,element){
    this.data = data;
    this.effectElements = [];
    this.initDynamicPropertyContainer(element);
    var i, len = this.data.ef.length;
    var eff, effects = this.data.ef;
    for(i=0;i<len;i+=1){
        eff = null;
        switch(effects[i].ty){
            case 0:
                eff = new SliderEffect(effects[i],element,this);
                break;
            case 1:
                eff = new AngleEffect(effects[i],element,this);
                break;
            case 2:
                eff = new ColorEffect(effects[i],element,this);
                break;
            case 3:
                eff = new PointEffect(effects[i],element,this);
                break;
            case 4:
            case 7:
                eff = new CheckboxEffect(effects[i],element,this);
                break;
            case 10:
                eff = new LayerIndexEffect(effects[i],element,this);
                break;
            case 11:
                eff = new MaskIndexEffect(effects[i],element,this);
                break;
            case 5:
                eff = new EffectsManager(effects[i],element,this);
                break;
            //case 6:
            default:
                eff = new NoValueEffect(effects[i],element,this);
                break;
        }
        if(eff) {
            this.effectElements.push(eff);
        }
    }
};

var lottie = {};

var _isFrozen = false;

function setLocationHref(href) {
    locationHref = href;
}

function searchAnimations() {
    if (standalone === true) {
        animationManager.searchAnimations(animationData, standalone, renderer);
    } else {
        animationManager.searchAnimations();
    }
}

function setSubframeRendering(flag) {
    subframeEnabled = flag;
}

function loadAnimation(params) {
    if (standalone === true) {
        params.animationData = JSON.parse(animationData);
    }
    return animationManager.loadAnimation(params);
}

function loadAnimation2(params) {
    CanvasKitInit({
    }).ready().then((CanvasKit) => {
        // Code goes here using CanvasKit
        const surface = CanvasKit.MakeCanvasSurface(canvas.id);
        if (!surface) {
            throw 'Could not make surface';
        }
        const skcanvas = surface.getCanvas();
        const paint = new CanvasKit.SkPaint();

        const textPaint = new CanvasKit.SkPaint();
        textPaint.setColor(CanvasKit.Color(40, 0, 0, 1.0));
        textPaint.setAntiAlias(true);

        const textFont = new CanvasKit.SkFont(null, 30);

        let offset = 0;
        let X = 100;
        let Y = 100;

        const context = CanvasKit.currentContext();

        function drawFrame() {
            // If there are multiple contexts on the screen, we need to make sure
            // we switch to this one before we draw.
            CanvasKit.setCurrentContext(context);
            const path = starPath(CanvasKit, X, Y);

            const dpe = CanvasKit.MakeSkDashPathEffect([15, 5, 5, 10], offset / 5);
            offset++;

            paint.setPathEffect(dpe);
            paint.setStyle(CanvasKit.PaintStyle.Stroke);
            paint.setStrokeWidth(5.0 + -3 * Math.cos(offset / 30));
            paint.setAntiAlias(true);
            paint.setColor(CanvasKit.Color(66, 129, 164, 1.0));

            skcanvas.clear(CanvasKit.Color(255, 255, 255, 1.0));

            skcanvas.drawPath(path, paint);
            skcanvas.drawText('Try Clicking!', 10, 425, textPaint, textFont);
            skcanvas.flush();
            dpe.delete();
            path.delete();
            requestAnimationFrame(drawFrame);
        }
        requestAnimationFrame(drawFrame);

        function starPath(CanvasKit, X, Y, R = 128) {
            let p = new CanvasKit.SkPath();
            p.moveTo(X + R, Y);
            for (let i = 1; i < 8; i++) {
                let a = 2.6927937 * i;
                p.lineTo(X + R * Math.cos(a), Y + R * Math.sin(a));
            }
            return p;
        }

        // Make animation interactive
        canvas.addEventListener('pointermove', (e) => {
            if (!e.pressure) {
                return;
            }
            X = e.offsetX;
            Y = e.offsetY;
        });
    });
}

function loadAnimation3(params) {
    CanvasKitInit({
    }).ready().then((CanvasKit) => {

        if (standalone === true) {
            params.animationData = JSON.parse(animationData);
        }
        SKIA.setCanvasKit(CanvasKit);
        return animationManager.loadAnimation(params);
    });
}

function setQuality(value) {
    if (typeof value === 'string') {
        switch (value) {
            case 'high':
                defaultCurveSegments = 200;
                break;
            case 'medium':
                defaultCurveSegments = 50;
                break;
            case 'low':
                defaultCurveSegments = 10;
                break;
        }
    } else if (!isNaN(value) && value > 1) {
        defaultCurveSegments = value;
    }
    if (defaultCurveSegments >= 50) {
        roundValues(false);
    } else {
        roundValues(true);
    }
}

function inBrowser() {
    return typeof navigator !== 'undefined';
}

function installPlugin(type, plugin) {
    if (type === 'expressions') {
        expressionsPlugin = plugin;
    }
}

function getFactory(name) {
    switch (name) {
        case "propertyFactory":
            return PropertyFactory;
        case "shapePropertyFactory":
            return ShapePropertyFactory;
        case "matrix":
            return Matrix;
    }
}

lottie.play = animationManager.play;
lottie.pause = animationManager.pause;
lottie.setLocationHref = setLocationHref;
lottie.togglePause = animationManager.togglePause;
lottie.setSpeed = animationManager.setSpeed;
lottie.setDirection = animationManager.setDirection;
lottie.stop = animationManager.stop;
lottie.searchAnimations = searchAnimations;
lottie.registerAnimation = animationManager.registerAnimation;
lottie.loadAnimation = loadAnimation;
lottie.loadAnimation2 = loadAnimation2;
lottie.loadAnimation3 = loadAnimation3;
lottie.setSubframeRendering = setSubframeRendering;
lottie.resize = animationManager.resize;
//lottie.start = start;
lottie.goToAndStop = animationManager.goToAndStop;
lottie.destroy = animationManager.destroy;
lottie.setQuality = setQuality;
lottie.inBrowser = inBrowser;
lottie.installPlugin = installPlugin;
lottie.freeze = animationManager.freeze;
lottie.unfreeze = animationManager.unfreeze;
lottie.getRegisteredAnimations = animationManager.getRegisteredAnimations;
lottie.__getFactory = getFactory;
lottie.version = '5.6.5';

function checkReady() {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        searchAnimations();
    }
}

function getQueryVariable(variable) {
    var vars = queryString.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
}
var standalone = '__[STANDALONE]__';
var animationData = '__[ANIMATIONDATA]__';
var renderer = '';
if (standalone) {
    var scripts = document.getElementsByTagName('script');
    var index = scripts.length - 1;
    var myScript = scripts[index] || {
        src: ''
    };
    var queryString = myScript.src.replace(/^[^\?]+\??/, '');
    renderer = getQueryVariable('renderer');
}
var readyStateCheckInterval = setInterval(checkReady, 100);

return lottie;
}));