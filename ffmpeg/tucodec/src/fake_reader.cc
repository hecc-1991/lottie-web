#include "fake_reader.hh"
#include "platform.h"

#include "mem_frame.hh"


#if !PV_PLATFORM_WIN
#include <unistd.h>
#endif


namespace pulsevideo {

const int64_t kDEFAULT_DURATION = 2000;


    struct FakeVideoReader::Impl {

        int width = 0;
        int height = 0;
        int fps = 0;
        int64_t duration = 0;


        int frameStep = 0;
        
        int64_t frameCount = 0;

    };



    FakeVideoReader::FakeVideoReader()
    {
        getConfigValidator().InsertNumber("fps");
        getConfigValidator().InsertNumber("width");
        getConfigValidator().InsertNumber("height");
        getConfigValidator().InsertNumber("duration");
    }

    FakeVideoReader::~FakeVideoReader()
    {

    }



    Result<VideoReaderOpenDataPtr> FakeVideoReader::do_open_video(const Config& config)
    {


        //auto inputUrl = config.GetString("url");
        auto inputWidth = config.GetIntNumberOr("width", 640);
        auto inputHeight = config.GetIntNumberOr("height", 480);
        auto duration = config.GetIntNumberOr("duration", kDEFAULT_DURATION);
        auto fps = config.GetIntNumberOr("fps", 20);

        if (inputWidth <= 0 || inputHeight <= 0 || fps <= 0 || duration <= 0) {
            return RESULT_FOR(VideoReaderOpenDataPtr, ResultCode::INVALID_ARG);
        }




        auto impl = std::make_unique<Impl>();
        impl->width = inputWidth;
        impl->height = inputHeight;
        impl->fps = fps;
        impl->duration = duration;

        auto tag = std::make_unique<VideoFrameTag>(VideoFormat::kARGB, impl->width, impl->height);


        VideoReaderOpenDataPtr odp = std::make_shared<VideoReaderOpenData>();
        odp->duration = duration;
        odp->tag = std::move(tag);
        odp->frame_rate = impl->fps;//track.nominalFrameRate;

        impl_ = std::move(impl);

        return odp;

    }
    VoidResult FakeVideoReader::do_close()
    {
        return {};
    }
 
    IntResult FakeVideoReader::do_seek(int64_t ts)
    {

        impl_->frameCount = ts / (1000.0 / impl_->fps);
        int64_t ret = impl_->frameCount * (1000.0 / impl_->fps);
        return ret;
    }
 
    Result<VideoFramePtr> FakeVideoReader::do_read_next_video_frame()
    {
        int64_t pts = impl_->frameCount * (1000.0 / impl_->fps);
        if (pts > GetDuration())
            return RESULT_FOR(VideoFramePtr,  ResultCode::END);

        auto retFrame = MakeVideoFrame<VideoMemStub>(GetVideoFrameTag(), pts);
        auto memstub = retFrame->GetStub<VideoMemStub>();
        impl_->frameCount++;

#if !PV_PLATFORM_WIN
        sleep(1);
#endif

        return retFrame;
    }






    struct FakeAudioReader::Impl {

        int channels = 0;
        int sampleRate = 0;
        int sampleCount = 0;
        int64_t duration = 0;



        int64_t frameCount = 0;

    };


    FakeAudioReader::FakeAudioReader()
    {

        getConfigValidator().InsertNumber("sample-rate");
        getConfigValidator().InsertNumber("sample-count");
        getConfigValidator().InsertNumber("channels");
        getConfigValidator().InsertNumber("duration");

    }

    FakeAudioReader::~FakeAudioReader()
    {


    }



    Result<AudioReaderOpenDataPtr> FakeAudioReader::do_open_audio(const Config& config)
    {

        auto samplerate = config.GetIntNumberOr("sample-rate", 44100);
        auto channels = config.GetIntNumberOr("channels", 2);
        auto sampleCount = config.GetIntNumberOr("sample-count", 1024);
        auto duration = config.GetIntNumberOr("duration", kDEFAULT_DURATION);

        if (samplerate <= 0 || channels <= 0 || sampleCount <= 0 || duration <= 0) {
            return RESULT_FOR(VideoReaderOpenDataPtr, ResultCode::INVALID_ARG);
        }



        auto impl = std::make_unique<Impl>();

        impl->sampleCount = sampleCount;
        impl->sampleRate = samplerate;
        impl->channels = channels;
        impl->duration = duration;


        auto tag = std::make_unique<AudioFrameTag>(AudioFormat::kS16, impl->channels, impl->sampleRate, impl->sampleCount);


        AudioReaderOpenDataPtr odp = std::make_shared<AudioReaderOpenData>();
        odp->duration = duration;
        odp->tag = std::move(tag);
       

        impl_ = std::move(impl);

        return odp;
    }


    VoidResult FakeAudioReader::do_close()
    {

        return {};
    }


    IntResult FakeAudioReader::do_seek(int64_t ts)
    {
        int64_t pos = ts / 1000.0 * impl_->sampleRate;
        impl_->frameCount = pos / impl_->sampleCount * impl_->sampleCount;

        int64_t ret = impl_->frameCount * 1000 / impl_->sampleRate;
        return ret;
    }

    Result<AudioFramePtr> FakeAudioReader::do_read_next_audio_frame()
    {
        int64_t pts = impl_->frameCount * 1000.0 / impl_->sampleRate;
        if (pts > GetDuration())
            return RESULT_FOR(AudioFramePtr,  ResultCode::END);

        auto retFrame = MakeAudioFrame<AudioMemStub>(GetAudioFrameTag(), pts);
        auto memstub = retFrame->GetStub<AudioMemStub>();
        impl_->frameCount += impl_->sampleCount;

        return retFrame;
    }




}
