#ifndef PULSEVIDEO_AV_READER_H_
#define PULSEVIDEO_AV_READER_H_


#include <map>
#include <memory>
#include <chrono>


#include "result.hh"
#include "util.hh"
#include "config_new.hh"
#include "base.hh"
#include "frame.hh"
#include "stateful.hh"
#include "makable.hh"


namespace pulsevideo {
//
//using TokenType = void*;
//
//using KeyMap = Config;


struct AVReaderOpenData {
    FrameTagUPtr tag;
    int64_t duration {0};
};

struct AudioReaderOpenData : AVReaderOpenData {
    //int channels {0};
    //int sample_rate {0};
    //int sample_count {0};
    //int64_t duration{0};
};

struct VideoReaderOpenData : AVReaderOpenData {
    //int width {0};
    //int height {0};
    double frame_rate {0};
    //int64_t duration{0};
};

using AVReaderOpenDataPtr = std::shared_ptr<AVReaderOpenData>;
using AudioReaderOpenDataPtr = std::shared_ptr<AudioReaderOpenData>;
using VideoReaderOpenDataPtr = std::shared_ptr<VideoReaderOpenData>;


DEFINE_STATE_BEGIN(AVReader)
STATE_ITEM(kRUNNING)
STATE_ITEM(kDEAD)
DEFINE_STATE_END(AVReader)

class AVReader : public Stateful,
                 public Configurable,
                 public Makable<AVReader>
{

friend class AVReaderPool;
public:
    
    
//
//    template <typename T, typename... ARGS>
//    static std::enable_if_t<std::is_base_of_v<AVReader, T>, SPtr<T>> Make(ARGS&&... args) {
//        return MakeShared<T>(std::forward<ARGS>(args)...);
//    }
//
    
    
    AVReader(MediaType type);
    virtual ~AVReader() noexcept;
    DISABLE_COPY_AND_ASSIGN(AVReader);

    BoolResult Open(const Config& config);
    VoidResult Close();
    IntResult SeekTo(int64_t ts);
    Result<FramePtr> ReadNextFrame();

//    TokenType GetToken() const {
//        return token_;
//    }
//    inline bool IsNewCreated() const {
//        return new_;
//    }
    
    inline const FrameTag& GetFrameTag() const {
        return *tag_;
    }

    

    inline int64_t GetDuration() const {
        return duration_;
    }

protected:
    bool setFrameTag(FrameTagUPtr&& tag);
    inline void setDuration(int64_t dur) {
        duration_ = dur;
    }


//    inline void setNotNew() {
//        new_ = false;
//    }
//
//    inline void tick() {
//        tick_ = std::chrono::steady_clock::now();
//    }
//
//    inline std::chrono::steady_clock::time_point getTick() {
//        return tick_;
//    }

private:

    virtual BoolResult do_open(const Config& config) = 0;
    virtual VoidResult do_close() = 0;
    virtual IntResult do_seek(int64_t ts) = 0;
    virtual Result<FramePtr> do_read_next_frame() = 0;

private:

    MediaType type_ {MediaType::kNONE};
    //TokenType token_;

    //bool new_ {true};
    ////int64_t score_ {0};
    //std::chrono::steady_clock::time_point tick_;

    std::unique_ptr<FrameTag> tag_;
    int64_t duration_ {0};

};

using AVReaderPtr = std::shared_ptr<AVReader>;



class VideoReader : public AVReader {

public:

    VideoReader() : AVReader(MediaType::kVIDEO) {}
    virtual ~VideoReader() = default;

    inline const VideoFrameTag& GetVideoFrameTag() const {
        return static_cast<const VideoFrameTag&>(GetFrameTag());
    }
    
    inline int GetWidth() const {
        return GetVideoFrameTag().width;
    }

    inline int GetHeight() const {
        return GetVideoFrameTag().height;
    }
    

private:

    virtual BoolResult do_open(const Config& config) override;
    virtual Result<FramePtr> do_read_next_frame() override;

    virtual Result<VideoReaderOpenDataPtr> do_open_video(const Config& config) = 0;
    virtual Result<VideoFramePtr> do_read_next_video_frame() = 0;


};



class AudioReader : public AVReader {
    
public:
    
    AudioReader() : AVReader(MediaType::kAUDIO) {}
    ~AudioReader() = default;
    
    inline const AudioFrameTag& GetAudioFrameTag() const {
        return static_cast<const AudioFrameTag&>(GetFrameTag());
    }
    
    inline int GetSampleCount() const {
        return GetAudioFrameTag().sampleCount;
    }
    
    inline int GetSampleRate() const {
        return GetAudioFrameTag().sampleRate;
    }
    
    inline int GetChannels() const {
        return GetAudioFrameTag().channels;
    }
    
private:
    
    virtual BoolResult do_open(const Config& config) override;
    virtual Result<FramePtr> do_read_next_frame() override;
    
    virtual Result<AudioReaderOpenDataPtr> do_open_audio(const Config& config) = 0;
    virtual Result<AudioFramePtr> do_read_next_audio_frame() = 0;
    
};
    
    



}







#endif
