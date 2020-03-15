
#include "audio_stream.hh"

#include "log.hh"

#include "mem_frame.hh"

#include "ffmpeg_reader.hh"
#include "fake_reader.hh"


namespace pulsevideo {



AudioReaderStream::AudioReaderStream(StreamContext& ctx) : AudioStream(ctx)
{
    getConfigValidator().InsertString("url", true);
    getConfigValidator().InsertNumber("sample-rate");
    getConfigValidator().InsertNumber("channels");
    getConfigValidator().InsertNumber("sample-count");

}

AudioReaderStream::~AudioReaderStream() noexcept = default;


Result<AudioStreamOpenDataPtr> AudioReaderStream::do_audio_stream_open(const Config& config)
{
   
    
    auto url = config.GetString("url");
    int sample_rate = config.GetIntNumberOr("sample-rate", 44100);
    int channels = config.GetIntNumberOr("channels", 2);
    int sample_count = config.GetIntNumberOr("sample-count", 1024);
    
    
    if (sample_rate <= 0 || channels <= 0 || sample_count <= 0) {
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    }

	Config areader_cfg;
	areader_cfg.SetString("url", url);
	areader_cfg.SetNumber("channels", channels);
	areader_cfg.SetNumber("sample-rate", sample_rate);
	areader_cfg.SetNumber("sample-count", sample_count);
    //areader_cfg.SetNumber("duration", 7000);
    
    reader_ = std::make_unique<FFmpegAudioReader>();
    //reader_ = std::make_unique<FakeAudioReader>();
    if (!reader_) {
        return MakeResultFor(ResultCode::FAILURE, _RMSG("AcquireReader()"));
    }
    auto res = reader_->Open(areader_cfg);
    if_result_failure(res) {
        return res;
    }

    sample_rate = reader_->GetSampleRate();
    channels = reader_->GetChannels();
    sample_count = reader_->GetSampleCount();

    int64_t real_duration = reader_->GetDuration();
    int64_t duration = adjustDuration(real_duration, sample_rate, sample_count);
    
    auto tag = std::make_unique<AudioFrameTag>(AudioFormat::kS16, channels, sample_rate, sample_count);

    ///
    auto odp = std::make_shared<AudioStreamOpenData>();
    odp->tag = std::move(tag);
    odp->duration = duration;
    
    //silence_tailer_ = MakeFrame<AudioMemFrame>(tag, 0);

    return odp;
}

VoidResult AudioReaderStream::do_audio_stream_close()
{
    reader_->Close();
    reader_.reset();
    return {};
}

Result<AudioFramePtr> AudioReaderStream::do_audio_stream_read_frame(int64_t ts, int64_t pos, bool seeked)
{
    
    if (seeked) {
        auto res = reader_->SeekTo(ts);
        if_result_failure(res) {
            return MakeResultFor(ResultCode::END, _RMSG("avassetReader seek failure"));
        }
    }
    
    auto frame_res = reader_->ReadNextFrame();
    if_result_failure(frame_res) {
        return MakeResultFor(ResultCode::END);
    }
    
    auto frame = std::static_pointer_cast<AudioFrame>(*frame_res);
    frame->UpdateTimestamp(ts);
    
    return frame;
}



}
