#ifndef PULSEVIDEO_FRAME_H_
#define PULSEVIDEO_FRAME_H_

#include <cstdint>
#include <memory>
#include <map>
#include <set>
#include <vector>
#include <mutex>
#include <limits>

#include "base.hh"
#include "codec.hh"
#include "util.hh"
#include "result.hh"
#include "config_new.hh"
#include "stateful.hh"
//#include "session.hh"
#include "time_value.hh"
#include "frame_stub.hh"

//#define ENABLE_FFMPEG 1

namespace pulsevideo {


typedef uint64_t FrameFlag;

//constexpr auto kINVALID_TS = std::numeric_limits<int64_t>::min();



struct FrameTag {

    FrameTag(MediaType t) : mediaType(t) {}
    DISABLE_COPY_AND_ASSIGN(FrameTag);

    MediaType mediaType {MediaType::kNONE};
    //std::string Name;
};

using FrameTagPtr = SPtr<FrameTag>;
using FrameTagUPtr = UPtr<FrameTag>;


class Frame;
using FramePtr = SPtr<Frame>;

//class VideoFrame;
//class AudioFrame;


//template <typename T, typename std::enable_if_t<std::is_base_of_v<Frame, T>>, typename... ARGS>
//template <typename T, typename... ARGS>
//std::shared_ptr<T> MakeFrame(ARGS&&... args) {
//    return std::make_shared<T>(std::forward<ARGS>(args)...);
//}



class Frame : public std::enable_shared_from_this<Frame> {


public:
    
    
    Frame(const FrameTag& tag, int64_t ts = kINVALID_TS) : tag_(tag), timestamp_(ts) {}
    Frame(const FrameTag& tag, FrameStubPtr stub, int64_t ts = kINVALID_TS): tag_(tag), timestamp_(ts), stub_(stub) {}

    //virtual ~Frame() noexcept = default;
    DISABLE_COPY_AND_ASSIGN(Frame);


    inline int64_t GetTimestamp() const {
        return timestamp_;
    }
    inline void UpdateTimestamp(int64_t pts) {
        timestamp_ = pts;
    }
    
    template<typename T,
             typename = std::enable_if_t<std::is_base_of_v<Frame, T>>>
    SPtr<T> CastTo() {
        return std::static_pointer_cast<T>(shared_from_this());
    }
    
    

//    inline bool IsValid() const {
//        return is_valid_;
//    }

    inline const FrameTag& GetTag() const {
        return tag_;
    }

    inline FrameStubPtr GetStub() const {
        return stub_;
    }
    
    template <typename T>
    std::shared_ptr<T> GetStub() const {
        return std::static_pointer_cast<T>(stub_);
    }
    
    
    
    
//    inline const std::set<int>& GetFromStream() const {
//        return from_streams_;
//    }
//
//    inline void SetFromStream(std::set<int> fs) {
//        from_streams_ = std::move(fs);
//    }

protected:

    inline void setTimestamp(int64_t pts) {
        timestamp_ = pts;
    }
    //inline void setTimespan(int64_t tspan) {
    //    timespan_ = tspan;
    //}

//    inline void AddFromStream(int id) {
//        from_streams_.insert(id);
//    }

//    inline void setValid(bool v = true) {
//        is_valid_ = v;
//    }
    
    inline void setStub(FrameStubPtr stub) {
        stub_ = stub;
    }
    
    

private:

    const FrameTag& tag_;


    int64_t timestamp_{0};
    //int64_t timespan_ {0};
    //std::set<int> from_streams_;
    //bool is_valid_ {false};
    
    FrameStubPtr stub_;

};


struct VideoFrameTag : public FrameTag {

    VideoFrameTag(VideoFormat fmt, int w, int h)
        : FrameTag(MediaType::kVIDEO), format(fmt), width(w), height(h) {}
    


    VideoFormat format {VideoFormat::kNONE};
    int width {0};
    int height {0};

};

using VideoFrameTagPtr = std::shared_ptr<VideoFrameTag>;


class VideoFrame: public Frame {

public:

//    VideoFrame(const VideoFrameTag& tag, int64_t ts) :
//        Frame(static_cast<const FrameTag&>(tag), ts) {}
    
    VideoFrame(const VideoFrameTag& tag, FrameStubPtr stub, int64_t ts = kINVALID_TS) :
    Frame(static_cast<const FrameTag&>(tag), stub, ts) {}

    //VideoFrame(const VideoFrameTagPtr& tag, FrameStubPtr stub, int64_t ts, const std::set<int>& from) :
    //    Frame(std::static_pointer_cast<FrameTag>(tag), stub, ts, from) {}
    //VideoFrame(int64_t ts, int64_t dur, const VideoFrameTagPtr tp);
    //virtual ~VideoFrame() = default;
    inline const VideoFrameTag& GetVideoTag() const {
        return static_cast<const VideoFrameTag&>(GetTag());
    }
    
    inline int GetWidth() const {
        return GetVideoTag().width;
    }

    inline int GetHeight() const {
        return GetVideoTag().height;
    }

    inline VideoFormat GetFormat() const {
        return GetVideoTag().format;
    }

    

private:


};

struct AudioFrameTag : public FrameTag {

    AudioFrameTag(AudioFormat fmt, int nc, int sr, int fs)
        :FrameTag(MediaType::kAUDIO), format(fmt), channels(nc), sampleRate(sr), sampleCount(fs) {}


    AudioFormat format{AudioFormat::kNONE};
    int channels {0};
    int sampleRate {0};
    int sampleCount {0};

};

using AudioFrameTagPtr = std::shared_ptr<AudioFrameTag>;


class AudioFrame: public Frame {

public:
//    AudioFrame(const AudioFrameTag& tag, int64_t ts) :
//        Frame(static_cast<const FrameTag&>(tag), ts) {}
    
    AudioFrame(const AudioFrameTag& tag, FrameStubPtr stub, int64_t ts = kINVALID_TS) :
           Frame(static_cast<const FrameTag&>(tag), stub, ts) {}

    //AudioFrame(const AudioFrameTagPtr& tag, FrameStubPtr stub, int64_t ts, const std::set<int>& from) :
    //    Frame(std::static_pointer_cast<FrameTag>(tag), stub, ts, from) {}
    //AudioFrame(const AudioFrameTagPtr& tag, FrameStubPtr stub, int64_t ts) :
    //    Frame(std::static_pointer_cast<FrameTag>(tag), stub, ts) {}

    //virtual ~AudioFrame() = default;
    inline const AudioFrameTag& GetAudioTag() const {
        return static_cast<const AudioFrameTag&>(GetTag());
    }
    
    inline int GetSampleCount() const {
        return GetAudioTag().sampleCount;
    }

    inline int GetSampleRate() const {
        return GetAudioTag().sampleRate;
    }

    inline int GetChannels() const {
        return GetAudioTag().channels;
    }

	inline AudioFormat GetFormat() const {
		return GetAudioTag().format;
	}
    
    
};





using VideoFramePtr = std::shared_ptr<VideoFrame>;
using AudioFramePtr = std::shared_ptr<AudioFrame>;



template <typename T,
          typename = std::enable_if_t<std::is_base_of_v<FrameStub, T>>>
std::shared_ptr<VideoFrame> MakeVideoFrame(const VideoFrameTag& tag, int64_t ts = kINVALID_TS) {
    auto stub = std::make_shared<T>(tag);
    return std::make_shared<VideoFrame>(tag, std::static_pointer_cast<FrameStub>(stub), ts);
}



template <typename T,
          typename = std::enable_if_t<std::is_base_of_v<FrameStub, T>>>
std::shared_ptr<AudioFrame> MakeAudioFrame(const AudioFrameTag& tag, int64_t ts = kINVALID_TS) {
    auto stub = std::make_shared<T>(tag);
    return std::make_shared<AudioFrame>(tag, std::static_pointer_cast<FrameStub>(stub), ts);
}




SPtr<VideoFrame> DuplicateVideoFrame(SPtr<VideoFrame> src, int64_t newts = kINVALID_TS);

SPtr<AudioFrame> DuplicateVideoFrame(const SPtr<AudioFrame>& src, int64_t newts = kINVALID_TS);

}



#endif
