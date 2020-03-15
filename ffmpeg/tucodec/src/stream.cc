#include "stream.hh"

#include <cassert>

#include "log.hh"


namespace pulsevideo {



    Stream::~Stream() noexcept {
        assert(GetState() == StreamState::kINIT);
    }

BoolResult Stream::Open(const Config& config)
{

    if (!testState(StreamState::kINIT)) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
    }

	if (!getConfigValidator().Validate(config)) {
		return MakeResultFor(ResultCode::INVALID_ARG);
	}

	setConfig(config);

    auto odp_res = do_stream_open(config);
    if_result_failure (odp_res) {
        return odp_res;
    }

    StreamOpenDataPtr odp = *odp_res;

    if (!odp->tag) {
        return MakeResultFor(RESULT_FAILURE);
    }
    if (odp->duration <= 0) {
        return MakeResultFor(RESULT_FAILURE);
    }

    tag_ = std::move(odp->tag);
    duration_ = odp->duration;
    current_ = 0;

	setState(StreamState::kRUNNING);
    return true;
}


VoidResult Stream::Close()
{

    if (!testStates({StreamState::kRUNNING})) {
        return MakeResultFor(RESULT_FAILURE);
    }
    auto res = do_stream_close();
    setState(StreamState::kINIT);
    return res;
}


IntResult Stream::Seek(int64_t pts)
{
	if (!testStates({StreamState::kRUNNING})) {
        return MakeResultFor(ResultCode::ILLEGAL_STATE);
	}

    auto res = do_stream_seek(pts);
    if_result_failure(res) {
        return res;
    }
    current_ = *res;
	return res;
}


Result<FramePtr> Stream::ReadFrame(int64_t ts)
{
    if (!testStates({StreamState::kRUNNING})) {
        return MakeResultFor(RESULT_FAILURE, _RMSG("operation not allowed: state == %d", GetState()));
    }

    auto res = do_stream_read_frame(ts);
    if_result_failure(res) {
        return res;
    }

    return res;
}


Result<FramePtr> Stream::ReadNextFrame()
{
    if (!testStates({StreamState::kRUNNING})) {
        return MakeResultFor(RESULT_FAILURE, _RMSG("operation not allowed: state == %d", GetState()));
    }

    auto res = do_stream_read_frame(kNEXT_TS);
    if_result_failure(res) {
        return res;
    }

    return res;
}


bool Stream::setFrameTag(FrameTagUPtr&& tag)
{
    if (!tag) {
        LOG_ERROR("empty FrameTag");
        std::terminate();
        return false;
    }
    if (mtype_ != tag->mediaType) {
        LOG_ERROR("MediaType not match");
        std::terminate();
        return false;
    }
    tag_ = std::move(tag);
    return true;
}

//////////////////////////////////////////////////////////////////


VideoStream::~VideoStream() noexcept = default;

Result<StreamOpenDataPtr> VideoStream::do_stream_open(const Config& config)
{
    auto od_res = do_video_stream_open(config);
    if_result_failure(od_res) {
        return od_res;
    }

    VideoStreamOpenDataPtr odp = *od_res;
    //if (odp->step < 0) {
    if (odp->framerate <= 0) {
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    }

    //auto vtag = std::static_pointer_cast<VideoFrameTag>(odp->tag);
    //step_ = odp->step;

    framerate_ = odp->framerate;
    //framerate_num_ = odp->framerate_num;
    //framerate_den_ = odp->framerate_den;
    //prev_frame_pos_ = 0;
    frame_pos_ = 0;
    //framerate_inv_ = framerate_den_ / (double)framerate_num_;

    return odp;
    //return std::static_pointer_cast<StreamOpenData>(odp);
}

VoidResult VideoStream::do_stream_close()
{
    return do_video_stream_close();
}

IntResult VideoStream::do_stream_seek(int64_t ts)
{
    int64_t pos = timestampToPos(ts);
    int64_t real_ts = posToTimestamp(pos);

    if (real_ts > GetDuration() || real_ts < 0) {
        return MakeResultFor(ResultCode::END);
    }

    //auto res = do_video_stream_seek(real_ts, pos);
    //if_result_failure(res) {
    //    return res;
    //}
    frame_pos_ = pos;
    int64_t next_ts = posToTimestamp(frame_pos_);
    //setCurrent(next_ts);
    return next_ts;
}


Result<FramePtr> VideoStream::do_stream_read_frame(int64_t ts)
{
    int64_t real_ts = 0;
    int64_t frame_pos = frame_pos_;
    if (ts == kNEXT_TS) {
        real_ts = frame_pos * (1 / framerate_) * 1000;
    } else {
        frame_pos = timestampToPos(ts);
        real_ts = posToTimestamp(frame_pos);
    }

    if (real_ts > GetDuration() || real_ts < 0) {
        return MakeResultFor(ResultCode::END);
    }
    
    bool seeked = (prev_frame_pos_ != frame_pos_) && (frame_pos_ != prev_frame_pos_ + 1);
    auto res = do_video_stream_read_frame(real_ts, frame_pos, seeked);
    if_result_failure(res) {
        return res;
    }

    frame_pos += 1;
    int64_t next_ts = posToTimestamp(frame_pos);
    setCurrent(next_ts);
    prev_frame_pos_ = frame_pos_;
    frame_pos_ = frame_pos;

    return res;
    //return std::static_pointer_cast<Frame>(res.Value());
}


#if 1


AudioStream::~AudioStream() noexcept = default;


Result<StreamOpenDataPtr> AudioStream::do_stream_open(const Config& config)
{

    auto od_res = do_audio_stream_open(config);
    if_result_failure(od_res) {
        return od_res;
    }

    AudioStreamOpenDataPtr odp = *od_res;
    if (!odp->tag) {
        return MakeResultFor(RESULT_FAILURE);
    }


    auto& atag = static_cast<AudioFrameTag&>(*odp->tag);

    sample_count_ = atag.sampleCount;
    sample_rate_  = atag.sampleRate;;
    channels_ = atag.channels;
    sample_pos_ = 0;

    return odp;
    //return std::static_pointer_cast<StreamOpenData>(odp);
}


VoidResult AudioStream::do_stream_close()
{
    return do_audio_stream_close();
}



IntResult AudioStream::do_stream_seek(int64_t ts)
{
    //int64_t new_ts = adjustTimestamp(ts);
    int64_t sample_pos = timestampToSamples(ts) / sample_count_ * sample_count_;
    int64_t real_ts = samplesToTimestamp(sample_pos);

    if (real_ts > GetDuration() || real_ts < 0) {
        return MakeResultFor(ResultCode::END);
    }

    //auto res = do_audio_stream_seek(real_ts, sample_pos);
    //if_result_failure(res) {
    //    return res;
    //}
    sample_pos_ = sample_pos;
    int64_t next_ts = samplesToTimestamp(sample_pos_);
    //setCurrent(next_ts);
    return next_ts;
}


Result<FramePtr> AudioStream::do_stream_read_frame(int64_t ts)
{
    int64_t real_ts;
    int64_t sample_pos = sample_pos_;

    if (ts == kNEXT_TS) {
        //real_ts = 1000 * sample_pos_ / sample_rate_;
        real_ts = samplesToTimestamp(sample_pos);
    } else {
        sample_pos = timestampToSamples(ts) / sample_count_ * sample_count_;
        real_ts = samplesToTimestamp(sample_pos);
    }


    if (real_ts > GetDuration() || real_ts < 0) {
        return MakeResultFor(ResultCode::END);
    }
    
    bool seeked = (prev_sample_pos_ != sample_pos_) && (prev_sample_pos_ + sample_count_ != sample_pos_);
    auto res = do_audio_stream_read_frame(real_ts, sample_pos, seeked);
    if_result_failure(res) {
        return res;
    }

    sample_pos += sample_count_;
    int64_t next_ts = samplesToTimestamp(sample_pos);
    setCurrent(next_ts);
    prev_sample_pos_ = sample_pos_;
    sample_pos_ = sample_pos;
    //current_ = next_ts;

    return res;
    //return std::static_pointer_cast<Frame>(res.Value());
}

#if 0
int64_t AudioStream::adjustTimestamp(int64_t ts)
{
    int64_t new_ts = ts * sample_rate_ / sample_count_ * sample_count_ / sample_rate_;
    return new_ts;
}

int64_t AudioStream::samplesToTimestamp(int64_t sc)
{
	return sc * 1000 / sample_rate_;
}

int64_t AudioStream::timestampToSamples(int64_t ts)
{
	return ts * sample_rate_ / 1000;
}
#endif

#endif

}
