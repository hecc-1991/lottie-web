
#include "avreader.hh"

#include "log.hh"

#include <cassert>

namespace pulsevideo {





AVReader::AVReader(MediaType type): type_(type)
{
    getConfigValidator().InsertString("url", true);
}

AVReader::~AVReader() noexcept {
    assert(GetState() == AVReaderState::kDEAD);
}


bool AVReader::setFrameTag(FrameTagUPtr&& tag)
{
    if (!tag) {
        LOG_ERROR("empty FrameTag");
        std::terminate();
        return false;
    }
    if (type_ != tag->mediaType) {
        LOG_ERROR("MediaType not match");
        std::terminate();
        return false;
    }
    tag_ = std::move(tag);
    return true;
}

BoolResult AVReader::Open(const Config& config)
{
    if (!testState(AVReaderState::kINIT)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }

    if (!getConfigValidator().Validate(config)) {
        return MakeResultFor(ResultCode::INVALID_ARG);
    }

    setConfig(config);

    auto res = do_open(config);
    if_result_failure(res) {
        return res;
    }

    setState(AVReaderState::kRUNNING);
    return true;
}

VoidResult AVReader::Close()
{
    if (!testState(AVReaderState::kRUNNING)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }
    auto res = do_close();
    if_result_failure(res) {
        return res;
    }

    setState(AVReaderState::kDEAD);
    return {};
}

IntResult AVReader::SeekTo(int64_t ts)
{
    if (!testState(AVReaderState::kRUNNING)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }
    auto res = do_seek(ts);
    //if_result_failure(res) {
    //    return res;
    //}
    return res;
}

Result<FramePtr> AVReader::ReadNextFrame()
{
    if (!testState(AVReaderState::kRUNNING)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }
    auto res = do_read_next_frame();
    if_result_success(res) {
        if (res->GetTimestamp() > duration_)
            return MakeResultFor(ResultCode::END);
    }
    return res;
}





BoolResult VideoReader::do_open(const Config& config)
{
    auto odp_res = do_open_video(config);

    if_result_failure(odp_res) {
        return odp_res;
    }
    VideoReaderOpenDataPtr odp = *odp_res;
    
    if (!odp->tag || odp->duration <= 0) {
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    }

    auto& vtag = static_cast<VideoFrameTag&>(*odp->tag);
    if (vtag.width <= 0 || vtag.height <= 0) {
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    }

    setFrameTag(std::move(odp->tag));
    setDuration(odp->duration);
    //setFramerate(odp->frame_rate);

    return true;
}

Result<FramePtr> VideoReader::do_read_next_frame()
{
    auto frame_res = do_read_next_video_frame();
    return frame_res;
}


    
    
BoolResult AudioReader::do_open(const Config& config)
{
    auto odp_res = do_open_audio(config);
    if_result_failure(odp_res) {
        return odp_res;
    }
    AudioReaderOpenDataPtr odp = *odp_res;
    
    if (!odp->tag || odp->duration <= 0) {
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    }
    
    auto& atag = static_cast<AudioFrameTag&>(*odp->tag);
    if (atag.sampleRate <= 0 || atag.sampleCount <= 0 || atag.channels <= 0) {
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    }
        
        
    setFrameTag(std::move(odp->tag));
    setDuration(odp->duration);
        
    return true;
}
    
Result<FramePtr> AudioReader::do_read_next_frame()
{
    auto frame_res = do_read_next_audio_frame();
    return frame_res;
}


}
