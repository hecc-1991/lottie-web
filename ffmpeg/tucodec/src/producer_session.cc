#include "producer_session.hh"

#include <cassert>

namespace pulsevideo {



ProducerSession::~ProducerSession() noexcept {
    assert(GetState() == ProducerSessionState::kDEAD);
}

BoolResult ProducerSession::Initialize(ProducerParam& param)
{
    if (!testState(ProducerSessionState::kINIT)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }
    
    if (!audio_stream_ || !video_stream_)
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    
    auto res = do_start(param);
    RETURN_ON_FAILURE(res);
    
    setState(ProducerSessionState::kREADY);
    return true;
}

VoidResult ProducerSession::Finalize()
{
    if (!testStates({ProducerSessionState::kREADY, ProducerSessionState::kWRITING, ProducerSessionState::kCANCELLED})) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }
    
    auto res = do_stop();
    RETURN_ON_FAILURE(res);
    setState(ProducerSessionState::kDEAD);
    return {};
}

BoolResult ProducerSession::Run()
{
    if (!testState(ProducerSessionState::kREADY)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }
    
    auto res = do_run();
    RETURN_ON_FAILURE(res);
    
    setState(ProducerSessionState::kWRITING);
    return true;
}


//BoolResult Pause();
VoidResult ProducerSession::Cancel()
{
    if (!testState(ProducerSessionState::kWRITING)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }
    
    auto res = do_cancel();
    RETURN_ON_FAILURE(res);
    
    setState(ProducerSessionState::kCANCELLED);
    return {};
}



BoolResult ProducerSession::SetVideoStream(VideoStreamPtr stream)
{
    if (!testState(ProducerSessionState::kINIT)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }
    
    if (!stream)
        return MakeResultFor(ResultCode::INVALID_ARG);
    
    video_stream_ = stream;
    return true;
}

BoolResult ProducerSession::SetAudioStream(AudioStreamPtr stream)
{
    if (!testState(ProducerSessionState::kINIT)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }
    
    if (!stream)
        return MakeResultFor(ResultCode::INVALID_ARG);
    
    audio_stream_ = stream;
    return true;
}






}
