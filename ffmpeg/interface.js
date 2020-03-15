VideoReaderWorker.onRuntimeInitialized = function () {
    postMessage({ type: 'init' });
}

var videoReader;

self.onmessage = function (e) {
    var data = e.data;
    console.log(data);
    switch (data.type) {
        case 'load':
            videoReader = new VideoReaderWorker.VideoWorker();
            var bb = new Blob([data.args.buffer], { type: "application/octet-binary" });
            console.log(bb);
            //videoReader.load( data.args.path,  data.args.frameRate);
            break;
        case 'frame':
            videoReader.readFrame(data.args.time);
            break;
        case 'close':
            videoReader.destroy();
            videoReader.delete();
            break;
        default:
            break;
    }
}