
#include "video_stream.hh"

#include <cassert>


#define LOG_DISABLE 1

#include "log.hh"
#include "mem_frame.hh"
#include "ffmpeg_reader.hh"
#include "fake_reader.hh"



namespace pulsevideo {


namespace v1 {



VideoReaderStream::~VideoReaderStream() = default;

VideoReaderStream::VideoReaderStream(StreamContext& ctx)
 : VideoStream(ctx)
{    
    getConfigValidator().InsertString("url", true);
    getConfigValidator().InsertNumber("fps");
    getConfigValidator().InsertNumber("prefer-width");
    getConfigValidator().InsertNumber("prefer-height");
    getConfigValidator().InsertNumber("longest-side");
}


Result<VideoStreamOpenDataPtr> VideoReaderStream::do_video_stream_open(const Config& config)
{
    
    auto url = config.GetStringOr("url", "");
    int pwidth = config.GetIntNumberOr("prefer-width", 0);
    int pheight = config.GetIntNumberOr("prefer-width", 0);
    int lside = config.GetIntNumberOr("longest-side", 0);
    double fps = config.GetNumberOr("fps", 30);
    
    
    
    Config video_reader_cfg;
    video_reader_cfg.SetString("url", url);
    if (pwidth > 0 && pheight > 0) {
        video_reader_cfg.SetNumber("width", pwidth);
        video_reader_cfg.SetNumber("height", pheight);
    } else {
        // todo
        
        
    }
    
    //reader_ = std::make_unique<FFmpegVideoReader>();
    reader_ = std::make_unique<FakeVideoReader>();
    
    auto vres = reader_->Open(video_reader_cfg);
    RETURN_ON_FAILURE(vres);
    
    
    
    int64_t real_duration = reader_->GetDuration();
    int width = reader_->GetWidth();
    int height = reader_->GetHeight();
    int64_t duration = adjustDuration(real_duration, fps);
    
    auto tag = std::make_unique<VideoFrameTag>(VideoFormat::kARGB, width, height);
    
    ///
    auto odp = std::make_shared<VideoStreamOpenData>();
    odp->framerate = fps;
    //odp->framerate_den = 1000;
    odp->tag = std::move(tag);
    odp->duration = duration;
    
    url_ = url;
    
    decoding_thr_ = std::thread(std::bind(&VideoReaderStream::decodingThreadProc, this));
    
    return odp;
}

VoidResult VideoReaderStream::do_video_stream_close()
{
    abortDecodingThread();
    decoding_thr_.join();
    
    reader_->Close();
    reader_.reset();
    return {};
}


VideoFramePtr VideoReaderStream::getCachedFrame(int64_t ts)
{
    VideoFramePtr ret_frame;
    for (auto it = cached_frames_.rbegin(); it != cached_frames_.rend(); ++it) {
        FramePtr frame = *it;
        if (frame->GetTimestamp() <= ts) {
            ret_frame = std::static_pointer_cast<VideoFrame>(frame);
            break;
        }
    }
    if (!ret_frame)
        return nullptr;
    
    //ret->UpdateTimestamp(ts);
    
    //LOG_DEBUG("xxxxxxxxxxx :: %lld/%lld", old_ts, ret_frame->GetTimestamp());
    return ret_frame;
}

bool VideoReaderStream::responseFrame(int64_t reqDecTs, bool& waitFrame) {
    
    for (auto it = cached_frames_.rbegin(); it != cached_frames_.rend(); ++it) {
        FramePtr frame = *it;
        if (frame->GetTimestamp() <= reqDecTs) {
            std::unique_lock<std::mutex> lg(decLock_);
            //got_frame = true;
            waitFrame = false;
            //decReqTs_ = -1;
            decoded_frame_ = std::static_pointer_cast<VideoFrame>(frame);
            decOutCond_.notify_one();
            LOG_ERROR("SRCC_NOTIFY frame ready. [%lld]00", decoded_frame_->GetTimestamp());
            
            return true;
            ////notify
            //break;
            //continue;
        }
    }
    return false;
}

void VideoReaderStream::appendFrameToCache(FramePtr frame, int64_t lastReqTS) {
    
    if (cached_frames_.empty()) {
        cached_frames_.push_back(frame);
        return;
    }
    
    int64_t cache_end = cached_frames_.back()->GetTimestamp();
    
    if (frame->GetTimestamp() <= cache_end) {
        // ignore current frame, due to unordered
        return;
    }
    
    int64_t cache_begin = cached_frames_.front()->GetTimestamp();
    
    if (cached_frames_.size() > 2 &&
        cache_end - cache_begin > cached_dur_) {
        
        // 避免把上次读取的视频帧从缓存中移除,不然会影响再次读取同一帧时候的性能
        int64_t new_cache_begin = cached_frames_[1]->GetTimestamp();
        if (new_cache_begin < lastReqTS)
            cached_frames_.pop_front();
    }
    
    //int64_t new_ts = frame_pos * framerate_inv_ * 1000;
    //int64_t new_ts = posToTimestamp(frame_pos);
    //frame->UpdateTimestamp(new_ts);
    cached_frames_.push_back(frame);
}




bool VideoReaderStream::requestDecode(int64_t ts)
{
    LOG_DEBUG("SRCC_ requestDecode(%lld)", ts);
    std::unique_lock<std::mutex> lg(decLock_);
    if (abort_thr_)
        return false;
    
    //decRespTs_ = -1;
    decReqTs_ = ts;
    decCond_.notify_one();
    
    return true;
}


VideoFramePtr VideoReaderStream::waitDecodeFinish()
{
    LOG_DEBUG("SRCC_ waitDecodeFinish() begin");
    
    std::unique_lock<std::mutex> lg(decLock_);
    decOutCond_.wait(lg, [&](){
        return !!decoded_frame_;
    });
    VideoFramePtr ret = decoded_frame_;
    decoded_frame_.reset();
    
    LOG_DEBUG("SRCC_ waitDecodeFinish(%lld) end", ret->GetTimestamp());
    
    return ret;
}

void VideoReaderStream::abortDecodingThread()
{
    std::unique_lock<std::mutex> lg(decLock_);
    abort_thr_ = true;
    decCond_.notify_one();
}



void VideoReaderStream::decodingThreadProc()
{
    
    bool decEOF = false;
    int64_t decEnd {-1};
    int64_t decTs {-1};
    int64_t reqDecTs {-1};
    bool waitFrame = false;
    
    while (true) {
        
        //int64_t ts = -1;
        int64_t cached_begin = -1;
        int64_t cached_end = -1;
        
        
        bool decReq = false;
        bool readMore = false;
        //decReqTs_ = -1;
        {
            std::unique_lock<std::mutex> lg(decLock_);
            
            if (!cached_frames_.empty()) {
                // 计算出当前缓存的开始和结束时间
                cached_begin = cached_frames_.front()->GetTimestamp();
                cached_end = cached_frames_.back()->GetTimestamp();
                LOG_INFO("SRCC_[%lld : %lld] .. %lld < %lld", cached_begin, cached_end, decTs, decEnd);
            }
            
            decCond_.wait(lg, [&]() {
                // abort current thread.
                // 结束
                if (abort_thr_)
                    return true;
                
                // triggered by caller.
                // 请求新的视频帧
                if (decReqTs_ != -1) {
                    decReq = true;
                    return true;
                }
                
                //decoding more frames.
                // 正在解码中，直到缓存足够
                if (!decEOF && decEnd != -1 && (cached_end <= decEnd)) {
                    readMore = true;
                    return true;
                }
                
                return false;
            });
            LOG_DEBUG("SRCC_.. reqDecTs : %lld .. eof:%d", reqDecTs, decEOF);
        }
        
        
        if (abort_thr_) {
            // 结束线程
            LOG_INFO("SRCC_decoding thread aborted");
            break;
            
        } else if (decReq) {
            // 请求新的视频帧
            
            reqDecTs = decReqTs_;
            decReqTs_ = -1;
            waitFrame = true;
            
            // 计算出视频帧缓存新的结束点
            //decEnd = reqDecTs + cached_dur_ / 2;
            decEnd = reqDecTs + cached_dur_;
            
            
            
            LOG_WARN("request decode... : %lld", reqDecTs);
            
            
            if (!cached_frames_.empty() &&
                reqDecTs >= cached_begin &&
                reqDecTs <= cached_end)
            {
                //请求的视频帧已经在缓存中
                
                assert(responseFrame(reqDecTs, waitFrame));
                
                //for (auto it = cached_frames_.rbegin(); it != cached_frames_.rend(); ++it) {
                //    FramePtr frame = *it;
                //    if (frame->GetTimestamp() <= reqDecTs) {
                //        std::unique_lock<std::mutex> lg(decLock_);
                
                //        //got_frame = true;
                //        waitFrame = false;
                //        //decReqTs_ = -1;
                //        decoded_frame_ = std::static_pointer_cast<VideoFrame>(frame);
                //        decOutCond_.notify_one();
                //        LOG_ERROR("SRCC_NOTIFY frame ready. [%lld]00", decoded_frame_->GetTimestamp());
                //        ////notify
                //        break;
                //        //continue;
                //    }
                //}
                
                
                continue;
                //found
            } else if (!cached_frames_.empty() &&
                       reqDecTs >= cached_begin &&
                       reqDecTs <= decEnd)
            {
                if (decEOF && waitFrame) {
                    assert(responseFrame(reqDecTs, waitFrame));
                }
                //请求的视频帧已经在待解码的范围内,需要等待
                // nothing to do
                //continue;
                /*
                 } else if (!cached_frames_.empty() &&
                 reqDecTs > cached_end  &&
                 (reqDecTs - cached_end) <= reset_threshold_)
                 {
                 //请求的视频帧虽然不在待解码的范围内,但由于接近,考虑seek的成本,就等待吧
                 
                 auto vreader = std::static_pointer_cast<AVAssetVideoReader>(AVAssetVideoReaderPool::Get().AcquireReader(this, config_));
                 if (!vreader) {
                 LOG_ERROR("SRCC_AVAssetVideoReaderPool::AcquireReader(%p) failure", this);
                 break;
                 }
                 
                 
                 if (vreader->IsNewCreated()) {
                 auto seek_res = vreader->SeekTo(cached_end);
                 if_result_failure(seek_res) {
                 LOG_ERROR("SRCC_AVAssetVideoReader::SeekTo(%lld) failure", cached_end);
                 break;
                 }
                 }
                 
                 
                 */
            } else {
                //seek
                
                
                LOG_ERROR("SRCC_reset cache..");
                cached_frames_.clear();
                decEOF = false;
                //int64_t new_ts = std::max(int64_t(reqDecTs - cached_dur_ / 2), 0LL);
                int64_t new_ts = std::max(int64_t(reqDecTs - cached_dur_ / 4), 0LL);
                auto seek_res = reader_->SeekTo(new_ts);
                if_result_failure(seek_res) {
                    LOG_ERROR("SRCC_AVAssetVideoReader::SeekTo(%lld) failure", new_ts);
                    break;
                }
                
            }
            //reqDecTs = decReqTs_;
            //decEnd = decReqTs_ + cached_dur_ / 2;
            //waitFrame = true;
            
            
        } else if (readMore) {
            
            LOG_WARN("read..more...");
            
            auto frame_res = reader_->ReadNextFrame();
            if_result_failure(frame_res) {
                LOG_ERROR("SRCC_read frame failure...");
                //decOutCond_.notify_one();
                //break;
                decEOF = true;
                //notify
                
                if (waitFrame) {
                    
                    if (cached_frames_.empty()) {
                        //auto memstub = std::make_shared<VideoMemStub>(GetVideoFrameTag());
                        decoded_frame_ = MakeVideoFrame<VideoMemStub>(GetVideoFrameTag(), kINVALID_TS);
                    } else {
                        //decoded_frame_ = std::static_pointer_cast<VideoFrame>(cached_frames_.back());
                        decoded_frame_ = cached_frames_.back()->CastTo<VideoFrame>();
                    }
                    
                    decOutCond_.notify_one();
                    
                }
                
                
                continue;
            }
            
            decTs = frame_res->GetTimestamp();
            appendFrameToCache(*frame_res, reqDecTs);
            
            if (waitFrame && decTs >= reqDecTs) {
                assert(responseFrame(reqDecTs, waitFrame));
            }
            
        }
        
    } //while(true)
    
}


Result<VideoFramePtr> VideoReaderStream::do_video_stream_read_frame(int64_t ts, int64_t pos, bool seeked)
{
    
    LOG_ERROR("zzzz-[[[[ :%lld (%lld)", ts, pos);
    VideoFramePtr vframe;
    if (requestDecode(ts)) {
        vframe = waitDecodeFinish();
    }
    LOG_ERROR("zzzz-]]]]] ");
    
    if (vframe) {
        return vframe;
    }
    
    return RESULT_FOR(VideoFramePtr, ResultCode::END);
}




}










namespace v2 {


FrameCacheMgr::FrameCacheMgr(int64_t max_dur): max_duration_(max_dur)
{
}



FrameCacheMgr::~FrameCacheMgr()
{
}


void FrameCacheMgr::Clear()
{
    std::unique_lock<std::mutex> lg(lock_);
    frames_.clear();
    eos_flag_ = false;
}

bool FrameCacheMgr::IsEmpty() const
{
    std::unique_lock<std::mutex> lg(lock_);
    return frames_.empty();
}

size_t FrameCacheMgr::Size() const
{
    std::unique_lock<std::mutex> lg(lock_);
    return frames_.size();
}

int64_t FrameCacheMgr::FirstTS() const {
    std::unique_lock<std::mutex> lg(lock_);
    if (!frames_.empty()) {
        return frames_.front()->GetTimestamp();
    }
    return kINVALID_TS;
}

int64_t FrameCacheMgr::LastTS() const {
    std::unique_lock<std::mutex> lg(lock_);
    if (!frames_.empty()) {
        return frames_.back()->GetTimestamp();
    }
    return kINVALID_TS;
}

Result<FramePtr> FrameCacheMgr::GetFirstFrame()
{
    std::unique_lock<std::mutex> lg(lock_);
    if (!frames_.empty()) {
        return frames_.front();
    }
    return MakeResultFor(ResultCode::OUT_OF_RANGE);
}

Result<FramePtr> FrameCacheMgr::GetLastFrame()
{
    std::unique_lock<std::mutex> lg(lock_);
    if (!frames_.empty()) {
        return frames_.back();
    }
    return MakeResultFor(ResultCode::OUT_OF_RANGE);
}

Result<FramePtr> FrameCacheMgr::GetFrameAt(int64_t ts)
{
    std::unique_lock<std::mutex> lg(lock_);
    if (frames_.empty()) {
        return MakeResultFor(ResultCode::OUT_OF_RANGE);
    }
    if (ts > frames_.back()->GetTimestamp() && !eos_flag_ ) {
        return MakeResultFor(ResultCode::OUT_OF_RANGE);
    }
    FramePtr ret_frame;
    for (auto it = frames_.rbegin(); it != frames_.rend(); ++it) {
        FramePtr frame = *it;
        if (frame->GetTimestamp() <= ts) {
            ret_frame = frame;
            break;
        }
    }
    if (!ret_frame)
        return MakeResultFor(ResultCode::OUT_OF_RANGE);
    
    return ret_frame;
}

BoolResult FrameCacheMgr::AppendFrame(FramePtr frame, int64_t lastReqTS)
{
    std::unique_lock<std::mutex> lg(lock_);
    if (frames_.empty()) {
        frames_.push_back(frame);
        eos_flag_ = false;
        return true;
    }
    
    int64_t cache_end = frames_.back()->GetTimestamp();
    
    if (frame->GetTimestamp() <= cache_end) {
        // ignore current frame, due to unordered
        return false;
    }
    
    int64_t cache_begin = frames_.front()->GetTimestamp();
    
    if (frames_.size() > 2 &&
        cache_end - cache_begin > max_duration_) {
        
        // never pop frames that with timestamp greater than or equal to lastReqTS
        int64_t new_cache_begin = frames_[1]->GetTimestamp();
        if (new_cache_begin <= lastReqTS)
            frames_.pop_front();
    }
    
    //int64_t new_ts = frame_pos * framerate_inv_ * 1000;
    //int64_t new_ts = posToTimestamp(frame_pos);
    //frame->UpdateTimestamp(new_ts);
    frames_.push_back(frame);
    eos_flag_ = false;
    
    return true;
}




VideoReaderStream::~VideoReaderStream() noexcept = default;

VideoReaderStream::VideoReaderStream(StreamContext& ctx)
    : VideoStream(ctx)
{
    
    getConfigValidator().InsertString("url", true);
    getConfigValidator().InsertNumber("prefer-fps");
    getConfigValidator().InsertNumber("prefer-width");
    getConfigValidator().InsertNumber("prefer-height");
    getConfigValidator().InsertNumber("longest-side");
}


Result<VideoStreamOpenDataPtr> VideoReaderStream::do_video_stream_open(const Config& config)
{
    
    auto url = config.GetStringOr("url", "");
    int pwidth = config.GetIntNumberOr("prefer-width", 0);
    int pheight = config.GetIntNumberOr("prefer-height", 0);
    int lside = config.GetIntNumberOr("longest-side", 0);
    double fps = config.GetNumberOr("prefer-fps", 30);
    
    
    
    Config video_reader_cfg;
    video_reader_cfg.SetString("url", url);
    if (pwidth > 0 && pheight > 0) {
        video_reader_cfg.SetNumber("width", pwidth);
        video_reader_cfg.SetNumber("height", pheight);
    } else {
        // todo
        
        
    }
    
    reader_ = std::make_unique<FFmpegVideoReader>();
    //reader_ = std::make_unique<FakeVideoReader>();
    
    auto vres = reader_->Open(video_reader_cfg);
    RETURN_ON_FAILURE(vres);
    
    
    
    int64_t real_duration = reader_->GetDuration();
    int width = reader_->GetWidth();
    int height = reader_->GetHeight();
    int64_t duration = adjustDuration(real_duration, fps);
    
    auto readerFMT = reader_->GetVideoFrameTag().format;
    
    auto tag = std::make_unique<VideoFrameTag>(readerFMT, width, height);
    
    ///
    auto odp = std::make_shared<VideoStreamOpenData>();
    odp->framerate = fps;
    //odp->framerate_den = 1000;
    odp->tag = std::move(tag);
    odp->duration = duration;
    
    url_ = url;
    frame_cache_ = std::make_unique<FrameCacheMgr>(cached_dur_);
    
    
    
    
    
    decoding_thr_ = std::thread(std::bind(&VideoReaderStream::decodingThreadProc, this));
    
    return odp;
}

VoidResult VideoReaderStream::do_video_stream_close()
{
    abortDecodingThread();
    decoding_thr_.join();
    
    reader_->Close();
    reader_.reset();
    return {};
}



void VideoReaderStream::abortDecodingThread()
{
    std::unique_lock<std::mutex> lg(decLock_);
    abort_thr_ = true;
    decCond_.notify_one();
}

void VideoReaderStream::decodingThreadProc()
{
    bool decEOF = false;
    //int64_t decEnd {-1};
    int64_t decTs = kINVALID_TS;
    int64_t reqDecTs = kINVALID_TS;
    //bool waitFrame = false;
#if !PV_PLATFORM_WIN
    //pthread_setname_np("videoReaderStream[]::decodeingThread");
#endif

    for (;;) {
        //int64_t ts = -1;
        int64_t cached_begin = kINVALID_TS;
        int64_t cached_end = kINVALID_TS;
        
        
        bool decReq = false;
        bool readMore = false;
        
        {
            std::unique_lock<std::mutex> lg(decLock_);
            if (!frame_cache_->IsEmpty()) {
                // 计算出当前缓存的开始和结束时间
                
                cached_begin = frame_cache_->FirstTS();
                cached_end = frame_cache_->LastTS();
                LOG_INFO("zzzz SRCC_[%lld : %lld] .. %lld < %lld", cached_begin, cached_end, decTs, frame_cache_end_);
            }
            //LOG_ERROR("<<<<<<<<<<<<<<<<<<<<<");
            decCond_.wait(lg, [&]() {
                // abort current thread.
                // 结束
                if (abort_thr_)
                    return true;
                
                
                // triggered by caller.
                // 请求新的视频帧
                if (decReqTs_ != kINVALID_TS) {
                    decReq = true;
                    return true;
                }
                
                //decoding more frames.
                // 正在解码中，直到缓存足够
                if (!decEOF &&
                    frame_cache_begin_ != kINVALID_TS &&
                    frame_cache_end_ != kINVALID_TS &&
                    (cached_end <= frame_cache_end_)) {
                    
                    readMore = true;
                    return true;
                }
                
                return false;
            });
        }
        //
        //LOG_ERROR(">>>>>>>>>>>>>>>>>>>>>>>");
        if (abort_thr_) {
            // 结束线程
            LOG_INFO("SRCC_decoding thread aborted");
            break;
            
        } else if (decReq) { // state = 1/2
            // 请求新的视频帧
            
            reqDecTs = decReqTs_;
            decReqTs_ = kINVALID_TS;

            //LOG_WARN("request decode... : %lld", reqDecTs);
            
            
            if ((frame_cache_begin_ == kINVALID_TS || frame_cache_end_ == kINVALID_TS) ||
                reqDecTs < frame_cache_begin_ ||
                reqDecTs > frame_cache_end_) {
                // reset
                
                LOG_ERROR("zzzz SRCC_reset cache..");

                frame_cache_->Clear();

                decEOF = false;
                //int64_t new_ts = std::max(int64_t(reqDecTs - cached_dur_ / 2), 0LL);
                int64_t new_ts = reqDecTs;//std::max(int64_t(reqDecTs - cached_dur_ / 4), 0LL);
                auto seek_res = reader_->SeekTo(new_ts);
                if_result_failure(seek_res) {
                    LOG_ERROR("SRCC_AVAssetVideoReader::SeekTo(%lld) failure", new_ts);
                    break;
                }
            }
            
            frame_cache_end_ = reqDecTs + cached_dur_;
            frame_cache_begin_ = reqDecTs;
            
            
            
        } else if (readMore) {
        
            auto frame_res = reader_->ReadNextFrame();
            
            if_result_failure(frame_res) {
                LOG_ERROR("SRCC_read frame failure...xxxxxxxxxxxxxxxxxxxx");
                //decOutCond_.notify_one();
                //break;
                decEOF = true;
                //notify
                frame_cache_->MarkEOS();
                    
                if (expected_frame_ts_ != kINVALID_TS) {
                    
                    auto lastFrame = frame_cache_->GetLastFrame();
                    if_result_success (lastFrame) {
                        decoded_frame_ = *lastFrame;
                        
                    } else {
                        decoded_frame_.reset();//
                    }
                    expected_frame_ts_ = kINVALID_TS;
                    decOutCond_.notify_one();
                
                }
            
                continue;
            }
            
            
            decTs = frame_res->GetTimestamp();

            frame_cache_->AppendFrame(*frame_res, reqDecTs);
            
            if (expected_frame_ts_ != kINVALID_TS && decTs >= reqDecTs) {
            
                decoded_frame_ = *frame_res;
                expected_frame_ts_ = kINVALID_TS;
                decOutCond_.notify_one();
            }
            
           
        
        } else {
            std::terminate();
            //LOG_ERROR("WWTTTTTTTTTTTTTTTTTTFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
        }
        
        
        
    }
    
    
}


bool VideoReaderStream::requestDecode(int64_t ts, bool wait)
{
    //LOG_DEBUG("SRCC_ requestDecode(%lld, %d)", ts, wait);
    std::unique_lock<std::mutex> lg(decLock_);
    if (abort_thr_)
        return false;
    
    if (wait)
        expected_frame_ts_ = ts;
    decReqTs_ = ts;
    decCond_.notify_one();
    
    return true;
}


VideoFramePtr VideoReaderStream::waitDecodeFinish()
{
    LOG_DEBUG("zzzz SRCC_ waitDecodeFinish() begin");
    
    std::unique_lock<std::mutex> lg(decLock_);
    decOutCond_.wait(lg, [&](){
        return !!decoded_frame_;
    });
    VideoFramePtr ret = std::static_pointer_cast<VideoFrame>(decoded_frame_);
    decoded_frame_.reset();
    
    LOG_DEBUG("zzzz SRCC_ waitDecodeFinish(%lld) end", ret->GetTimestamp());
    
    return ret;
}

/**
 
 states:
 
 0          1               2        3
 .......[========|--------].........
 */


Result<VideoFramePtr> VideoReaderStream::do_video_stream_read_frame(int64_t ts, int64_t pos, bool seeked)
{
    
    LOG_ERROR("zzzz-[[[[ :%lld (%lld)", ts, pos);
    
    //Result<FramePtr> frame_res;
    

    auto frame_res = frame_cache_->GetFrameAt(ts);
    if_result_success(frame_res) {
        
        requestDecode(ts);
        //frame_res->UpdateTimestamp(ts);
        LOG_ERROR("zzzz-]]]]0 :%lld (%lld)", ts, pos);
        auto cur = frame_res->CastTo<VideoFrame>();
        return DuplicateVideoFrame(cur, ts);
        //return std::static_pointer_cast<VideoFrame>(*frame_res);
        
    } else {
        
        requestDecode(ts, true);
        VideoFramePtr vframe = waitDecodeFinish();
        if (!!vframe) {
            LOG_ERROR("zzzz-]]]] :%lld (%lld)", ts, pos);
            //vframe->UpdateTimestamp(ts);
            return DuplicateVideoFrame(vframe, ts);
            return vframe;
        }
    }
    
    return MakeResultFor(ResultCode::END);
}







}



namespace v0 {







VideoReaderStream::~VideoReaderStream() = default;

VideoReaderStream::VideoReaderStream(StreamContext& ctx)
 : VideoStream(ctx)
{    
    getConfigValidator().InsertString("url", true);
    getConfigValidator().InsertNumber("fps");
    getConfigValidator().InsertNumber("prefer-width");
    getConfigValidator().InsertNumber("prefer-height");
    getConfigValidator().InsertNumber("longest-side");
}


Result<VideoStreamOpenDataPtr> VideoReaderStream::do_video_stream_open(const Config& config)
{
    
    auto url = config.GetStringOr("url", "");
    int pwidth = config.GetIntNumberOr("prefer-width", 0);
    int pheight = config.GetIntNumberOr("prefer-height", 0);
    int lside = config.GetIntNumberOr("longest-side", 0);
    double fps = config.GetNumberOr("fps", 60);
    
    
    
    Config video_reader_cfg;
    video_reader_cfg.SetString("url", url);
    if (pwidth > 0 && pheight > 0) {
        video_reader_cfg.SetNumber("width", pwidth);
        video_reader_cfg.SetNumber("height", pheight);
    } else {
        // todo
        
        
    }
    
    reader_ = std::make_unique<FFmpegVideoReader>();
    //reader_ = std::make_unique<FakeVideoReader>();
    
    auto vres = reader_->Open(video_reader_cfg);
    RETURN_ON_FAILURE(vres);
    
    
    
    int64_t real_duration = reader_->GetDuration();
    int width = reader_->GetWidth();
    int height = reader_->GetHeight();
    int64_t duration = adjustDuration(real_duration, fps);
    
    auto tag = std::make_unique<VideoFrameTag>(VideoFormat::kARGB, width, height);
    
    ///
    auto odp = std::make_shared<VideoStreamOpenData>();
    odp->framerate = fps;
    //odp->framerate_den = 1000;
    odp->tag = std::move(tag);
    odp->duration = duration;
    
    url_ = url;
    

    return odp;
}

VoidResult VideoReaderStream::do_video_stream_close()
{

    reader_->Close();
    reader_.reset();
    return {};
}





Result<VideoFramePtr> VideoReaderStream::do_video_stream_read_frame(int64_t ts, int64_t pos, bool seeked)
{
    if (seeked) {
        reader_->SeekTo(ts);
    }
    
   
    last_pos_ = pos;
    
    
    
    LOG_ERROR("zzzz-[[[[ :%lld (%lld)", ts, pos);
    
    auto frame_res = reader_->ReadNextFrame();
    if_result_failure(frame_res) {
        return RESULT_FOR(VideoFramePtr, ResultCode::END);
    }

    
    return std::static_pointer_cast<VideoFrame>(*frame_res);
}











}







}
