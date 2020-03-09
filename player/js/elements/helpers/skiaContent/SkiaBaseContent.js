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

