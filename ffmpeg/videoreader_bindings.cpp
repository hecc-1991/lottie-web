#include "video_stream.hh"
#include "context.hh"
#include <emscripten.h>
#include <emscripten/bind.h>

using namespace std;
using namespace emscripten;
using namespace pulsevideo;

class VideoWorker
{
public:
	VideoWorker() {}
	~VideoWorker() {}

	int load(std::string path, int frameRate)
	{
		int ret = 0;
		StreamContext gStreamCtx;
		stream = new VideoReaderStream(gStreamCtx);

		Config aconfig;
		aconfig.SetString("url", path);
		aconfig.SetIntNumber("sample-rate", frameRate);

		auto od_res = stream->do_video_stream_open(aconfig);
		if_result_failure(od_res)
		{
			ret = -1;
		}
		return ret;
	}

	int destroy()
	{
		int ret = 0;
		auto od_res = stream->do_video_stream_close();
		if (stream)
		{
			delete stream;
		}
		if_result_failure(od_res)
		{
			ret = -1;
		}
		return 0;
	}

	int readFrame(float time)
	{
		int ret = 0;
		auto od_res = stream->do_video_stream_read_frame(time, 0, false);
		if_result_failure(od_res)
		{
			ret = -1;
		}
		return ret;
	}

private:
	VideoReaderStream *stream = nullptr;
};

EMSCRIPTEN_BINDINGS(work)
{
	class_<VideoWorker>("VideoWorker")
		.constructor<>()
		.function("load", &VideoWorker::load)
		.function("destroy", &VideoWorker::destroy)
		.function("readFrame", &VideoWorker::readFrame);
}