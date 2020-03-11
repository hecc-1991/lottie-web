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