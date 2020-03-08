var FontPreloader = (function () {

    function fontLoaded() {
        this.loadedFonts += 1;
        if (this.loadedFonts === this.totalFonts) {
            if (this.fontsLoadedCb) {
                this.fontsLoadedCb(null);
            }
        }
    }

    function getFontsPath(fontData, fontsPath, original_path) {
        return './fonts/SourceHanSansCN-Bold.otf';
        //return fontData.fPath;
    }


    /**
    * 创建字体二进制数据
    * @param {{字体资源信息}} fontData 
    */
    function createFontBinaryData(fontData) {
        var path = getFontsPath(fontData, this.fontsPath, this.path);

        var ob = {
            fontData: fontData
        }

        fetch(path).then(response => response.arrayBuffer())
            .then(buffer => {
                const fontMgr = SKIA.CanvasKit().SkFontMgr.RefDefault();
                ob.font = fontMgr.MakeTypefaceFromData(buffer);
                _toCleanUp.push(ob.font);
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
        this.fontsLoadedCb = cb;
        var i, len = assets.list.length;
        for (i = 0; i < len; i += 1) {
            this.totalFonts += 1;
            this.fonts.push(this._createFontBinaryData(assets.list[i]));
        }
    }

    function destroy() {
        this.fontsLoadedCb = null;
        this.fonts.length = 0;
        this._toCleanUp.forEach(function (c) {
            c.delete();
        });
    }

    function loaded() {
        return this.totalFonts === this.loadedFonts;
    }

    return function FontPreloader() {
        this.loadAssetsBinary = loadAssetsBinary;
        this._createFontBinaryData = createFontBinaryData;
        this.loaded = loaded;
        this._fontLoaded = fontLoaded;
        this.destroy = destroy;
        this.fontsPath = '';
        this.path = '';
        this.totalFonts = 0;
        this.loadedFonts = 0;
        this.fontsLoadedCb = null;
        this.fonts = [];
        this._toCleanUp = [];
    };
}());