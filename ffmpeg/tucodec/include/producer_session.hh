#ifndef PULSEVIDEO_PRODUCER_HH_
#define PULSEVIDEO_PRODUCER_HH_

//#include "result.hh"
#include "stateful.hh"
#include "config_new.hh"
#include "stream.hh"

namespace pulsevideo {




enum class ProducerStatus {

    kREADY,
    kWRITTING,
    kEND,
    kAUDIO_END,
    kVIDEO_END,
    kPAUSED,
    kDO_START,
    kDO_PAUSE,
    kDO_RESUME,
    kDO_STOP,
};



DEFINE_STATE_BEGIN(ProducerSession)
STATE_ITEM(kREADY)
STATE_ITEM(kWRITING)
STATE_ITEM(kEND)
//STATE_ITEM(kPAUSED)
STATE_ITEM(kCANCELLED)
STATE_ITEM(kDEAD)
DEFINE_STATE_END(ProducerSession)



struct ProducerParam {


    std::string path;
};


class ProducerSession : //public ConfigValidator,
                        public Stateful,
                        public Makable<ProducerSession>
{

public:
    ProducerSession() = default;
    virtual ~ProducerSession() noexcept;
    DISABLE_COPY_AND_ASSIGN(ProducerSession);

    
    BoolResult Initialize(ProducerParam& param);
    VoidResult Finalize();

    BoolResult Run();
    //BoolResult Wait();
    //BoolResult Pause();
    VoidResult Cancel();



    BoolResult SetVideoStream(VideoStreamPtr stream);
    BoolResult SetAudioStream(AudioStreamPtr stream);






protected:

    virtual BoolResult do_start(ProducerParam& param) = 0;
    virtual VoidResult do_stop() = 0;


    virtual BoolResult do_run() = 0;
    virtual VoidResult do_cancel() = 0;

protected:
    
    VideoStreamPtr& getVideoStream() {
        return video_stream_;
    }
    
    AudioStreamPtr& getAudioStream() {
        return audio_stream_;
    }
    
    const std::string& getPath() {
        return path_;
    }
    
    void setPath(std::string path) {
        path_ = path;
    }

private:

    
    VideoStreamPtr video_stream_;
    AudioStreamPtr audio_stream_;
    
    std::string path_;
};














}





#endif
