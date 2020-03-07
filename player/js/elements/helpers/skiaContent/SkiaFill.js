function SkiaFill(canvasKit) {
    SkiaBaseContent.call(this, canvasKit);

    /**
 * 创建填充
 */
    this.setFillStyle = function (fillStyle) {
        this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
        if (typeof fillStyle === 'string') {
            var fs = ColorUtil.parseColor(this.canvasKit, fillStyle);
            var alphaColor = this.canvasKit.multiplyByAlpha(fs, this.alpha);
            this.paint.setColor(alphaColor);
        } else if (fillStyle._getShader) {
            // It's an effect that has a shader.
            var shader = fillStyle._getShader(this.transform);
            this.paint.setColor(this.canvasKit.Color(0, 0, 0, this.alpha));
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
            path.setFillType(this.canvasKit.FillType.EvenOdd);
        } else if (fillRule === 'nonzero' || !fillRule) {
            path.setFillType(this.canvasKit.FillType.Winding);
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


