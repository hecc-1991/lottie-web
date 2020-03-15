VideoReaderWorker.onRuntimeInitialized = function () {
    postMessage({ type: 'init' });
}

var videoReader;

self.onmessage = function (e) {
    var data = e.data;
    var type = data.type;
    var args = data.args;
    switch (type) {
        case 'load':
            videoReader = new VideoReaderWorker.VideoWorker();
            videoReader.load(args.path, args.frameRate);
            break;
        case 'frame':
            videoReader.readFrame(args.time);
            break;
        case 'close':
            videoReader.destroy();
            break;
        default:
            break;
    }
}