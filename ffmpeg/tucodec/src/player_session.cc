//
//  player_session.cc
//  PulseVideo
//
//  Created by Zoeric on 2020/02/17.
//  Copyright © 2020 Zoeric. All rights reserved.
//
#include "player_session.hh"

#include <stdio.h>

#include "log.hh"

namespace pulsevideo
{

/// 下面 4 个 Evt 都是在 player_thread_ 线程执行的, 保证对 session.* 里的操作同步
/// audio buffer 缓冲完成
struct AudioReadyEvt : PlayerFunctorEvt
{
    AudioReadyEvt(PlayerSession &s)
        : PlayerFunctorEvt(s, [](PlayerSession &s) {
              auto &session = static_cast<PlayerSession &>(s);
              session.setAudioReady(true);
              if (session.isVideoReady())
              {
                  session.setFetchReady(true);
              }
              return true;
          }) {}
    //virtual BoolResult disposeAndReturn() override;
};

/// video  buffer 缓冲完成
struct VideoReadyEvt : PlayerFunctorEvt
{
    VideoReadyEvt(PlayerSession &s)
        : PlayerFunctorEvt(s, [](PlayerSession &s) {
              auto &session = static_cast<PlayerSession &>(s);
              session.setVideoReady(true);
              if (session.isAudioReady())
              {
                  session.setFetchReady(true);
              }
              return true;
          }) {}
};

/// audio 数据结束 EOS
struct FetchAudioEmptyEvt : PlayerFunctorEvt
{
    FetchAudioEmptyEvt(PlayerSession &s)
        : PlayerFunctorEvt(s, [](PlayerSession &s) {
              auto &session = static_cast<PlayerSession &>(s);
              session.setAudioDrained(true);
              LOG_ERROR("                 - -zzzz : A-eos");
              if (session.isVideoDrained())
              {
                  session.setFetchReady(false);
                  session.setState(PlayerSessionState::kREADY);
                  session.postPlayerEvent(PlayerStatus::kEOS, 0);
                  LOG_ERROR("                 - -zzzz : A-EOS");
              }
              return true;
          }) {}
};

/// video 数据结束 EOS
struct FetchVideoEmptyEvt : PlayerFunctorEvt
{
    FetchVideoEmptyEvt(PlayerSession &s)
        : PlayerFunctorEvt(s, [](PlayerSession &s) {
              auto &session = static_cast<PlayerSession &>(s);
              session.setVideoDrained(true);
              LOG_ERROR("                 - -zzzz : V-eos");
              if (session.isAudioDrained())
              {
                  session.setFetchReady(false);
                  session.setState(PlayerSessionState::kREADY);
                  session.postPlayerEvent(PlayerStatus::kEOS, 0);
                  LOG_ERROR("                 - -zzzz : V-EOS");
              }
              return true;
          }) {}
};

BoolResult AVProcessor::Start()
{

    thread_ = std::thread(std::bind(&AVProcessor::do_real_work, this));
    LOG_DEBUG("AVProcessor [%d] started", getType());
    return true;
}

VoidResult AVProcessor::Stop()
{

    {
        std::unique_lock<std::mutex> lg(lock_);
        should_exit_ = true;
        cond_.notify_one();
    }
    thread_.join();
    LOG_DEBUG("AVProcessor [%d] stopped", getType());
    return {};
}

BoolResult AVProcessor::Reset()
{

    return do_reset();
    //return true;
}

void AVProcessor::DequeueFramesBefore(int64_t pts)
{
    /// 丢弃时间戳太旧的 frame
    const int diff = 50;
    {
        std::unique_lock<std::mutex> lg(lock_);

        while (out_que_.size() > 1)
        {
            auto &f = out_que_.front();
            if (f->GetTimestamp() >= pts - diff)
            {
                break;
            }
            LOG_ERROR("POPUP ... %lld  / %lld", f->GetTimestamp(), pts);
            out_que_.pop_front();
        }
    }
}

BoolResult AVProcessor::postOperateEvent(EvtPtr ep)
{
    std::unique_lock<std::mutex> lg(lock_);
    evt_que_.push_back(ep);
    cond_.notify_one();
    return true;
}

bool AVProcessor::outputsFilled()
{

    if (out_que_.size() < 2)
    {
        return false;
    }

    int64_t old_ts = out_que_.front()->GetTimestamp();
    int64_t new_ts = out_que_.back()->GetTimestamp();
    return (new_ts - old_ts) >= out_que_limit_;
}

VideoProcessor::~VideoProcessor() = default;

VideoProcessor::VideoProcessor(PlayerSession &session, void *view) noexcept : AVProcessor(session, MediaType::kVIDEO)
{
    //    if (!view)
    //        std::terminate();
    LOG_ERROR("%p ZZZZ VideoProcessor", this);
    setOutputLimit(50);
}

BoolResult VideoProcessor::seekTo(int64_t ts)
{
    LOG_ERROR("ZZZZ zzzz +++seekTo: %lld", ts);
    auto res = getOutputStream()->Seek(ts);
    //auto res = GetOutputStream()->Seek(ts);
    if_result_failure(res)
    {
        return res;
    }
    ClearOutputs();
    SetTimestamp(ts);
    setReading(false);
    LOG_ERROR("zzzz +++seekTo: %lld ..  ", ts);
    //vid_ts = ts;
    return true;
}

void VideoProcessor::setPreviewFrame(FramePtr f)
{
    preview_frame_ = f;
}

BoolResult VideoProcessor::do_reset()
{

    auto e = std::make_shared<ProcessorFunctorEvt>(*this, [](AVProcessor &processor) {
        auto &vid_proc = static_cast<VideoProcessor &>(processor);
        return vid_proc.seekTo(0);
    });

    //auto e = std::make_shared<VideoProcessor::ResetEvt>(*this);
    postOperateEvent(e);
    e->WaitComplete();
    return true;
}

void VideoProcessor::do_real_work()
{
#if !PV_PLATFORM_WIN
    //pthread_setname_np("video_processor");
#endif
    /*
    char name[64];
    snprintf(name, sizeof name, "video-processor:%08x", pthread_self());
    pthread_setname_np(name);

    
    MakeCurrentEffectContext(getSession().GetEffectContext());
   
    PlayerSession& session = static_cast<PlayerSession&>(getSession());
    
  	*/

    PlayerSession &player = getPlayer();
    int64_t lastRePosTS = kINVALID_TS;

    ///////////////////////////////
    while (true)
    {

        EvtPtr evtp;
        bool read_next = false;

        {
            std::unique_lock<std::mutex> lg(getLock());

            getCond().wait(lg, [&]() {
                //LOG_DEBUG("vid proc wakeup..");
                if (shouldExit()) ///< Stop() called
                    return true;

                if (!getEvtQueue().empty()) ///< have pending event to process
                    return true;

                /// should read more frames,
                if (isReading() && !outputsFilled())
                {
                    read_next = true;
                    return true;
                }

                return false;
            });

            /// case 1: exit
            if (shouldExit())
            {
                // release all streams
                break;
            }
            if (!getEvtQueue().empty())
                evtp = dequeueEvent();
        }

        /// case 2: process event
        if (evtp)
        {
            LOG_DEBUG("Video Evt : %s", evtp->evt_name.c_str());
            evtp->dispose();
        }
        else if (read_next)
        { /// read next frame

            Result<FramePtr> frame;
            auto diff = getPlayer().diff();
            LOG_ERROR("zzzz %d", diff);
            //diff = -1;
#if 1
            if (diff > 50 //&& !player.isAudioDrained()
            )
            {
                int64_t newts = getPlayer().GetOutputTimestamp();
                LOG_ERROR("zzzz +++++ %lld  // %lld", newts, lastRePosTS);
                //if (lastRePosTS != newts) {
                //
                //                    frame = getOutputStream()->ReadFrame();
                //                } else {
                //
                //                    lastRePosTS = newts;
                frame = getOutputStream()->ReadFrame(newts);
                LOG_ERROR("zzzz ----- %lld  // %lld", newts, lastRePosTS);
                //}
            }
            else
            {

                frame = getOutputStream()->ReadFrame();
            }
#else
            frame = getOutputStream()->ReadFrame();
#endif
            //auto frame = GetOutputStream()->ReadFrame();
            if_result_success(frame)
            {
                LOG_DEBUG("XXXXz Video read success : %lld", frame->GetTimestamp());

                /// FIXME:
                /// add frame to output queue
                ////////////+++     glFinish();

                EnqueFrame(*frame);
                auto ts = frame->GetTimestamp();
                player.updateVideoTimestamp(ts);
                LOG_ERROR("zzzz ----- vts : %lld  : %lld", player.GetVideoTimestamp(), player.GetOutputTimestamp());

                if (!player.isFetchReady() && outputsFilled())
                {
                    /// video queue buffering-complete
                    LOG_DEBUG("zzzz video filled");
                    //ready = true;
                    player.postOperateEvent(std::make_shared<VideoReadyEvt>(player));
                }
            }
            else
            {
                SetEOS(true);

                LOG_DEBUG("ZZZZ zzzz Video EOS!");
                //reading_ = false;
                setReading(false);
                if (!player.isFetchReady())
                { ///< EOS comes before buffering-completed
                    LOG_DEBUG("ZZZZ zzzz video filled eos");
                    player.postOperateEvent(std::make_shared<VideoReadyEvt>(player));
                }
            }
        }

        //}

    } //while

    //closeAllStreams();

    //res = GetOutputStream()->Close();
    //close all streams
}

AudioProcessor::AudioProcessor(PlayerSession &session) noexcept : AVProcessor(session, MediaType::kAUDIO)
{
    setOutputLimit(100);
    LOG_ERROR("%p ZZZZ AudioProcessor", this);
}

BoolResult AudioProcessor::seekTo(int64_t ts)
{
    //auto res = GetOutputStream()->Seek(ts);
    auto res = getOutputStream()->Seek(ts);
    if_result_failure(res)
    {
        return res;
    }

    ClearOutputs();
    SetTimestamp(ts);
    setReading(false);
    return true;
}

BoolResult AudioProcessor::do_reset()
{

    //    auto functor = [](SessionProcessor& processor) -> BoolResult {
    //        auto& aud_proc = static_cast<AudioProcessor&>(processor);
    //        return aud_proc.seekTo(0);
    //    };
    auto e = std::make_shared<ProcessorFunctorEvt>(*this, [](AVProcessor &processor) {
        auto &aud_proc = static_cast<AudioProcessor &>(processor);
        return aud_proc.seekTo(0);
    });

    //auto e = std::make_shared<AudioProcessor::ResetEvt>(*this);
    postOperateEvent(e);
    return e->WaitComplete();
}

void AudioProcessor::do_real_work()
{
#if !PV_PLATFORM_WIN
    //pthread_setname_np("audio_processor");
#endif

    PlayerSession &player = static_cast<PlayerSession &>(getPlayer());

    ///////////////////////////////
    while (true)
    {
        //LOG_DEBUG("audio --- oooo");

        EvtPtr evtp;
        bool read_next = false;
        //bool output_ready;
        {
            std::unique_lock<std::mutex> lg(getLock());

            getCond().wait(lg, [&]() {
                //LOG_DEBUG("aud proc wakeup..");

                if (shouldExit()) ///< Stop() called,
                    return true;

                if (!getEvtQueue().empty()) ///< should process events
                    return true;

                if (isReading() && !outputsFilled())
                { ///< should read more frames
                    read_next = true;
                    return true;
                }

                return false;
            });

            /// case 1: exit
            if (shouldExit())
            {
                // release all streams
                break;
            }

            if (!getEvtQueue().empty())
                evtp = dequeueEvent();

            //leave lock
        }

        if (evtp)
        {
            /// case 2: process event
            LOG_DEBUG("Audio Evt : %s", evtp->evt_name.c_str());
            evtp->dispose();
        }
        else if (read_next)
        {

            auto frame = getOutputStream()->ReadFrame();
            //auto frame = GetOutputStream()->ReadFrame();
            if_result_success(frame)
            {

                //LOG_DEBUG("Audio read success : %lld", frame->GetTimestamp());
                EnqueFrame(*frame);
                player.updateAudioTimestamp(frame->GetTimestamp());
                /// wake up video-processor
                //player.getVideoProcessor().Wakeup();

                if (!player.isFetchReady() && outputsFilled())
                {
                    /// audio buffering-completed
                    //ready = true;
                    LOG_DEBUG("zzzz audio filled");
                    player.postOperateEvent(std::make_shared<AudioReadyEvt>(player));
                }
            }
            else
            {
                SetEOS(true);
                /// EOS comes before buffering-completed
                LOG_DEBUG("zzzz Audio EOS! .. [%s].%d", frame.Desc(), frame.Code());
                //eos = true;
                //reading_ = false;
                setReading(false);
                if (!player.isFetchReady())
                {
                    LOG_DEBUG("zzzz audio filled eos");
                    player.postOperateEvent(std::make_shared<AudioReadyEvt>(player));
                }
            }
        }

    } //while

    //res = GetOutputStream()->Close();
    //closeAllStreams();
}

PlayerSession::~PlayerSession() = default;

BoolResult PlayerSession::Initialize(const PlayerParam &param)
{
    auto res = do_start(param);

    op_thread_ = std::thread(std::bind(&PlayerSession::operateDisposeProc, this));
    ntf_thread_ = std::thread(std::bind(&PlayerSession::notifyDisposeProc, this));

    return res;
}

VoidResult PlayerSession::Finalize()
{

    auto res = do_stop();

    /// abort event dispatch thread
    abortOperateDisposeProc();
    op_thread_.join();

    abortNotifyDisposeProc();
    ntf_thread_.join();

    return res;
}

void PlayerSession::abortNotifyDisposeProc()
{
    std::unique_lock<std::mutex> lg(ntf_lock_);
    ntf_abort_ = true;
    ntf_cond_.notify_one();
}

void PlayerSession::abortOperateDisposeProc()
{
    std::unique_lock<std::mutex> lg(op_lock_);
    op_abort_ = true;
    op_cond_.notify_one();
}

void PlayerSession::postOperateEvent(EvtPtr e)
{
    if (!e)
    {
        return;
    }

    std::unique_lock<std::mutex> lg(op_lock_);
    op_que_.push_back(e);
    op_cond_.notify_one();
}

void PlayerSession::operateDisposeProc()
{
    //	pthread_setname_np("op-evt-dispose");

    for (;;)
    {
        EvtPtr evt;
        {
            std::unique_lock<std::mutex> lg(op_lock_);

            op_cond_.wait(lg, [&]() {
                return !op_que_.empty() || op_abort_;
            });

            if (op_abort_)
            {
                break;
            }

            evt = op_que_.front();
            op_que_.pop_front();
        }

        LOG_DEBUG("dispose operate-event.. [%s]", evt->evt_name.c_str());
        evt->dispose();
    }
}

NotifyEvtPtr PlayerSession::WaitNotifyEvt()
{
    std::unique_lock<std::mutex> lg(ntf_lock_);

    ntf_cond_.wait(lg, [&]() {
        return !ntf_que_.empty() || ntf_abort_;
    });

    if (ntf_abort_)
    {
        return nullptr;
    }

    NotifyEvtPtr ntf = ntf_que_.front();
    ntf_que_.pop_front();
    return ntf;
}

void PlayerSession::postNotifyEvent(NotifyEvtPtr e)
{
    if (!e)
    {
        return;
    }

    std::unique_lock<std::mutex> lg(ntf_lock_);
    ntf_que_.push_back(e);
    ntf_cond_.notify_one();
}

void PlayerSession::notifyDisposeProc()
{
    //pthread_setname_np("ntf-dispose");

    for (;;)
    {
        NotifyEvtPtr evt;
        {
            std::unique_lock<std::mutex> lg(ntf_lock_);

            ntf_cond_.wait(lg, [&]() {
                return !ntf_que_.empty() || ntf_abort_;
            });

            if (ntf_abort_)
            {
                break;
            }

            evt = ntf_que_.front();
            ntf_que_.pop_front();
        }

        //LOG_DEBUG("dispose event.. [%s]", evt->evt_name_.c_str());
        evt->dispose();
    }
}

BoolResult PlayerSession::do_start(const PlayerParam &param)
{
    if (!testState(PlayerSessionState::kINIT))
    {
        return BOOL_RESULT_FOR(ResultCode::ILLEGAL_STATE);
    }

    audio_proc_ = std::make_unique<AudioProcessor>(*this);
    video_proc_ = std::make_unique<VideoProcessor>(*this, nullptr);
    if (!audio_proc_ || !video_proc_)
    {
        return BOOL_RESULT_FOR(ResultCode::NO_MEM);
    }

    audio_proc_->out_que_limit_ = 100; // player_param->playingDelay;
    video_proc_->out_que_limit_ = 100; // player_param->playingDelay;

    audio_proc_->SetOutputStream(audio_stream_);
    video_proc_->SetOutputStream(video_stream_);
    //updateStreamDuration();

    audio_proc_->Start();
    video_proc_->Start();

    //LOG_DEBUG("PlayerSession [%s] started", getTypeString().data());

    //usleep(1000000);
    //LOG_INFO("XXXXXXXXXXXXXXXXXXX");

    //
    //    video_output_->AddFrameProvider([=]() ->VideoFramePtr {
    //
    //        auto frame_res = this->fetchVideoFrame();
    //        if_result_failure(frame_res) {
    //            return nullptr;
    //        }
    //        auto vframe = std::static_pointer_cast<VideoFrame>(frame_res.Value());
    //        //LOG_WARN("after fetch VideoFrame... %p: %dx%d : %d", vframe.get(), vframe->GetWidth(), vframe->GetHeight(), vframe->GetFormat());
    //        return vframe;
    //    });
    //    video_output_->Open(vo_config);

    //#if 0
    //    auto audio_output_stream = std::static_pointer_cast<AudioStream>(audio_proc_->GetOutputStream());
    //    int channels = audio_output_stream->getChannels();
    //    int sample_rate = audio_output_stream->getSampleRate();
    //    int sample_count = audio_output_stream->GetSampleCount();
    //#else
    //    int channels = 2;
    //    int sample_rate = 44100;
    //    int sample_count = 1024;
    //#endif
    //    Config ao_config;
    //    ao_config.SetNumber("channels", channels);
    //    ao_config.SetNumber("sample-rate", sample_rate);
    //    ao_config.SetNumber("sample-count", sample_count);

    //    audio_output_->AddFrameProvider([&]() {
    //        auto frame_res = this->fetchAudioFrame();
    //        return std::static_pointer_cast<AudioFrame>(frame_res.Value());
    //    });
    //    audio_output_->Open(ao_config);
    //
    //    audio_output_->Run();
    //LOG_INFO("ZZZZZZZZZZZZZZZZz");

    player_thread_ = std::thread(std::bind(&PlayerSession::playerEventDisposeProc, this));

    prev_thr_ = std::thread(std::bind(&PlayerSession::previewDisposeProc, this));

    setState(PlayerSessionState::kREADY);
    return true;
}

VoidResult PlayerSession::do_stop()
{
    if (testState(PlayerSessionState::kDEAD))
    {
        return VOID_RESULT_FOR(ResultCode::ILLEGAL_STATE);
    }

    abortPreviewDisposeThread();
    prev_thr_.join();

    abortPlayerEventDisposeThread();
    player_thread_.join();

    //    audio_output_->Close();
    //    video_output_->Close();

    audio_proc_->Stop();
    video_proc_->Stop();

    //LOG_DEBUG("PlayerSession [%s] stopped", getTypeString().data());

    //AVAssetVideoReaderPool::Get().ReleaseAllReaders();

    setState(PlayerSessionState::kDEAD);
    return {};
}

void PlayerSession::playerEventDisposeProc()
{
    //pthread_setname_np("player-evt-dispose");
    while (true)
    {
        PlayerNotifyEvtPtr ep;
        {
            std::unique_lock<std::mutex> lg(player_evt_lock_);

            player_evt_cond_.wait(lg, [&]() {
                return !player_evt_que_.empty() || player_evt_que_abort_;
            });

            if (player_evt_que_abort_)
                break;

            ep = player_evt_que_.front();
            player_evt_que_.pop_front();
        }

        //auto pevt = std::static_pointer_cast<PlayerNotifyEvt>
        if (player_evt_functor_)
            player_evt_functor_(ep->status, ep->pts);
    }
}

Result<FramePtr> PlayerSession::fetchVideoFrame()
{

    if (in_preview_mode_)
    {
        return getVideoProcessor().getPreviewFrame();
    }

    if (paused_ || !isFetchReady()) // || video_proc_->GetOutputSize() == 0)
        return RESULT_FOR(FramePtr, ResultCode::AGAIN);

    FramePtr frame = getVideoProcessor().PeekFrame();
    if (!frame)
    { ///< after audio drained

        //if (isAudioDrained()) {
        if (getVideoProcessor().IsEos())
        {
            LOG_DEBUG("zzzz Video END");
            //usleep(1000000);
            postOperateEvent(std::make_shared<FetchVideoEmptyEvt>(*this));
            return RESULT_FOR(FramePtr, ResultCode::END);
        }
        else
        {
            return RESULT_FOR(FramePtr, ResultCode::AGAIN);
        }
    }

    if (frame->GetTimestamp() > GetOutputTimestamp() && !isAudioDrained())
        return RESULT_FOR(FramePtr, ResultCode::AGAIN);

    postPlayerEvent(PlayerStatus::kPLAYING, frame->GetTimestamp());

    return getVideoProcessor().DequeFrame();
}

Result<FramePtr> PlayerSession::fetchAudioFrame()
{
    if (in_preview_mode_)
    {
        return RESULT_FOR(FramePtr, ResultCode::AGAIN);
    }

    //LOG_DEBUG("zzzz ... Ax ");
    if (paused_ || !isFetchReady()) // || audio_proc_->GetOutputSize() == 0)
        return RESULT_FOR(FramePtr, ResultCode::AGAIN);

    //LOG_DEBUG("zzzz ... Bx ");
    FramePtr frame = getAudioProcessor().DequeFrame();
    if (!frame)
    { //FIXME if(!frame && frame->GetTimestamp() + tolerance > audio->GetDuration())

        //if (GetOutputTimestamp() >= audio_duration_ - 50) { // tolerance = 50
        if (getAudioProcessor().IsEos())
        {
            LOG_DEBUG("zzzz Audio END");
            postOperateEvent(std::make_shared<FetchAudioEmptyEvt>(*this));
            return RESULT_FOR(FramePtr, ResultCode::END);
        }
        else
        {
            return RESULT_FOR(FramePtr, ResultCode::AGAIN);
        }
    }

    //LOG_DEBUG("zzzz ... Cx: %lld", frame->GetTimestamp());
    auto ats = frame->GetTimestamp();
    updateOutputTimestamp(ats);
    getVideoProcessor().DequeueFramesBefore(ats);
    return frame;
}

IntResult PlayerSession::GetDuration()
{
    auto vs = getVideoProcessor().GetOutputStream();
    if (!vs)
    {
        return INT_RESULT_FOR(RESULT_FAILURE, _RMSG(""));
    }
    return vs->GetDuration();
}

int64_t PlayerSession::GetAudioTimestamp()
{
    return aud_ts_.load(std::memory_order_relaxed);
}

void PlayerSession::updateAudioTimestamp(int64_t pts)
{
    aud_ts_.store(pts, std::memory_order_relaxed);
}

int64_t PlayerSession::GetVideoTimestamp()
{
    return vid_ts_.load(std::memory_order_relaxed);
}

void PlayerSession::updateVideoTimestamp(int64_t pts)
{
    vid_ts_.store(pts, std::memory_order_relaxed);
}

int64_t PlayerSession::GetOutputTimestamp()
{
    return output_ts_.load(std::memory_order_relaxed);
}

void PlayerSession::updateOutputTimestamp(int64_t pts)
{
    output_ts_.store(pts, std::memory_order_relaxed);
}

int64_t PlayerSession::diff()
{
    return output_ts_ - vid_ts_;
}

//bool PlayerSession::updateStreamDuration()
//{
//    auto vstream = getVideoProcessor().GetOutputStream();
//    auto astream = getAudioProcessor().GetOutputStream();
//
//    if (!vstream || !astream) {
//        audio_duration_ = -1;
//        video_duration_ = -1;
//        return false;
//    }
//
//    audio_duration_ = vstream->GetDuration();
//    video_duration_ = astream->GetDuration();
//
//    return true;
//}

void PlayerSession::postPlayerEvent(PlayerStatus s, int64_t pts)
{
    auto e = std::make_shared<PlayerNotifyEvt>(s, pts);

    std::unique_lock<std::mutex> lg(player_evt_lock_);
    //    if (player_evt_que_.size() >= 10) {
    //        player_evt_que_.pop_front();
    //    }
    player_evt_que_.push_back(e);
    player_evt_cond_.notify_one();
}

void PlayerSession::abortPlayerEventDisposeThread()
{
    std::unique_lock<std::mutex> lg(player_evt_lock_);
    player_evt_que_abort_ = true;
    player_evt_cond_.notify_one();
}

BoolResult PlayerSession::Play()
{
    auto evt = std::make_shared<PlayerFunctorEvt>(*this, obtainPlayFunctor());

    postOperateEvent(evt);
    auto res = evt->WaitComplete();
    if_result_failure(res)
    {
        LOG_WARN("Play() failure..");
        return res;
    }
    return true;
}

BoolResult PlayerSession::Pause()
{

    auto evt = std::make_shared<PlayerFunctorEvt>(*this, obtainPauseFunctor());
    //auto evt = std::make_shared<PauseEvt>(*this);
    postOperateEvent(evt);
    auto res = evt->WaitComplete();
    if_result_failure(res)
    {
        LOG_WARN("Pause() failure..");
        return res;
    }
    return true;
}

BoolResult PlayerSession::Seek(int64_t ts)
{
    auto evt = std::make_shared<PlayerFunctorEvt>(*this, obtainSeekFunctor(ts));
    postOperateEvent(evt);
    auto res = evt->WaitComplete();
    if_result_failure(res)
    {
        LOG_WARN("Seek() failure..");
        return res;
    }
    return true;
}

BoolResult PlayerSession::Preview(int64_t pts)
{

    auto evt = std::make_shared<PlayerFunctorEvt>(*this, obtainPreviewFunctor(pts));

    postOperateEvent(evt);
    auto res = evt->WaitComplete();
    if_result_failure(res)
    {
        LOG_WARN("Preview() failure..");
        return res;
    }

    return true;
}

BoolResult PlayerSession::PreviewAsync(int64_t ts)
{
    LOG_DEBUG("PreviewAsync(%lld)..", ts);

    std::unique_lock<std::mutex> lg(prev_lock_);
    if (!prev_ts_list_.empty())
    {
        prev_ts_list_.clear();
    }

    prev_ts_list_.push_back(ts);
    prev_cond_.notify_one();
    return true;
}

void PlayerSession::abortPreviewDisposeThread()
{
    std::unique_lock<std::mutex> lg(prev_lock_);
    prev_thr_abort_ = true;
    prev_cond_.notify_one();
}

void PlayerSession::previewDisposeProc()
{

    while (true)
    {

        int64_t prev_ts = -1;
        {
            std::unique_lock<std::mutex> lg(prev_lock_);

            prev_cond_.wait(lg, [&]() {
                return prev_thr_abort_ || !prev_ts_list_.empty();
            });

            if (prev_thr_abort_)
                break;

            LOG_DEBUG("got prev...");
            prev_ts = prev_ts_list_.front();
            prev_ts_list_.pop_front();
        }
        LOG_DEBUG("do Preview(%lld) <<", prev_ts);

        Preview(prev_ts);
    }
}

PlayerFunctor PlayerSession::obtainPlayFunctor()
{

    auto functor = [&](PlayerSession &s) -> BoolResult {
        auto &session = static_cast<PlayerSession &>(s);

        if (!session.testStates({PlayerSessionState::kREADY, PlayerSessionState::kPAUSED, PlayerSessionState::kPREVIEWING}))
        {
            return BOOL_RESULT_FOR(ResultCode::ILLEGAL_STATE);
        }

        if (session.testState(PlayerSessionState::kPAUSED))
        {

            session.paused_ = false;
            session.setState(PlayerSessionState::kPLAYING);
            LOG_DEBUG("kPAUSED => kPLAYING");
            return true;
        }

        if (session.testState(PlayerSessionState::kPREVIEWING))
        {

            int64_t pts = session.last_preview_ts_;
            if (pts > session.getAudioProcessor().GetOutputStream()->GetDuration())
                pts = session.getAudioProcessor().GetOutputStream()->GetDuration();

            auto evta = std::make_shared<ProcessorFunctorEvt>(session.getAudioProcessor(), [=](AVProcessor &proc) -> BoolResult {
                auto &processor = static_cast<AudioProcessor &>(proc);
                return processor.seekTo(pts);
            });
            auto evtv = std::make_shared<ProcessorFunctorEvt>(session.getVideoProcessor(), [=](AVProcessor &proc) -> BoolResult {
                auto &processor = static_cast<VideoProcessor &>(proc);
                return processor.seekTo(pts);
            });
            //
            session.getAudioProcessor().postOperateEvent(evta);
            session.getVideoProcessor().postOperateEvent(evtv);

            auto ares = evta->WaitComplete();
            if_result_failure(ares)
            {
                session.getAudioProcessor().Reset();
                session.getVideoProcessor().Reset();
                return ares;
            }
            auto vres = evtv->WaitComplete();
            if_result_failure(vres)
            {
                session.getAudioProcessor().Reset();
                session.getVideoProcessor().Reset();
                return vres;
            }

            session.aud_ts_.store(pts, std::memory_order_relaxed);
            session.vid_ts_.store(pts, std::memory_order_relaxed);
            session.output_ts_.store(pts, std::memory_order_relaxed);
        }

        //return BOOL_RESULT_FOR(ResultCode::ILLEGAL_STATE);
        session.setFetchReady(false);

        session.setAudioReady(false);
        session.setVideoReady(false);
        session.setAudioDrained(false);
        session.setVideoDrained(false);

        LOG_DEBUG("Play() :");

        auto evta = std::make_shared<ProcessorFunctorEvt>(session.getAudioProcessor(), [](AVProcessor &proc) {
            auto &processor = static_cast<AudioProcessor &>(proc);
            processor.setReading(true);
            return RESULT_SUCCESS;
        });
        session.getAudioProcessor().postOperateEvent(evta);

        auto evtv = std::make_shared<ProcessorFunctorEvt>(session.getVideoProcessor(), [](AVProcessor &proc) {
            auto &processor = static_cast<VideoProcessor &>(proc);
            processor.setReading(true);
            processor.clearPreviewFrame();
            return RESULT_SUCCESS;
        });
        session.getVideoProcessor().postOperateEvent(evtv);

        auto ares = evta->WaitComplete();
        if_result_failure(ares)
        {
            session.getAudioProcessor().Reset();
            session.getVideoProcessor().Reset();
            return ares;
        }
        auto vres = evtv->WaitComplete();
        if_result_failure(vres)
        {
            session.getAudioProcessor().Reset();
            session.getVideoProcessor().Reset();
            return vres;
        }

        session.in_preview_mode_ = false;

        //session.pause_or_resume_ = true;
        session.paused_ = false;

        session.setState(PlayerSessionState::kPLAYING);

        session.postPlayerEvent(PlayerStatus::kDO_PLAY, 0);

        LOG_DEBUG("kREADY => kPLAYING");
        return true;
    };
    return functor;
}

PlayerFunctor PlayerSession::obtainPauseFunctor()
{
    auto functor = [](PlayerSession &s) -> BoolResult {
        auto &session = static_cast<PlayerSession &>(s);

        //            if ((session.testState(PlayerSessionState::kPAUSED) && session.pause_or_resume_) ||
        //                (session.testState(PlayerSessionState::kPLAYING) && !session.pause_or_resume_) ||
        //                session.testStates({PlayerSessionState::kREADY, PlayerSessionState::kPREVIEWING})) {

        if (!session.testState(PlayerSessionState::kPLAYING))
        {
            return BOOL_RESULT_FOR(ResultCode::ILLEGAL_STATE);
        }

        //LOG_DEBUG("Pause() : %d .. %d / %d", session.pause_or_resume_, PlayerSessionState::kPAUSED, PlayerSessionState::kPLAYING);

        session.paused_ = true; //session.pause_or_resume_;

        //if (session.pause_or_resume_) {
        LOG_ERROR("set paused... %d", PlayerSessionState::kPAUSED);
        session.setState(PlayerSessionState::kPAUSED);
        session.postPlayerEvent(PlayerStatus::kDO_PAUSE, 0);
        //            } else {
        //                LOG_ERROR("set playing... %d", PlayerSessionState::kPLAYING);
        //                session.setState(PlayerSessionState::kPLAYING);
        //                session.postPlayerEvent(PlayerStatus::kDO_RESUME, 0);
        //            }

        //LOG_DEBUG("Pause() : %d...................", session.pause_or_resume_);

        //session.pause_or_resume_ = !session.pause_or_resume_;
        LOG_DEBUG("kPLAYING => kPAUSE");
        return true;
    };

    return functor;
}

PlayerFunctor PlayerSession::obtainSeekFunctor(int64_t pts)
{
    auto functor = [&, pts](PlayerSession &s) -> BoolResult {
        auto &session = static_cast<PlayerSession &>(s);

        if (!session.testStates({PlayerSessionState::kREADY, PlayerSessionState::kPAUSED, PlayerSessionState::kPREVIEWING}))
        {
            return BOOL_RESULT_FOR(ResultCode::ILLEGAL_STATE);
        }

        //            int64_t aud_duration = session.audio_proc_->getStreamModel()->GetOutputStream()->GetDuration();
        //            int64_t vid_duration = session.video_proc_->getStreamModel()->GetOutputStream()->GetDuration();
        //
        LOG_DEBUG("Seek() : %lld :", pts);
        LOG_DEBUG("Audio duration: %lld", session.getAudioProcessor().GetOutputStream()->GetDuration());
        LOG_DEBUG("Video duration: %lld", session.getVideoProcessor().GetOutputStream()->GetDuration());

        if (pts > session.getAudioProcessor().GetOutputStream()->GetDuration() ||
            pts > session.getVideoProcessor().GetOutputStream()->GetDuration() ||
            pts < 0)
        {

            return BOOL_RESULT_FOR(ResultCode::INVALID_ARG);
        }

        auto evta = std::make_shared<ProcessorFunctorEvt>(session.getAudioProcessor(), [=](AVProcessor &proc) -> BoolResult {
            auto &processor = static_cast<AudioProcessor &>(proc);
            return processor.seekTo(pts);
        });
        auto evtv = std::make_shared<ProcessorFunctorEvt>(session.getVideoProcessor(), [=](AVProcessor &proc) -> BoolResult {
            auto &processor = static_cast<VideoProcessor &>(proc);
            return processor.seekTo(pts);
        });
        //
        session.getAudioProcessor().postOperateEvent(evta);
        session.getVideoProcessor().postOperateEvent(evtv);

        auto ares = evta->WaitComplete();
        if_result_failure(ares)
        {
            session.getAudioProcessor().Reset();
            session.getVideoProcessor().Reset();
            return ares;
        }
        auto vres = evtv->WaitComplete();
        if_result_failure(vres)
        {
            session.getAudioProcessor().Reset();
            session.getVideoProcessor().Reset();
            return vres;
        }

        session.vid_ts_.store(pts, std::memory_order_relaxed);
        session.aud_ts_.store(pts, std::memory_order_relaxed);
        session.output_ts_.store(pts, std::memory_order_relaxed);

        LOG_DEBUG("Seek() : %lld.........", pts);

        //state = Init
        session.setState(PlayerSessionState::kREADY);

        session.postPlayerEvent(PlayerStatus::kDO_SEEK, pts);

        //LOG_DEBUG("k => kPLAYING");
        return true;
    };

    return functor;
}

PlayerFunctor PlayerSession::obtainPreviewFunctor(int64_t pts)
{

    auto session_functor = [&, pts](PlayerSession &s) -> BoolResult {
        auto &session = static_cast<PlayerSession &>(s);

        if (!session.testStates({PlayerSessionState::kREADY, PlayerSessionState::kPLAYING, PlayerSessionState::kPAUSED, PlayerSessionState::kPREVIEWING}))
        {
            return BOOL_RESULT_FOR(ResultCode::ILLEGAL_STATE);
        }

        if (session.testState(PlayerSessionState::kPLAYING))
        {
            //state transfer to paused;
            session.paused_ = true;
        }

        int64_t real_pts = std::clamp(pts, 0LL, session.getVideoProcessor().GetOutputStream()->GetDuration() / 100 * 100);

        LOG_DEBUG("Preview() : %lld => %lld", pts, real_pts);

        auto processor_functor = [=](AVProcessor &processor) -> BoolResult {
            auto &vid_proc = static_cast<VideoProcessor &>(processor);
            LOG_DEBUG("Video preview : %lld", real_pts);

            vid_proc.setReading(false);
            vid_proc.ClearOutputs();

            //vid_proc.clearPreviewFrame();

            auto frame_res = vid_proc.GetOutputStream()->ReadFrame(real_pts);
            if_result_failure(frame_res)
            {
                //return frame;
                LOG_WARN("video readFrame failure : %s", frame_res.Desc());
                return frame_res;
            }
            //////+++      glFinish();
            LOG_DEBUG("preview frame @ %lld (%lld)", real_pts, frame_res->GetTimestamp());
            vid_proc.setPreviewFrame(*frame_res);

            return true;
        };

        auto evtv = std::make_shared<ProcessorFunctorEvt>(session.getVideoProcessor(), std::move(processor_functor));
        session.getVideoProcessor().postOperateEvent(evtv);
        auto res = evtv->WaitComplete();
        if_result_failure(res)
        {

            return res;
        }

        session.in_preview_mode_ = true;
        //session.pause_or_resume_ = true;
        session.setFetchReady(true);

        last_preview_ts_ = real_pts;

        session.setState(PlayerSessionState::kPREVIEWING);
        session.postPlayerEvent(PlayerStatus::kDO_PREVIEW, real_pts);
        LOG_DEBUG("=> kPREVIEWING");

        return true;
    };

    return session_functor;
}

} // namespace pulsevideo
