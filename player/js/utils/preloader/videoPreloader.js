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
     * 创建图片二进制数据
     * @param {{图片资源信息}} assetData 
     */
    function createVideoBinaryData(assetData) {
        var path = getAssetsPath(assetData);

        var ob = {
            assetData: assetData
        }
        ob.videoReaderWorker = new Worker('VideoReaderWorker.js');

        ob.videoReaderWorker.onmessage = function (e) {
            var data = e.data;
            console.log(data);
            switch (data.type) {
                case 'loaded':
                    this._videoLoaded();
                    break;

                default:
                    break;
            }
        };
        fetch(path).then(response => response.arrayBuffer())
            .then(buffer => {
                var req = {
                    type: 'load',
                    args: {
                        buffer: buffer
                    }
                }
                ob.videoReaderWorker.postMessage(req, [req.args.buffer]);

            });

        return ob;
    }

    /**
     * 加载图片的二进制数据，即ByteArrry
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
                return this.videos[i].video;
            }
            i += 1;
        }
    }

    /**
     * 销毁资源
     */
    function destroy() {
        this.videosLoadedCb = null;
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