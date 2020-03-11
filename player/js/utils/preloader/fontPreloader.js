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