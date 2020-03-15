
#include "ffmpeg_producer.hh"


#include <cassert>

#include "mem_frame.hh"
#include "result.hh"
#include "log.hh"
#include "util.hh"
#include "ffmpeg_util.hh"

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>

//#include <libavutil/opt.h>
//#include <libavutil/channel_layout.h>
//#include <libavutil/samplefmt.h>
//#include <libswresample/swresample.h>
}

namespace pulsevideo {




struct FFmpegEncoder {
    
    FFmpegEncoder(AVFormatContext& ctx) : fmtCtx(ctx) {}
    ~FFmpegEncoder();
    
    BoolResult setupAudioCodec(const AudioFrameTag& atag);
    BoolResult setupVideoCodec(const VideoFrameTag& vtag, double fps);
    
    AVCodecContext* encCtx = nullptr;
    AVFormatContext& fmtCtx;
};

FFmpegEncoder::~FFmpegEncoder()
{
    
    if (encCtx) {
        //avcodec_close(encCtx);
        avcodec_free_context(&encCtx);
    }
//    if (frame_) {
//        av_frame_free(&frame_);
//    }
//    if (pkt_) {
//        av_packet_free(&pkt_);
//    }
}


BoolResult FFmpegEncoder::setupAudioCodec(const AudioFrameTag& atag)
{
    if (encCtx) {
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    }
    
    const AVCodec* codec = avcodec_find_encoder(AV_CODEC_ID_AAC);
    if (!codec) {
        return MakeResultFor(ResultCode::NOT_IMPL, _RMSG("avcodec_find_encoder(AV_CODEC_ID_AAC) failed"));
    }
    
    AVCodecContext* ctx = avcodec_alloc_context3(codec);
    if (!ctx) {
        return MakeResultFor(ResultCode::SYS, _RMSG("avcodec_alloc_context3() failed"));
    }
    
    ctx->bit_rate = 128 * 1000;//128k
    ctx->time_base = AVRational{ 1, atag.sampleRate };
    ctx->sample_fmt = AV_SAMPLE_FMT_FLTP;
    ctx->sample_rate = atag.sampleRate;
    assert(atag.channels <= 2);
    ctx->channels = atag.channels >= 2 ? 2 : 1;
    ctx->channel_layout = atag.channels >= 2 ? AV_CH_LAYOUT_STEREO : AV_CH_LAYOUT_MONO;
    ctx->frame_size = atag.sampleCount;
    
    if (avcodec_open2(ctx, codec, NULL) < 0) {
        return MakeResultFor(ResultCode::SYS, _RMSG("avcodec_open2() failed"));
    }
    
//    pkt_ = av_packet_alloc();
//
//    frame_ = av_frame_alloc();
//    frame_->nb_samples = ctx->frame_size;
//    frame_->format = ctx->sample_fmt;
//    frame_->channel_layout = ctx->channel_layout;
//
//    auto ret = av_frame_get_buffer(frame_, 0);
    
    
    encCtx = ctx;
    
    
    return true;
}


BoolResult FFmpegEncoder::setupVideoCodec(const VideoFrameTag& vtag, double fps)
{
    if (encCtx) {
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    }
    
    const AVCodec* codec = avcodec_find_encoder(AV_CODEC_ID_H264);
    if (!codec) {
        return MakeResultFor(ResultCode::NOT_IMPL, _RMSG("avcodec_find_encoder(AV_CODEC_ID_H264) failed"));
    }
    
    AVCodecContext* ctx = avcodec_alloc_context3(codec);
    if (!ctx) {
        return MakeResultFor(ResultCode::SYS, _RMSG("avcsodec_alloc_context3() failed"));
    }
    
    // not set bit_rate, imply crf:23
    //ctx->bit_rate = 2 * 1000 * 1000;
    
    ctx->width = vtag.width;
    ctx->height = vtag.height;
    ctx->time_base = AVRational{ 1, 1000 };
    ctx->framerate = AVRational{ int(fps * 1000), 1000 };
    
    ctx->gop_size = fps;
    ctx->max_b_frames = 2;
    if (vtag.format == VideoFormat::kI420)
        ctx->pix_fmt = AV_PIX_FMT_YUV420P;
    else if (vtag.format == VideoFormat::kARGB)
        ctx->pix_fmt = AV_PIX_FMT_BGRA;
    
    if (fmtCtx.oformat->flags & AVFMT_GLOBALHEADER)
        ctx->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;
    
    if (avcodec_open2(ctx, codec, NULL) < 0) {
        return MakeResultFor(ResultCode::SYS, _RMSG("avcodec_open2() failed"));
    }
    
    
    encCtx = ctx;
    
    return true;
}


struct Packet {
  
    DISABLE_COPY_AND_ASSIGN(Packet);
    
    Packet(AVPacket* pkt) {
        packet = pkt;
    }
    
    ~Packet() {
        av_packet_free(&packet);
    }
    int64_t pts = 0;
    AVPacket* packet = NULL;
};

using PacketPtr = SPtr<Packet>;


struct FFmpegProducer::Impl {
    
    FFmpegProducer& producer;
    
    Impl(FFmpegProducer& producer) : producer(producer) {
        
    }
    
    ~Impl() {
        
    }
    
    BoolResult setup(const std::string& path, AudioStreamPtr astream, VideoStreamPtr vstream);
    VoidResult cleanup();
    
    
    void audioEncodingThreadProc();
    void videoEncodingThreadProc();
    void produceThreadProc();
    
    void abortAudioThread();
    void abortVideoThread();
    
    void enqueAudioPacket(AVPacket* pkt);
    void enqueVideoPacket(AVPacket* pkt);
   
    PacketPtr dequeAudioPacket();
    PacketPtr dequeVideoPacket();
//
//    PacketPtr peekAudioPacket();
//    PacketPtr peekVideoPacket();
    
    
    
    std::unique_ptr<FFmpegEncoder> audioEncoder;
    std::unique_ptr<FFmpegEncoder> videoEncoder;
    
    
    AVFormatContext* fmtCtx = NULL;
    AVStream* audioStr = NULL;
    AVStream* videoStr = NULL;
    
    int64_t audio_pos_ = 0;
    
    //
    bool aborted_ = false;
    bool audio_aborted_ = false;
    bool video_aborted_ = false;

    
    std::thread produce_thread_;
    std::thread audio_thread_;
    std::thread video_thread_;

    std::mutex audio_lock_;
    std::condition_variable audio_cond_;
    std::mutex video_lock_;
    std::condition_variable video_cond_;
    std::mutex produce_lock_;
    std::condition_variable produce_audio_cond_;
    std::condition_variable produce_video_cond_;

    
    std::deque<PacketPtr> audio_queue_;
    std::deque<PacketPtr> video_queue_;
    bool audio_eos_ = false;
    bool video_eos_ = false;


};



VoidResult FFmpegProducer::Impl::cleanup()
{
    
    audioEncoder.reset();
    videoEncoder.reset();
    
    
    avformat_free_context(fmtCtx);
    
    return {};
}


BoolResult FFmpegProducer::Impl::setup(const std::string& path, AudioStreamPtr astream, VideoStreamPtr vstream)
{
    int ret = 0;
    
    if (vstream->GetVideoFrameTag().format != VideoFormat::kI420) {
        return MakeResultFor(ResultCode::NOT_IMPL, _RMSG("only support I420"));
    }
    
    /* allocate the output media context */
    ret = avformat_alloc_output_context2(&fmtCtx, NULL, NULL, path.c_str());
    if (!fmtCtx) {
        return MakeResultFor(ResultCode::IO, _RMSG("avformat_alloc_output_context2() return:%d", ret));
    }
    
    {
        audioEncoder = std::make_unique<FFmpegEncoder>(*fmtCtx);
        auto res = audioEncoder->setupAudioCodec(astream->GetAudioFrameTag());
        if_result_failure (res) {
            audioEncoder.reset();
            return res;
        }
        
        
        audioStr = avformat_new_stream(fmtCtx, audioEncoder->encCtx->codec);
        audioStr->id = fmtCtx->nb_streams - 1;
        
        
        ret = avcodec_parameters_from_context(audioStr->codecpar, audioEncoder->encCtx);
        if (ret < 0) {
            return MakeResultFor(ResultCode::SYS);
        }
        
    }
    
    {
        videoEncoder = std::make_unique<FFmpegEncoder>(*fmtCtx);
        auto res = videoEncoder->setupVideoCodec(vstream->GetVideoFrameTag(), vstream->GetFramerate());
        if_result_failure (res) {
            videoEncoder.reset();
            return res;
        }
        
        
        videoStr = avformat_new_stream(fmtCtx, videoEncoder->encCtx->codec);
        videoStr->id = fmtCtx->nb_streams - 1;
        
        ret = avcodec_parameters_from_context(videoStr->codecpar, videoEncoder->encCtx);
        if (ret < 0) {
            return MakeResultFor(ResultCode::SYS);
        }
    }
    
    
    av_dump_format(fmtCtx, 0, path.c_str(), 1);
    
    //if (!(fmt->flags & AVFMT_NOFILE)) {
    
    
    
    return true;
}




void FFmpegProducer::Impl::enqueAudioPacket(AVPacket* pkt) {
    
    std::unique_lock<std::mutex> lg(audio_lock_);
    auto p = MakeShared<Packet>(pkt);
    if (!pkt) {
        audio_eos_ = true;
        produce_audio_cond_.notify_one();
        return;
    }
    
    p->pts = av_rescale_q(pkt->pts, audioEncoder->encCtx->time_base, AVRational {1, 1000});
    pkt->pts = av_rescale_q(pkt->pts, audioEncoder->encCtx->time_base, audioStr->time_base);
    pkt->dts = av_rescale_q(pkt->dts, audioEncoder->encCtx->time_base, audioStr->time_base);
    pkt->stream_index = audioStr->id;
    
    LOG_DEBUG("enque audio packet : %lld", p->pts);
    audio_queue_.push_back(p);
    produce_audio_cond_.notify_one();
    
}


void FFmpegProducer::Impl::enqueVideoPacket(AVPacket* pkt) {
    
    std::unique_lock<std::mutex> lg(video_lock_);
    auto p = MakeShared<Packet>(pkt);
    if (!pkt) {
        video_eos_ = true;
        produce_video_cond_.notify_one();
        return;
    }
    p->pts = av_rescale_q(pkt->pts, videoEncoder->encCtx->time_base, AVRational {1, 1000});
    int64_t dts = av_rescale_q(pkt->dts, videoEncoder->encCtx->time_base, AVRational {1, 1000});

    pkt->pts = av_rescale_q(pkt->pts, videoEncoder->encCtx->time_base, videoStr->time_base);
    pkt->dts = av_rescale_q(pkt->dts, videoEncoder->encCtx->time_base, videoStr->time_base);
    pkt->stream_index = videoStr->id;
    

    LOG_DEBUG("enque video packet : %lld / %lld", dts, p->pts);
    video_queue_.push_back(p);
    
    produce_video_cond_.notify_one();
}

void FFmpegProducer::Impl::abortAudioThread()
{
    std::unique_lock<std::mutex> lg(audio_lock_);
    audio_aborted_ = true;
    audio_cond_.notify_one();
}


void FFmpegProducer::Impl::abortVideoThread()
{
    std::unique_lock<std::mutex> lg(video_lock_);
    video_aborted_ = true;
    video_cond_.notify_one();
}



//
//PacketPtr FFmpegProducer::Impl::peekAudioPacket() {
//
//    std::unique_lock<std::mutex> lg(audio_lock_);
//    if (audio_queue_.empty())
//        return nullptr;
//
//    return audio_queue_.front();
//}
//
//
//PacketPtr FFmpegProducer::Impl::peekVideoPacket() {
//
//    std::unique_lock<std::mutex> lg(video_lock_);
//    if (video_queue_.empty())
//        return nullptr;
//
//    return video_queue_.front();
//}


PacketPtr FFmpegProducer::Impl::dequeAudioPacket() {
    
    std::unique_lock<std::mutex> lg(audio_lock_);
    
    produce_audio_cond_.wait(lg, [&]() {
        return !audio_queue_.empty() || (audio_eos_ && audio_queue_.empty());
    });
    
    
    if (!audio_queue_.empty()) {
        auto ret = audio_queue_.front();
        audio_queue_.pop_front();
        audio_cond_.notify_one();
        return ret;
    }
    
    //if (audio_eos_)
    return nullptr;
}


PacketPtr FFmpegProducer::Impl::dequeVideoPacket() {
    
    std::unique_lock<std::mutex> lg(video_lock_);
    
    produce_video_cond_.wait(lg, [&]() {
        return !video_queue_.empty() || (video_eos_ && video_queue_.empty());
    });
    
    if (!video_queue_.empty()) {
        auto ret = video_queue_.front();
        video_queue_.pop_front();
        video_cond_.notify_one();
        return ret;
    }
    
    //if (video_eos_)
    return nullptr;
}


void FFmpegProducer::Impl::audioEncodingThreadProc()
{
    
    AVCodecContext* encCtx = audioEncoder->encCtx;
    AVFrame* avframe = av_frame_alloc();
    avframe->nb_samples = encCtx->frame_size;
    avframe->format = encCtx->sample_fmt;
    avframe->channel_layout = encCtx->channel_layout;
    
    auto ret = av_frame_get_buffer(avframe, 0);
    
    AVFrameGuard fg(avframe);
    
    bool eos = false;
    //AVPacketGuard pg(pkt);
    
    for (;!eos;) {
        
        
        {
            std::unique_lock<std::mutex> lg(audio_lock_);
            
            audio_cond_.wait(lg, [&](){
            
                if (audio_aborted_)
                    return true;
                
                if (audio_queue_.size() < 20)
                    return true;
                
                return false;
            });
            
        }
        if (audio_aborted_) {
            LOG_ERROR("audio-encoding thread aborted!");
            break;
        }
        
        LOG_DEBUG("to read next audio frame");
        
        auto frame_res = producer.getAudioStream()->ReadFrame();
        if_result_failure(frame_res) {
            
            eos = true;
            LOG_INFO("audio EOS");
            ret = avcodec_send_frame(encCtx, NULL);
        
        } else {
        
            LOG_INFO("audio got");
            auto aframe = frame_res->CastTo<AudioFrame>();
            auto mem_stub = aframe->GetStub<AudioMemStub>();
            
            mem_stub->ToAVFrame(avframe).Assert();

#if 1
            avframe->pts = av_rescale_q(audio_pos_, AVRational {1, aframe->GetSampleRate()}, encCtx->time_base);
            //avframe->dts = 0;
            audio_pos_ += aframe->GetSampleCount();
#else
            
            avframe->pts = av_rescale_q(frame_res->GetTimestamp(), AVRational{ 1, 1000 }, encCtx->time_base);
#endif
            
            ret = avcodec_send_frame(encCtx, avframe);
            if (ret < 0) {
                break;
                //return MakeResultFor(ResultCode::SYS);
            }
            
        }
        
        for (;;) {
            
            AVPacket* pkt = av_packet_alloc();
            ret = avcodec_receive_packet(encCtx, pkt);
            if (!ret) {
                enqueAudioPacket(pkt);
            } else if (ret == AVERROR(EAGAIN)) {
                break;
            } else if (ret == AVERROR_EOF) {
                LOG_INFO("audio flushed");
                enqueAudioPacket(NULL);
                break;
            } else {
                std::terminate();
            }
            
        }
        
    }
    
    LOG_INFO("audioEncodingThreadProc exit...");
    
    
}


void FFmpegProducer::Impl::videoEncodingThreadProc()
{
    
    AVCodecContext* encCtx = videoEncoder->encCtx;
    AVFrame* avframe = av_frame_alloc();
    avframe->format = encCtx->pix_fmt;
    avframe->width = encCtx->width;
    avframe->height = encCtx->height;
    
    auto ret = av_frame_get_buffer(avframe, 0);
    
    AVFrameGuard fg(avframe);
    
    bool eos = false;
    
    while (!eos) {
        
        
        {
            std::unique_lock<std::mutex> lg(video_lock_);
            
            video_cond_.wait(lg, [&](){
            
                if (video_aborted_)
                    return true;
                
                if (video_queue_.size() < 2)
                    return true;
                
                return false;
            });
            
        }
        if (video_aborted_) {
            LOG_ERROR("video-encoding thread aborted!");
            break;
        }
        LOG_DEBUG("to read next video frame");
        
        auto frame_res = producer.getVideoStream()->ReadFrame();
        if_result_failure(frame_res) {
            
            eos = true;
            LOG_INFO("video EOS");
            ret = avcodec_send_frame(encCtx, NULL);
            
        } else {
        
            LOG_INFO("video got");
        
            auto aframe = frame_res->CastTo<VideoFrame>();
            auto mem_stub = aframe->GetStub<VideoMemStub>();
            
            mem_stub->ToAVFrame(avframe).Assert();
           
            
            avframe->pts = av_rescale_q(frame_res->GetTimestamp(), AVRational{ 1, 1000 }, encCtx->time_base);
            
            ret = avcodec_send_frame(encCtx, avframe);
            if (ret < 0) {
                break;
                //return MakeResultFor(ResultCode::SYS);
            }
            
        }
        
        for (;;) {
            
            AVPacket* pkt = av_packet_alloc();
            ret = avcodec_receive_packet(encCtx, pkt);
            if (!ret) {
                enqueVideoPacket(pkt);
            } else if (ret == AVERROR(EAGAIN)) {
                break;
            } else if (ret == AVERROR_EOF) {
                LOG_INFO("video flushed");
                enqueVideoPacket(NULL);
                break;
            } else {
                std::terminate();
            }
            
        }
        
    }
    LOG_INFO("videoEncodingThreadProc exit...");
    
}

//#if 1
void FFmpegProducer::Impl::produceThreadProc()
{
    
    int ret = 0;
    PacketPtr audioPkt;
    PacketPtr videoPkt;
    
    AVDictionary *opt = NULL;
    /* Write the stream header, if any. */
    ret = avformat_write_header(fmtCtx, &opt);
    
    while (!aborted_) {
        
        if (!audioPkt)
            audioPkt = dequeAudioPacket();
        if (!videoPkt)
            videoPkt = dequeVideoPacket();
        
        
        if (!audioPkt && !videoPkt) {
            LOG_INFO("no more data");
            break;
            
        } else if (!audioPkt) {
            // mux video
            
            ret = av_interleaved_write_frame(fmtCtx, videoPkt->packet);
            videoPkt.reset();
            
        } else if (!videoPkt) {
            //mux audio
            
            ret = av_interleaved_write_frame(fmtCtx, audioPkt->packet);
            audioPkt.reset();
            
        } else {
            
            
            if (audioPkt->pts <= videoPkt->pts) {
                ret = av_interleaved_write_frame(fmtCtx, audioPkt->packet);
                audioPkt.reset();
            } else {
                ret = av_interleaved_write_frame(fmtCtx, videoPkt->packet);
                videoPkt.reset();
            }
            
        }
        
    }
    
    
    av_write_trailer(fmtCtx);
    /* Close the output file. */
    if (!(fmtCtx->oformat->flags & AVFMT_NOFILE))
        avio_closep(&fmtCtx->pb);
    
    
    LOG_INFO("produceThreadProc exit...");
    
}

//#endif



FFmpegProducer::FFmpegProducer() {

}
FFmpegProducer::~FFmpegProducer() noexcept = default;


BoolResult FFmpegProducer::do_start(ProducerParam& param)
{
    
    setPath(param.path);
    
    impl_ = std::make_unique<Impl>(*this);
    
    auto res = impl_->setup(param.path, getAudioStream(), getVideoStream());
    RETURN_ON_FAILURE (res);
    
    
    return true;
}
VoidResult FFmpegProducer::do_stop()
{
    
    
    impl_->produce_thread_.join();
    
    impl_->abortAudioThread();
    impl_->abortVideoThread();
    impl_->video_thread_.join();
    impl_->audio_thread_.join();
    
    
    auto res = impl_->cleanup();
    RETURN_ON_FAILURE (res);
    
    return {};
}


BoolResult FFmpegProducer::do_run()
{
    
    int ret = 0;
    if (!(impl_->fmtCtx->oformat->flags & AVFMT_NOFILE)) {
        ret = avio_open(&impl_->fmtCtx->pb, getPath().c_str(), AVIO_FLAG_WRITE);
        if (ret < 0) {
            return MakeResultFor(ResultCode::IO, _RMSG("avio_open() return: %d", ret));
        }
    }
    
    impl_->audio_thread_ = std::thread(std::bind(&Impl::audioEncodingThreadProc, impl_.get()));
    impl_->video_thread_ = std::thread(std::bind(&Impl::videoEncodingThreadProc, impl_.get()));
    
    impl_->produce_thread_ = std::thread(std::bind(&Impl::produceThreadProc, impl_.get()));
    
    return true;
}

VoidResult FFmpegProducer::do_cancel()
{
    impl_->aborted_ = true;
    
    return {};
}







}
