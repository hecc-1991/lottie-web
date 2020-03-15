#ifndef PULSEVIDEO_STREAM_H_
#define PULSEVIDEO_STREAM_H_

#include <limits>
#include <memory>

//#include "defines.h"
#include "base.hh"
#include "result.hh"
#include "frame.hh"
#include "stateful.hh"
#include "makable.hh"
#include "context.hh"


namespace pulsevideo {


enum : int64_t {
    kNEXT_TS = -1,
    kPREV_TS = -2,
};


///////////////////////////////////////////////////

struct StreamOpenData {
    FrameTagUPtr tag;
    int64_t duration {0};
};


struct VideoStreamOpenData : StreamOpenData {
    ///////
    //int framerate_num {0};
    //int framerate_den {0};
    double framerate {0};
};


struct AudioStreamOpenData : StreamOpenData {
    ///////
    //int64_t sampleCount{0};
};


using VideoStreamOpenDataPtr = SPtr<VideoStreamOpenData>;
using AudioStreamOpenDataPtr = SPtr<AudioStreamOpenData>;
using StreamOpenDataPtr = SPtr<StreamOpenData>;

class Stream;
class VideoStream;
class AudioStream;
using StreamPtr = SPtr<Stream>;
using VideoStreamPtr = SPtr<VideoStream>;
using AudioStreamPtr = SPtr<AudioStream>;



DEFINE_STATE_BEGIN(Stream)
STATE_ITEM(kRUNNING)
DEFINE_STATE_END(Stream)

class Stream : public Stateful,
               public Configurable,
               public Makable<Stream>
               
{
    

public:
    Stream(StreamContext& ctx, MediaType mt)
    : context_(ctx), mtype_(mt) {}
    virtual ~Stream() noexcept;
    DISABLE_COPY_AND_ASSIGN(Stream);
    
    
    
    BoolResult Open();
    BoolResult Open(const Config& config);
    VoidResult Close();
    
    IntResult Seek(int64_t pts);
    Result<FramePtr> ReadFrame(int64_t pts = kNEXT_TS);
    Result<FramePtr> ReadNextFrame();
    
    
    inline StreamContext& GetContext() {
        return context_;
    }
    
    inline MediaType GetMediaType() const {
        return mtype_;
    }
    
    inline int64_t GetCurrent() const {
        return current_;
    }
    
    inline int64_t GetDuration() const {
        return duration_;
    }
    
    inline const FrameTag& GetFrameTag() const {
        return *tag_;
    }
    
private:
    
    
    virtual Result<StreamOpenDataPtr> do_stream_open(const Config& config) = 0;
    virtual VoidResult do_stream_close() = 0;
    virtual IntResult do_stream_seek(int64_t ts) = 0;
    virtual Result<FramePtr> do_stream_read_frame(int64_t pts) = 0;
    
protected:
    
    bool setFrameTag(FrameTagUPtr&& tag);
    
    
    inline void setCurrent(int64_t ts) {
        current_ = ts;
    }
    
    inline void setDuration(int64_t ts) {
        duration_ = ts;
    }
    
    
private:
    
    FrameTagUPtr tag_;
    StreamContext& context_;
    MediaType mtype_ {MediaType::kNONE};
    int64_t current_ {0};
    int64_t duration_ {0};
};


class VideoStream : public Stream {
    
public:
    VideoStream(StreamContext& ctx) : Stream(ctx, MediaType::kVIDEO) {}
    virtual ~VideoStream() noexcept;// = default;
    
    inline double GetFramerate() const {
        return framerate_;
    }
    
    inline int GetWidth() const {
        return GetVideoFrameTag().width;
    }
    
    inline int GetHeight() const {
        return GetVideoFrameTag().height;
    }
    
    inline const VideoFrameTag& GetVideoFrameTag() const {
        return static_cast<const VideoFrameTag&>(GetFrameTag());
    }
    
protected:
    
    virtual Result<StreamOpenDataPtr> do_stream_open(const Config& config) override;
    virtual VoidResult do_stream_close() override;
    virtual IntResult do_stream_seek(int64_t ts) override;
    virtual Result<FramePtr> do_stream_read_frame(int64_t ts) override;
    
    virtual Result<VideoStreamOpenDataPtr> do_video_stream_open(const Config& config) = 0;
    virtual VoidResult do_video_stream_close() = 0;
    virtual Result<VideoFramePtr> do_video_stream_read_frame(int64_t ts, int64_t pos, bool seeked) = 0;
    
    
    inline int64_t adjustTimestamp(int64_t ts) {
        return posToTimestamp(timestampToPos(ts));
    }
    inline int64_t posToTimestamp(int64_t pos) {
        return pos * (1 / framerate_) * 1000;
    }
    inline int64_t timestampToPos(int64_t ts) {
        return (double)ts / (1 / framerate_) / 1000;
    }
    
    static int64_t adjustDuration(int64_t dur, double fps) {
        return (int64_t)(fps * dur / 1000) * (1000 / fps);
    }
    static int64_t adjustTimestamp(int64_t ts, double fps) {
        return (int64_t)(fps * ts / 1000) * (1000 / fps);
    }
    
//    const VideoFrameTag& getVideoFrameTag() const {
//        return static_cast<const VideoFrameTag&>(GetFrameTag());
//    }
    
    double framerate_ {0};
    int64_t prev_frame_pos_ {std::numeric_limits<int64_t>::min()};
    int64_t frame_pos_ {0};
    
};



class AudioStream : public Stream {
    
public:
    AudioStream(StreamContext& ctx)
    : Stream(ctx, MediaType::kAUDIO) {}
    virtual ~AudioStream() noexcept;
    
    inline int64_t GetSampleCount() const {
        return sample_count_;
    }
    inline int GetSampleRate() const {
        return sample_rate_;
    }
    inline int GetChannels() const {
        return channels_;
    }
    inline int64_t GetSampleCurrent() const {
        return sample_current_;
    }
    
    const AudioFrameTag& GetAudioFrameTag() const {
        return static_cast<const AudioFrameTag&>(GetFrameTag());
    }
    
protected:
    
    virtual Result<StreamOpenDataPtr> do_stream_open(const Config& config) override;
    virtual VoidResult do_stream_close() override;
    virtual IntResult do_stream_seek(int64_t ts) override;
    virtual Result<FramePtr> do_stream_read_frame(int64_t ts) override;
    
    virtual Result<AudioStreamOpenDataPtr> do_audio_stream_open(const Config& config) = 0;
    virtual VoidResult do_audio_stream_close() = 0;
    //virtual IntResult do_audio_stream_seek(int64_t ts, int64_t pos) = 0;
    virtual Result<AudioFramePtr> do_audio_stream_read_frame(int64_t ts, int64_t pos, bool seeked) = 0;
    
    
    
    inline int64_t samplesToTimestamp(int64_t sc) {
        return sc * 1000 / sample_rate_;
    }
    
    inline int64_t timestampToSamples(int64_t ts) {
        return ts * sample_rate_ / 1000;
    }
    
    inline int64_t adjustTimestamp(int64_t ts) {
        return ts * sample_rate_ / sample_count_ * sample_count_ / sample_rate_;
    }
    
    static int64_t samplesToTimestamp(int64_t spos, int64_t sample_rate) {
        return spos * 1000 / sample_rate;
    }
    
    static int64_t timestampToSamples(int64_t ts, int64_t sample_rate) {
        return ts * sample_rate / 1000;
    }
    
    static int64_t adjustDuration(int64_t dur, int sample_rate, int sample_count) {
        return dur * sample_rate / sample_count * sample_count / sample_rate;
    }
    static int64_t adjustTimestamp(int64_t ts, int sample_rate, int sample_count) {
        return ts * sample_rate / sample_count * sample_count / sample_rate;
    }
    
//    const AudioFrameTag& getAudioFrameTag() const {
//        return static_cast<const AudioFrameTag&>(GetFrameTag());
//    }
    
    //    inline int64_t getPrevSamplePos() const {
    //        return prev_sample_pos_;
    //    }
    
    //    inline bool testAfterSeek() const {
    //        return prev_sample_pos_ != sample_pos_ && //skip first frame
    //               sample_pos_ != prev_sample_pos_ + sample_count_;
    //    }
    
    //private:
    
    
    int64_t prev_sample_pos_ {std::numeric_limits<int64_t>::min()};
    int64_t sample_pos_ {0};
    int64_t sample_current_ {0};
    int64_t sample_count_ {1024};
    int sample_rate_ {44100};
    int channels_ {0};
    
};






}


#endif
