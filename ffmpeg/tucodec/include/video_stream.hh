#ifndef PULSEVIDEO_AVF_VIDEO_STREAM_H_
#define PULSEVIDEO_AVF_VIDEO_STREAM_H_

#include "stream.hh"

#include <thread>
#include <mutex>
#include <condition_variable>

#include "avreader.hh"

namespace pulsevideo
{

namespace v1
{

class VideoReaderStream : public VideoStream
{

public:
    VideoReaderStream(StreamContext &ctx);
    virtual ~VideoReaderStream();

protected:
    virtual Result<VideoStreamOpenDataPtr> do_video_stream_open(const Config &config) override;
    virtual VoidResult do_video_stream_close() override;

    virtual Result<VideoFramePtr> do_video_stream_read_frame(int64_t ts, int64_t pos, bool seeked) override;

private:
    VideoFramePtr getCachedFrame(int64_t ts);
    void appendFrameToCache(FramePtr frame, int64_t lastReqTS);

    bool requestDecode(int64_t ts);
    bool responseFrame(int64_t ts, bool &waitFrame);
    VideoFramePtr waitDecodeFinish();

    void decodingThreadProc();
    void abortDecodingThread();

    std::string url_;

    bool abort_thr_{false};
    std::thread decoding_thr_;

    std::mutex decLock_;
    std::condition_variable decCond_;
    std::condition_variable decOutCond_;

    int64_t decReqTs_{-1};
    //int64_t decRespTs_ {-1};

    VideoFramePtr decoded_frame_;

    //void notifyDecodingReady();
    //void resetDecodingReady();

    //int64_t cached_begin_ {0};
    //int64_t cached_end_ {0};
    std::deque<FramePtr> cached_frames_;
    int cached_dur_{500};
    int reset_threshold_{100};
    //int backward_fill_threshold_ {1000};

    //Config config_;

    std::unique_ptr<VideoReader> reader_;
};

} // namespace v1

namespace v2
{

class FrameCacheMgr
{

public:
    FrameCacheMgr(int64_t max_dur);
    ~FrameCacheMgr();

    void Clear();

    bool IsEmpty() const;
    size_t Size() const;

    int64_t FirstTS() const;
    int64_t LastTS() const;

    Result<FramePtr> GetFirstFrame();
    Result<FramePtr> GetLastFrame();

    Result<FramePtr> GetFrameAt(int64_t ts);

    BoolResult AppendFrame(FramePtr frame, int64_t lastReqTS);

    inline void MarkEOS()
    {
        eos_flag_ = true;
    }

private:
    std::deque<FramePtr> frames_;
    int64_t max_duration_;
    size_t max_size_{std::numeric_limits<size_t>::max()};
    bool eos_flag_{false};
    mutable std::mutex lock_;
};

class VideoReaderStream final : public VideoStream
{

    friend class Makable<Stream>;

public:
    VideoReaderStream(StreamContext &ctx);
    virtual ~VideoReaderStream() noexcept;

protected:
    virtual Result<VideoStreamOpenDataPtr> do_video_stream_open(const Config &config) override;
    virtual VoidResult do_video_stream_close() override;

    virtual Result<VideoFramePtr> do_video_stream_read_frame(int64_t ts, int64_t pos, bool seeked) override;

private:
    bool requestDecode(int64_t ts, bool wait = false);
    //bool responseFrame(int64_t ts, bool& waitFrame);
    VideoFramePtr waitDecodeFinish();

    void decodingThreadProc();
    void abortDecodingThread();

    std::string url_;

    bool abort_thr_{false};
    std::thread decoding_thr_;

    std::mutex decLock_;
    std::condition_variable decCond_;
    std::condition_variable decOutCond_;

    using WakeupFunctor = std::function<bool()>;
    std::vector<WakeupFunctor> wakeup_list_;
    class Worker
    {

        virtual bool dispose() = 0;
    };
    using WorkerPtr = std::shared_ptr<Worker>;
    std::vector<WorkerPtr> worker_list_;

    int64_t decReqTs_{kINVALID_TS};
    //int64_t decRespTs_ {-1};

    //class FrameCacheMgr;

    std::unique_ptr<FrameCacheMgr> frame_cache_;
    //std::mutex frame_cache_lock_;
    int64_t frame_cache_begin_{kINVALID_TS};
    int64_t frame_cache_end_{kINVALID_TS};

    int64_t cached_dur_{200};
    //int reset_threshold_ {100};
    int64_t expected_frame_ts_{kINVALID_TS};
    FramePtr decoded_frame_;

    //bool reader_eos_ {false};
    std::unique_ptr<VideoReader> reader_;
};

} // namespace v2

namespace v0
{

// TEST ONLY
class VideoReaderStream : public VideoStream
{

public:
    VideoReaderStream(StreamContext &ctx);
    virtual ~VideoReaderStream();

public:
    virtual Result<VideoStreamOpenDataPtr> do_video_stream_open(const Config &config) override;
    virtual VoidResult do_video_stream_close() override;

    virtual Result<VideoFramePtr> do_video_stream_read_frame(int64_t ts, int64_t pos, bool seeked) override;

private:
    std::string url_;

    //bool reader_eos_ {false};
    std::unique_ptr<VideoReader> reader_;
    int64_t last_pos_{-1};
};

} // namespace v0

using namespace v0;

} // namespace pulsevideo

#endif
