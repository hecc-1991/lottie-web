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