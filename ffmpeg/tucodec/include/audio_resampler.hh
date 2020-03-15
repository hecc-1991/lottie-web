
#ifndef PULSEVIDEO_RESAMPLER_HH_
#define PULSEVIDEO_RESAMPLER_HH_

#include "result.hh"
#include "stateful.hh"
#include "config_new.hh"
#include "makable.hh"
#include "mem_frame.hh"

namespace pulsevideo {



class AudioSampleData {
    
public:
    AudioSampleData(AudioMemStubPtr stub);
    
//    template <typename T>
//    SPtr<T> GetStub() const {
//        return std::static_pointer_cast<T>(stub_);
//    }
    
    AudioMemStubPtr GetStub() {
        return stub_;
    }
    
    
    
private:
    
    
    AudioMemStubPtr stub_;
    
};

using AudioSampleDataPtr = SPtr<AudioSampleData>;



DEFINE_STATE_BEGIN(AudioResampler)
STATE_ITEM(kREADY)
//STATE_ITEM(kEND)
STATE_ITEM(kDEAD)
DEFINE_STATE_END(AudioResampler)



class AudioResampler : public Stateful,
                       public Configurable,
                       public Makable<AudioResampler>
{
    
public:
    AudioResampler();
    virtual ~AudioResampler();
    
    BoolResult Open(const Config& config);
    VoidResult Close();
    
    BoolResult SendSamples(AudioSampleDataPtr frame);
    Result<AudioSampleDataPtr> ReceiveSamples();
    
    
protected:
    
    virtual BoolResult do_open(const Config& config) = 0;
    virtual VoidResult do_close() = 0;
    
    virtual BoolResult do_send_samples(AudioSampleDataPtr frame) = 0;
    virtual Result<AudioSampleDataPtr> do_receive_samples() = 0;
    
    
    
    
};






class FFmpegAudioResampler : public AudioResampler {
    
    
public:
    FFmpegAudioResampler();
    ~FFmpegAudioResampler();
    
protected:
    
    virtual BoolResult do_open(const Config& config) override;
    virtual VoidResult do_close() override;
    
    virtual BoolResult do_send_samples(AudioSampleDataPtr frame) override;
    virtual Result<AudioSampleDataPtr> do_receive_samples() override;
    
    
    struct Impl;
    std::unique_ptr<Impl> impl_;
};





}



#endif /* PULSEVIDEO_RESAMPLER_HH_ */
