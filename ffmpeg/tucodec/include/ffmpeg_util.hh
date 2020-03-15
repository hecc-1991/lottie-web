#ifndef PULSEVIDEO_FFMPEG_UTIL_HH_
#define PULSEVIDEO_FFMPEG_UTIL_HH_

#include "util.hh"

extern "C" {
#include <libavformat/avformat.h>
//#include <libavcodec/avcodec.h>
//#include <libavutil/avutil.h>

//#include <libavutil/opt.h>
//#include <libavutil/channel_layout.h>
//#include <libavutil/samplefmt.h>
//#include <libswresample/swresample.h>
}



namespace pulsevideo {



class AVPacketGuard {

public:
    DISABLE_COPY_AND_ASSIGN(AVPacketGuard);
    AVPacketGuard(AVPacket* pkt) {
        avpkt_ = pkt;
    }
    ~AVPacketGuard() {
        av_packet_free(&avpkt_);
    }

    AVPacket* Release() {
        AVPacket* ret = avpkt_;
        avpkt_ = nullptr;
        return ret;
    }
private:
    AVPacket* avpkt_{ nullptr };

};



class AVFrameGuard {

public:
    DISABLE_COPY_AND_ASSIGN(AVFrameGuard);
    AVFrameGuard(AVFrame* frame) {
        avframe_ = frame;
    }
    ~AVFrameGuard() {
        av_frame_free(&avframe_);
    }

    AVFrame* Release() {
        AVFrame* ret = avframe_;
        avframe_ = nullptr;
        return ret;
    }

private:
    AVFrame* avframe_{ nullptr };

};








}



#endif /* PULSEVIDEO_FFMPEG_UTIL_HH_ */
