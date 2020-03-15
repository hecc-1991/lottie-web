
#ifndef PULSEVIDEO_FRAME_MEM_H_
#define PULSEVIDEO_FRAME_MEM_H_
#include "frame.hh"

#include <cmath>
//#include <memory>

#if PV_PLATFORM_MACOS
#include <OpenGL/gl3.h>
#include <OpenGL/glext.h>
#elif PV_PLATFORM_WIN
//#include "glad/glad.h"
#endif



#define PV_ENABLE_FFMPEG 1

#if PV_ENABLE_FFMPEG
extern "C" {
#include <libavcodec/avcodec.h>
#include <libswscale/swscale.h>
#include <libswresample/swresample.h>
}
#endif



namespace pulsevideo {



	

class MemStub : public FrameStub {

public:
    MemStub(MediaType t) : type_(t) {}
    virtual ~MemStub() = default;
    DISABLE_COPY_AND_ASSIGN(MemStub);


    inline const uint8_t* GetData(size_t idx = 0) const {
        if (idx >= plane_count_)
            return nullptr;
        return planes_[idx];
    }

    inline uint8_t* GetMutableData(size_t idx = 0) {
        if (idx >= plane_count_)
            return nullptr;
        return planes_[idx];
    }

    inline size_t GetDataSize() const {
        return data_size_;
    }

    inline size_t GetStride(size_t idx = 0) const {
        if (idx >= plane_count_)
            return 0;
        return strides_[idx];
    }

    inline size_t GetVStride(size_t idx = 0) const {
        if (idx >= plane_count_)
            return 0;
        return vstrides_[idx];
    }

    inline size_t GetPlaneCount() const {
		return plane_count_;// static_cast<int>(plane_count_);
    }

protected:

	static const size_t kPlaneMaxCount = 4;

//private:
    MediaType type_ {MediaType::kNONE};
    std::unique_ptr<uint8_t[]> data_;
    size_t data_size_{0};
    uint8_t* planes_[kPlaneMaxCount] {0};
    size_t strides_[kPlaneMaxCount] {0};
    size_t vstrides_[kPlaneMaxCount] {0};
    size_t plane_count_{0};
};



class VideoMemStub : public MemStub {

public:
    //VideoMemStub() = default;
    //~VideoMemStub();
#if PV_ENABLE_FFMPEG
    
    AVFrame* ToAVFrame();
    
    BoolResult ToAVFrame(AVFrame* avframe);
    
    VideoMemStub(const AVFrame* avframe);
#endif
    VideoMemStub(const VideoFrameTag& tag);

    VideoMemStub(VideoFormat fmt, size_t width, size_t height);

    inline size_t GetWidth() const {
        return width_;
    }
    inline size_t GetHeight() const {
        return height_;
    }
    inline VideoFormat GetFormat() const {
        return format_;
    }
    

private:
    VideoFormat format_ {VideoFormat::kNONE};
    size_t width_ {0};
    size_t height_ {0};
};

class AudioMemStub : public MemStub {


public:
	//AudioMemStub() = default;
    //~AudioMemStub();
#if PV_ENABLE_FFMPEG
    AVFrame* ToAVFrame();
    BoolResult ToAVFrame(AVFrame* avframe);
    
    AudioMemStub(const AVFrame* avframe);
#endif
    
    AudioMemStub(const AudioFrameTag& tag);
    
    AudioMemStub(AudioFormat fmt, size_t channels, size_t sampleCount);


    inline size_t GetChannels() const {
        return channels_;
    }
    inline size_t GetSampleCount() const {
        return sample_count_;
    }
    inline AudioFormat GetFormat() const {
        return format_;
    }

private:

    AudioFormat format_ {AudioFormat::kS16};
    size_t channels_ {0};
    size_t sample_count_ {0};
};




using MemStubPtr = std::shared_ptr<MemStub>;
using VideoMemStubPtr = std::shared_ptr<VideoMemStub>;
using AudioMemStubPtr = std::shared_ptr<AudioMemStub>;





}
#endif
