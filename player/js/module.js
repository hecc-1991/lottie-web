"use strict";
/*<%= contents %>*/
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
lottie.version = '[[BM_VERSION]]';

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
