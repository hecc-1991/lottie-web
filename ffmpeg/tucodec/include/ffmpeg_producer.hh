#ifndef PULSEVIDEO_FFMPEG_PRODUCER_HH_
#define PULSEVIDEO_FFMPEG_PRODUCER_HH_

#include "producer_session.hh"

#include <thread>
#include <mutex>
#include <condition_variable>


namespace pulsevideo {

class FFmpegProducer : public ProducerSession {

    friend class Makable<ProducerSession>;
    FFmpegProducer();// = default;
public:
    virtual ~FFmpegProducer() noexcept;
    
protected:
    
    virtual BoolResult do_start(ProducerParam& param) override;
    virtual VoidResult do_stop() override;


    virtual BoolResult do_run() override;
    virtual VoidResult do_cancel() override;


private:

    struct Impl;
    std::unique_ptr<Impl> impl_;

};


    
}






#endif
