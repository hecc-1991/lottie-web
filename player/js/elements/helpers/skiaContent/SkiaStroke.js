function SkiaStroke(canvasKit) {
    SkiaBaseContent.call(this, canvasKit);

    /**
 * 设置画笔风格
 */
    this.setStrokeStyle = function (strokeStyle) {
        this.paint.setStyle(this.canvasKit.PaintStyle.Stroke);
        if (typeof strokeStyle === 'string') {
            var ss = ColorUtil.parseColor(this.canvasKit, fillStyle);
            var alphaColor = this.canvasKit.multiplyByAlpha(ss, this.alpha);
            this.paint.setColor(alphaColor);
        } else if (strokeStyle._getShader) {
            // It's probably an effect.
            var shader = strokeStyle._getShader(this.transform);
            this.paint.setColor(this.canvasKit.Color(0, 0, 0, this.alpha));
            this.paint.setShader(shader);
        }
    }

    /**
     * 设置画笔末端样式
     */
    this.setStrokeCap = function (cap) {
        switch (cap) {
            case 'butt':
                this.paint.setStrokeCap(this.canvasKit.StrokeCap.Butt);
                return;
            case 'round':
                this.paint.setStrokeCap(this.canvasKit.StrokeCap.Round);
                return;
            case 'square':
                this.paint.setStrokeCap(this.canvasKit.StrokeCap.Square);
                return;
        }
    }

    /**
     * 设置画笔转角
     */
    this.setStrokeJoin = function (join) {
        switch (join) {
            case 'miter':
                this.paint.setStrokeJoin(this.canvasKit.StrokeJoin.Miter);
                return;
            case 'round':
                this.paint.setStrokeJoin(this.canvasKit.StrokeJoin.Round);
                return;
            case 'bevel':
                this.paint.setStrokeJoin(this.canvasKit.StrokeJoin.Bevel);
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
            var dashedEffect = this.canvasKit.MakeSkDashPathEffect(dashes, lineDashOffset);
            this.paint.setPathEffect(dashedEffect);
        }

        this.paint.dispose = function () {
            dashedEffect && dashedEffect.delete();
            this.delete();
        }

    }

    this.draw = function (skcanvas,path) {

        var shadowPaint = this._shadowPaint(paint);
        if (shadowPaint) {
            skcanvas.save();
            skcanvas.concat(this._shadowOffsetMatrix());
            skcanvas.drawPath(path, shadowPaint);
            skcanvas.restore();
            shadowPaint.dispose();
        }

        skcanvas.drawPath(path, paint);
        paint.dispose();
    }
}

