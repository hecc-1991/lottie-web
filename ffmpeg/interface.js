VideoReaderWorker.onRuntimeInitialized = function () {
    postMessage({ type: 'init' });
}

var videoReader;

const WORK_DIR = '/workdir';

self.onmessage = function (e) {
    var data = e.data;
    console.log(data);
    switch (data.type) {
        case 'load':
            videoReader = new VideoReaderWorker.VideoWorker();
            var bb = new Blob([data.args.buffer], { type: "application/octet-binary" });
            FS.mkdir(WORK_DIR);
            FS.mount(WORKERFS, {
                blobs: [{ name: data.args.path, data: bb }]
            }, WORK_DIR);
            console.log(bb);
            videoReader.load(WORK_DIR + '/' + data.args.path, data.args.frameRate);
            break;
        case 'loadFile':
            videoReader = new VideoReaderWorker.VideoWorker();
            FS.mkdir(WORK_DIR);
            FS.mount(WORKERFS, {
                files: [data.args.file]
            }, WORK_DIR);
            var ret = videoReader.load(WORK_DIR + '/' + data.args.path, data.args.frameRate);
            console.log(ret);
            if (ret == 0) {
                var rep = {
                    type: 'loaded',
                    args: {}
                };
                self.postMessage(rep);
            }
            break;
        case 'frame':
            var size = videoReader.getSize();
            var tmp = VideoReaderWorker._malloc(size.width * size.height * 4);
            var dst = videoReader.readFrame(data.args.time, tmp);
            var buffer = dst.slice(0);
            var rep = {
                type: 'framed',
                args: { buffer: buffer.buffer }
            };

            /* console.log('dst1-----------------------------');
            console.log(dst);

            console.log('buffer-----------------------------');
            console.log(buffer); */

            self.postMessage(rep, [rep.args.buffer]);
            VideoReaderWorker._free(tmp);

            dst = null;
            /* console.log('dst2-----------------------------');
            console.log(dst);

            console.log('buffer2-----------------------------');
            console.log(buffer); */

            break;
        case 'close':
            videoReader.destroy();
            videoReader.delete();
            break;
        default:
            break;
    }
}