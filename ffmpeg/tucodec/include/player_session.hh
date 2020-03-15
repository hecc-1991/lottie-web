#ifndef PLAYER_SESSION_HH_
#define PLAYER_SESSION_HH_

#include <string>
#include <mutex>
#include <atomic>
#include <thread>
#include <memory>
#include <cassert>

#include "util.hh"
#include "result.hh"
#include "stateful.hh"
#include "codec.hh"
#include "frame.hh"

#include "video_stream.hh"
#include "audio_stream.hh"

#include "log.hh"
#include <sstream>

namespace pulsevideo {



/// 播放器状态
///
enum class PlayerStatus {
    kREADY,
    kPLAYING,
    kEOS,
    kDO_PLAY,
    kDO_PAUSE,
    kDO_RESUME,
    kDO_PREVIEW,
    kDO_SEEK,
};



/// Evt 用于 AVProcessor 于 PlayerSession 之间传递消息
///
using KeyString = std::string;
struct Evt {
    explicit Evt(KeyString en) : evt_name(en) {}
    virtual ~Evt() noexcept = default;
    DISABLE_COPY_AND_ASSIGN(Evt);

    virtual void dispose() = 0;

    KeyString evt_name;
};
using EvtPtr = std::shared_ptr<Evt>;


    //class PlayerSession;
struct NotifyEvt : public Evt {
    explicit NotifyEvt(KeyString en) : Evt(en) {}
    virtual ~NotifyEvt() = default;
};
using NotifyEvtPtr = std::shared_ptr<NotifyEvt>;


class PlayerSession;
using PlayerSessionPtr = std::shared_ptr<PlayerSession>;
using PlayerSessionWPtr = std::weak_ptr<PlayerSession>;

class AVProcessor;
using AVProcessorPtr = std::shared_ptr<AVProcessor>;
using AVProcessorWPtr = std::weak_ptr<AVProcessor>;

using EvtFunctor = std::function<BoolResult(PlayerSession&)>;
using PlayerFunctor = std::function<BoolResult(PlayerSession&)>;
using ProcessorFunctor = std::function<BoolResult(AVProcessor&)>;

struct FunctorEvt : public Evt {
	FunctorEvt() : Evt("functor-evt") {}
    virtual ~FunctorEvt() = default;
    
    

    BoolResult WaitComplete() {
        std::unique_lock<std::mutex> lg(lock_);
        cond_.wait(lg, [&](){
            return completed_;
        });
        return result_;
    }


    //virtual BoolResult disposeAndReturn() = 0;

protected:

    void notifyComplete(BoolResult result = true) {
        std::unique_lock<std::mutex> lg(lock_);
        completed_ = true;
        result_ = result;
        cond_.notify_one();
    }

private:
    std::mutex lock_;
    std::condition_variable cond_;
    bool completed_{false};
    BoolResult result_ {true};

};


struct ProcessorFunctorEvt : public FunctorEvt {

	explicit ProcessorFunctorEvt(AVProcessor& proc, ProcessorFunctor&& functor) : FunctorEvt(), processor_(proc), functor_(std::move(functor)) {}

	virtual void dispose() override {
		BoolResult res = functor_(processor_);//disposeAndReturn();
		notifyComplete(res);
	}

private:
	AVProcessor& processor_;
	ProcessorFunctor functor_;
};


struct PlayerFunctorEvt : public FunctorEvt {

	explicit PlayerFunctorEvt(PlayerSession& s, PlayerFunctor&& functor) : FunctorEvt(), session_(s), functor_(std::move(functor)) {}

	virtual void dispose() override {
		BoolResult res = functor_(session_);//disposeAndReturn();
		notifyComplete(res);
	}

private:
	PlayerSession& session_;
	PlayerFunctor functor_;
};


struct PlayerNotifyEvt : NotifyEvt {

	explicit PlayerNotifyEvt(PlayerStatus s, int64_t t) : NotifyEvt("player-notify"), status(s), pts(t) {}
	~PlayerNotifyEvt() = default;

	virtual void dispose() override {
	}


	PlayerStatus status;
	int64_t pts;
};


using PlayerNotifyEvtPtr = std::shared_ptr<PlayerNotifyEvt>;

using PlayerNotifyFunctor = std::function<void(PlayerStatus, int64_t ts)>;


/// 独立的线程,分别处理音频和视频
///
class AVProcessor : public Stateful {
	friend class PlayerSession;
public:
    AVProcessor(PlayerSession& session, MediaType type) noexcept : player_(session), type_(type) {}
    virtual ~AVProcessor() noexcept = default;
    DISABLE_COPY_AND_ASSIGN(AVProcessor);
    
    BoolResult Start();
    VoidResult Stop();
    BoolResult Reset();
    
    //////////////////////////////
	inline void SetTimestamp(int64_t ts) {
		ts_ = ts;
	}

	inline int64_t GetTimestamp() const {
		return ts_;
	}

	inline void ClearOutputs() {
		std::unique_lock<std::mutex>lg(lock_);
		out_que_.clear();
		cond_.notify_one();
	}

	inline void EnqueFrame(FramePtr f) {
		std::unique_lock<std::mutex>lg(lock_);
        if (!out_que_.empty()) {
            auto backTS = out_que_.back()->GetTimestamp();
            assert(f->GetTimestamp() > backTS);
        }
		out_que_.push_back(f);
		out_eos_ = false;
	}
    
    inline bool IsEos() {
        std::unique_lock<std::mutex>lg(lock_);
        return out_eos_;
    }
    
	inline void SetEOS(bool v = true) {
		std::unique_lock<std::mutex>lg(lock_);
		out_eos_ = v;
	}

	inline FramePtr DequeFrame() {
		std::unique_lock<std::mutex>lg(lock_);
		if (out_que_.empty())
			return nullptr;
		auto frame = out_que_.front();
		out_que_.pop_front();
		cond_.notify_one();
		return frame;
	}
	
	inline FramePtr PeekFrame() {
		std::unique_lock<std::mutex>lg(lock_);
		if (out_que_.empty())
			return nullptr;
		auto frame = out_que_.front();
		return frame;
	}

	inline size_t GetOutputSize() {
		std::unique_lock<std::mutex>lg(lock_);
		return out_que_.size();
	}

	inline void Wakeup() {
		std::unique_lock<std::mutex>lg(lock_);
		cond_.notify_one();
	}


	inline StreamPtr& GetOutputStream() {
		return stream_;
	}
    inline void SetOutputStream(StreamPtr s) {
        stream_ = s;
    }
    
    void DequeueFramesBefore(int64_t pts);

protected:

	inline PlayerSession& getPlayer() {
		return player_;
	}

	inline MediaType getType() const {
		return type_;
	}

	BoolResult postOperateEvent(EvtPtr ep);

	bool outputsFilled();

	inline bool isReading() const {
		return reading_;
	}
	inline void setReading(bool b) {
		reading_ = b;
	}

	inline bool shouldExit() const {
		return should_exit_;
	}

	inline std::mutex& getLock() {
		return lock_;
	}
	inline std::condition_variable& getCond() {
		return cond_;
	}


    inline void setOutputStream(StreamPtr s) {
        stream_ = s;
    }
    
	inline void setOutputLimit(int v) {
		out_que_limit_ = v;
	}

	inline std::deque<EvtPtr>& getEvtQueue() {
		return evt_que_;
	}

	inline StreamPtr getOutputStream() {
		return stream_;
	}

protected:

	EvtPtr dequeueEvent() {
		//std::unique_lock<std::mutex> lg(lock_);
		auto ep = evt_que_.front();
		evt_que_.pop_front();
		return ep;
	}

	//void closeAllStreams();

private:
	virtual void do_real_work() = 0;

	virtual BoolResult do_reset() = 0;


private:

	PlayerSession& player_;

	MediaType type_{ MediaType::kNONE };


	StreamPtr stream_;
	//StreamPtr output_stream_;

	std::thread thread_;
	std::mutex lock_;
	std::condition_variable cond_;

	std::deque<EvtPtr> evt_que_; ///<

	bool out_eos_{ false };
	std::deque<FramePtr> out_que_;
	int64_t out_que_limit_{ 100 };   ///< max buffering limitation
	int64_t ts_{ 0 };    /// < current timestamp

	bool reading_{ false };
	bool should_exit_{ false };  ///< true for exit
    
    
   
    
};



class AudioProcessor : public AVProcessor {
    friend class PlayerSession;
    
public:
    AudioProcessor(PlayerSession& session) noexcept;
    virtual ~AudioProcessor() = default;

    BoolResult seekTo(int64_t ts);
   
    
private:
    
	virtual BoolResult do_reset() override;

    virtual void do_real_work() override;

};


class VideoProcessor : public AVProcessor {
    friend class PlayerSession;
    
public:
    VideoProcessor(PlayerSession& session, void* view) noexcept;
    virtual ~VideoProcessor();

	BoolResult seekTo(int64_t ts);
    
	void setPreviewFrame(FramePtr);
	FramePtr getPreviewFrame() {
		return preview_frame_;
	}
	void clearPreviewFrame() {
		preview_frame_.reset();
	}
    
    

	//std::atomic<int64_t> vid_ts {0};

        
private:
        
    virtual BoolResult do_reset() override;

    virtual void do_real_work() override;

    //void* glContext_{nullptr};

    FramePtr preview_frame_;
    
};








DEFINE_STATE_BEGIN(PlayerSession)
STATE_ITEM(kREADY)
STATE_ITEM(kPLAYING)
STATE_ITEM(kPAUSED)
STATE_ITEM(kPREVIEWING)
STATE_ITEM(kDEAD)
DEFINE_STATE_END(PlayerSession)
/**

                    play()
   -+--> [kREADY] ------+--> [kPLAYING] <--------+
    |        |          |        |               |
    |        |          | pause()|               |
    |        |      [kPAUSED] <--+               |play()
    |        |          |                        |
    |        | preview()|                        |
    |        +----------+----+--> [kPREVIEWING] -+
    |                        |  preview()|
    |                        |           |
    |  seek()                |           |
    +------------------------+-----------+



 **/





struct PlayerParam {



};


class PlayerSession : public ConfigValidator, public Stateful {


    friend class AudioProcessor;
    friend class VideoProcessor;

/// operate-events for player
    friend struct AudioReadyEvt;
    friend struct VideoReadyEvt;
    friend struct FetchAudioEmptyEvt;
    friend struct FetchVideoEmptyEvt;

    
public:
    PlayerSession() = default;// : Session("editor-engine") {}
    virtual ~PlayerSession();// = default;
	DISABLE_COPY_AND_ASSIGN(PlayerSession);


	BoolResult Initialize(const PlayerParam& param);
	VoidResult Finalize();


    /// Player actions
    BoolResult Preview(int64_t ts = -1);
    BoolResult PreviewAsync(int64_t ts = -1);
    BoolResult Play();
    BoolResult Pause();
    BoolResult Seek(int64_t ts);
    
    
    
    
    void SetAudioStream(AudioStreamPtr& as) {
        audio_stream_ = as;
    }
    void SetVideoStream(VideoStreamPtr& vs) {
        video_stream_ = vs;
    }
    
    BoolResult SetAudioBuffer(int ms);
    BoolResult SetVideoBuffer(int ms);

    IntResult GetDuration();

  
    //PlayerNotifyEvtPtr WaitPlayerEvent();
    inline void InstallPlayerNotifyFunctor(PlayerNotifyFunctor&& f) {
        player_evt_functor_ = std::move(f);
    }
    
    Result<FramePtr> fetchVideoFrame();
    Result<FramePtr> fetchAudioFrame();

protected:

	void postOperateEvent(EvtPtr e);

	NotifyEvtPtr WaitNotifyEvt();


    void updateVideoTimestamp(int64_t pts);
    int64_t GetVideoTimestamp();

    void updateAudioTimestamp(int64_t pts);
    int64_t GetAudioTimestamp();

    void updateOutputTimestamp(int64_t);
    int64_t GetOutputTimestamp();

    inline AudioProcessor& getAudioProcessor() {
        return *audio_proc_;
    }

    inline VideoProcessor& getVideoProcessor() {
        return *video_proc_;
    }
    
protected:
    bool updateStreamDuration();

    inline void setAudioReady(bool b) {
        audio_que_ready_ = b;
    }
    inline void setVideoReady(bool b) {
        video_que_ready_ = b;
    }

    inline bool isAudioReady() const {
        return audio_que_ready_;
    }
    inline bool isVideoReady() const {
        return video_que_ready_;
    }

    inline void setAudioDrained(bool b) {
        audio_que_drained_.store(b, std::memory_order_relaxed);
    }
    inline void setVideoDrained(bool b) {
        video_que_drained_.store(b, std::memory_order_relaxed);
    }

    inline bool isAudioDrained() const {
        return audio_que_drained_.load(std::memory_order_relaxed);
    }
    inline bool isVideoDrained() const {
        return video_que_drained_.load(std::memory_order_relaxed);
    }

    inline bool isFetchReady() const {
        return ready_.load(std::memory_order_relaxed);
    }
    inline void setFetchReady(bool b) {
        ready_.store(b, std::memory_order_relaxed);
    }
    
    int64_t diff();
protected:

	void postNotifyEvent(NotifyEvtPtr e);

    PlayerFunctor obtainPlayFunctor();
	PlayerFunctor obtainPauseFunctor();
	PlayerFunctor obtainSeekFunctor(int64_t pts);
	PlayerFunctor obtainPreviewFunctor(int64_t pts);

  
    
private:
	BoolResult do_start(const PlayerParam& param);
	VoidResult do_stop();

	void operateDisposeProc();
	void notifyDisposeProc();

	void abortNotifyDisposeProc();
	void abortOperateDisposeProc();



	std::thread op_thread_;
	std::mutex op_lock_;
	std::condition_variable op_cond_;
	std::deque<EvtPtr> op_que_;
	bool op_abort_{ false };



	std::thread ntf_thread_;
	std::mutex ntf_lock_;
	std::condition_variable ntf_cond_;
	std::deque<NotifyEvtPtr> ntf_que_;
	bool ntf_abort_{ false };


    std::unique_ptr<AudioProcessor> audio_proc_;
    std::unique_ptr<VideoProcessor> video_proc_;



   

    void playerEventDisposeProc();
    std::thread player_thread_;
    std::mutex player_evt_lock_;
    std::condition_variable player_evt_cond_;
    std::deque<PlayerNotifyEvtPtr> player_evt_que_;
    PlayerNotifyFunctor player_evt_functor_ {nullptr};
    bool player_evt_que_abort_ {false};

    void postPlayerEvent(PlayerStatus s, int64_t pts);
    void abortPlayerEventDisposeThread();

    int64_t audio_duration_ {0};
    int64_t video_duration_ {0};
    
    bool audio_que_ready_{false};
    bool video_que_ready_{false};

    std::atomic_bool audio_que_drained_{false};
    std::atomic_bool video_que_drained_{false};

    std::atomic<int64_t> aud_ts_ {0};
    std::atomic<int64_t> vid_ts_ {0};
    std::atomic<int64_t> output_ts_ {0};
    std::atomic<int64_t> last_preview_ts_ {-1};

    //bool pause_or_resume_ {false};
    std::atomic_bool in_preview_mode_ {false};
    std::thread state_thread_;

    std::atomic_bool paused_{false};
    std::atomic_bool ready_{false};
    
    
    ////////////PreviewAsync()
    void abortPreviewDisposeThread();
    void previewDisposeProc();
    bool prev_thr_abort_ {false};
    std::mutex prev_lock_;
    std::condition_variable prev_cond_;
    std::thread prev_thr_;
    std::deque<int64_t> prev_ts_list_;

    
	VideoStreamPtr video_stream_;
	AudioStreamPtr audio_stream_;

};








}




#endif /* PLAYER_SESSION_HH_ */
