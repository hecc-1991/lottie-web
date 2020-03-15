#ifndef PULSEVIDEO_AUDIO_STREAM_H_
#define PULSEVIDEO_AUDIO_STREAM_H_

#include "stream.hh"
#include "avreader.hh"

namespace pulsevideo {

class AudioReaderStream final: public AudioStream {

    //friend class AudioStream;// Makable<AudioStream>;
    friend class Makable<Stream>;
//protected:
    
public:
    AudioReaderStream(StreamContext& ctx);// = default;
    virtual ~AudioReaderStream() noexcept;

protected:

    virtual Result<AudioStreamOpenDataPtr> do_audio_stream_open(const Config& config) override;
    virtual VoidResult do_audio_stream_close() override;

    //virtual IntResult do_video_stream_seek(int64_t ts, int64_t pos) override;
    virtual Result<AudioFramePtr> do_audio_stream_read_frame(int64_t ts, int64_t pos, bool seeked) override;


private:

    std::unique_ptr<AudioReader> reader_;
    std::string url_;
    

    //AudioFramePtr silence_tailer_;
};

}

#endif
