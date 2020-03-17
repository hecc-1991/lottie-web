#include "video_stream.hh"
#include "context.hh"
#include "mem_frame.hh"
#include <emscripten.h>
#include <emscripten/bind.h>

using namespace std;
using namespace emscripten;
using namespace pulsevideo;

using JSArray = emscripten::val;
using JSObject = emscripten::val;
using JSString = emscripten::val;
using SkPathOrNull = emscripten::val;
using Uint8Array = emscripten::val;
using Float32Array = emscripten::val;

struct ISize
{
	int width{0};
	int height{0};
};

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
		aconfig.SetIntNumber("fps", frameRate);

		auto od_res = stream->Open(aconfig);
		if_result_failure(od_res)
		{
			ret = -1;
		}

		size.width = stream->GetWidth();
		size.height = stream->GetHeight();

		return ret;
	}

	ISize getSize()
	{
		return size;
	}

	void destroy()
	{
		auto od_res = stream->Close();
		if_result_failure(od_res)
		{
			printf("VideoWorker destroy failed");
		}
		if (stream)
		{
			delete stream;
		}
	}

	Uint8Array readNextFrame(uintptr_t tmp)
	{
		uint8_t *dst = reinterpret_cast<uint8_t *>(tmp);
		int ret = 0;
		auto od_res = stream->ReadNextFrame();
		if_result_failure(od_res)
		{
			ret = -1;
		}

		auto stub = od_res->CastTo<VideoFrame>()->GetStub<VideoMemStub>();
		// BGRA
		const uint8_t *src = stub->GetData();
		int size = stub->GetStride() * stub->GetVStride();
		//uint8_t *dst = (uint8_t *)malloc(size * sizeof(uint8_t));
		memcpy(dst, src, size);
		return Uint8Array(typed_memory_view(size, dst));
	}

	void seek(int32_t timestamp)
	{
		auto od_res = stream->Seek(static_cast<int64_t>(timestamp));
		if_result_failure(od_res)
			printf("VideoWorker seek failed");
	}

private:
	VideoReaderStream *stream = nullptr;
	ISize size;
};

EMSCRIPTEN_BINDINGS(work)
{
	value_object<ISize>("ISize")
		.field("width", &ISize::width)
		.field("height", &ISize::height);

	class_<VideoWorker>("VideoWorker")
		.constructor<>()
		.function("load", &VideoWorker::load)
		.function("destroy", &VideoWorker::destroy)
		.function("getSize", &VideoWorker::getSize)
		.function("readNextFrame", &VideoWorker::readNextFrame, allow_raw_pointers())
		.function("seek", &VideoWorker::seek);
}