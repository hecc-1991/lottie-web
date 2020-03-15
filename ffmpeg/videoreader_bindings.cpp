#include "video_stream.h"
#include <emscripten.h>
#include <emscripten/bind.h>

using namespace std;
using namespace emscripten;

class VideoReader{
	public:
	VideoReader(){}
	~VideoReader(){}

	int load(std::string path,int frameRate){
		int ret = 0;
		stream = new VideoReaderStream();
		auto od_res = stream->do_video_stream_open(path,frameRate);
    	/* if_result_failure(od_res) {
        	ret = -1;
    	}  */
		return ret;
	}

	int destroy(){
		int ret = 0;
		auto od_res = stream->do_video_stream_close();
		if(stream){
		delete stream;
		}
    	/* if_result_failure(od_res) {
        	ret = -1;
    	}  */
		return 0;
	}	

	int readFrame(float time){
		int ret = 0;
		auto od_res = stream->do_video_stream_read_frame(time);
    	/* if_result_failure(od_res) {
        	ret = -1;
    	}  */
		return ret;
	}

	private:
	VideoReaderStream *stream = nullptr;
};

EMSCRIPTEN_BINDINGS(work){
	class_<VideoReader>("VideoReader")
	.constructor<>()
	.function("load",&VideoReader::load)
	.function("destroy",&VideoReader::destroy)
	.function("readFrame",&VideoReader::readFrame);
	
}