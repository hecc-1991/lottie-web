#include "ffmpeg_reader.hh"

#include <cassert>

#include "mem_frame.hh"

#include "audio_buffer.hh"
#include "log.hh"
#include "ffmpeg_util.hh"

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>

#include <libavutil/opt.h>
#include <libavutil/channel_layout.h>
#include <libavutil/samplefmt.h>
#include <libswresample/swresample.h>
}



namespace pulsevideo {


	const static AVRational _defaultRational{ 1, 1000 };


	struct ImplBase {

		AVFormatContext* fmt_ctx = NULL;
		AVCodecContext* dec_ctx = NULL;
		AVStream* stream = NULL;
		AVFrame* out_frame = NULL;
		int streamIdx = -1;

		bool eos = false;
		bool eos_send = false;

		std::string url;

		IntResult seek(int64_t ts) {
			int64_t seekPTS = av_rescale_q_rnd(ts, _defaultRational, fmt_ctx->streams[streamIdx]->time_base, AV_ROUND_ZERO);

			avcodec_flush_buffers(dec_ctx);
			int ret = av_seek_frame(fmt_ctx, streamIdx, seekPTS, AVSEEK_FLAG_BACKWARD);
			if (ret < 0) {
				return INT_RESULT_FOR(ResultCode::OUT_OF_RANGE, _RMSG("can not seek to :%lld/%lld", ts, seekPTS));
			}

			eos = false;
			eos_send = false;
			return ts;
		}

		AVPacket* readPacket() {

			AVPacket pkt = { 0 };
			int ret = 0;

			do {
                av_packet_unref(&pkt);
				ret = av_read_frame(fmt_ctx, &pkt);
				
			} while (ret == 0 && pkt.stream_index != streamIdx);
		
			if (ret)
				return nullptr;


			AVPacket* retPkt = av_packet_clone(&pkt);
			av_packet_unref(&pkt);

			return retPkt;
		}

		IntResult setupCodec(AVMediaType mediaType) {


			int ret = 0;

			if ((ret = avformat_open_input(&fmt_ctx, url.c_str(), NULL, NULL)) < 0) {
				LOG_ERROR("Could not open source file : %s, ret : ", url.c_str(), ret);
				return INT_RESULT_FOR(RESULT_FAILURE, _RMSG("invalid url : %s", url.c_str()));
			}

			/* retrieve stream information */
			if ((ret = avformat_find_stream_info(fmt_ctx, NULL)) < 0) {
				LOG_ERROR("Could not find stream information, ret : %d", ret);
				return INT_RESULT_FOR(RESULT_FAILURE, _RMSG("damaged file"));
			}


			streamIdx = av_find_best_stream(fmt_ctx, mediaType, -1, -1, NULL, 0);
			if (streamIdx < 0) {
				LOG_ERROR("Could not find %s stream", av_get_media_type_string(mediaType));
				return INT_RESULT_FOR(RESULT_FAILURE, _RMSG("invalid file"));
			}

			av_dump_format(fmt_ctx, 0, url.c_str(), 0);

			AVStream *stream = fmt_ctx->streams[streamIdx];
			AVCodec *dec = avcodec_find_decoder(stream->codecpar->codec_id);
			if (!dec) {
				LOG_ERROR("Could not find %s codec : %d", av_get_media_type_string(mediaType), stream->codecpar->codec_id);
				return  INT_RESULT_FOR(RESULT_FAILURE, _RMSG("no such codec : %d", stream->codecpar->codec_id));
			}

			dec_ctx = avcodec_alloc_context3(dec);
			if (!dec_ctx) {
				LOG_ERROR("Failed to allocate the %s codec context", av_get_media_type_string(mediaType));
				return  INT_RESULT_FOR(RESULT_FAILURE, _RMSG("oom"));
			}
			
			/* Copy codec parameters from input stream to output codec context */
			if ((ret = avcodec_parameters_to_context(dec_ctx, stream->codecpar)) < 0) {
				LOG_ERROR("Failed to copy %s codec parameters to decoder context", av_get_media_type_string(mediaType));
				return  INT_RESULT_FOR(RESULT_FAILURE, _RMSG("avcodec_parameters_to_context return %d", ret));
			}

			AVDictionary *opts = NULL;
			/* Init the decoders, with or without reference counting */
			av_dict_set(&opts, "refcounted_frames", "1", 0);
			if ((ret = avcodec_open2(dec_ctx, dec, &opts)) < 0) {
				LOG_ERROR("Could not open %s codec", av_get_media_type_string(mediaType));
				return  INT_RESULT_FOR(RESULT_FAILURE, _RMSG("avcodec_open2 return %d", ret));
			}

			out_frame = av_frame_alloc();


			return 0;

		}


		BoolResult readNextFrameTo(AVFrame* out_frame) {

			//static int pktCount;
			//static int frameCount;

			if (eos)
				return BOOL_RESULT_FOR(ResultCode::END, _RMSG("EOF"));

			do {
				//AVFrame* frame = out_frame;
				//	AVFrameGuard frameGuard(frame);
                av_frame_unref(out_frame);
				int ret = avcodec_receive_frame(dec_ctx, out_frame);
				if (!ret) {

					
					out_frame->pts = av_rescale_q(out_frame->best_effort_timestamp, fmt_ctx->streams[streamIdx]->time_base, _defaultRational);
			    	//retFrame = MakeFrame<VideoMemFrame>(std::static_pointer_cast<VideoFrameTag>(GetFrameTag()), pts);//convertFrame(frame);
				
					// /* convert to destination format */
					//uint8_t* dst_data[4]{ 0 };
					//int dst_linesize[4]{ 0 };
					//dst_data[0] = std::static_pointer_cast<VideoMemStub>(retFrame->GetStub())->GetMutableData();
					//dst_linesize[0] = std::static_pointer_cast<VideoMemStub>(retFrame->GetStub())->GetStride();
					//int h = sws_scale(impl_->sws_ctx, (const uint8_t * const*)frame->data,
					//	frame->linesize, 0, impl_->realHeight, dst_data, dst_linesize);

					//fwrite(dst_data[0], 1, h * dst_linesize[0], s_fp);
					///printf("get frame pts : %d  - %lld\n", frameCount++, out_frame->pts);
					break;

				}
				if (ret == AVERROR_EOF) {
					eos = true;
					return BOOL_RESULT_FOR(ResultCode::END, _RMSG("EOF"));
				}
				else if (ret != AVERROR(EAGAIN)) {
					//setState(AVReaderState::kDEAD);
					return BOOL_RESULT_FOR(ResultCode::SYS, _RMSG("avcodec_receive_frame() return : %d", ret));
				}


				if (!eos_send) {
					AVPacket* avpkt = readPacket();
					///if (avpkt)
						///printf("read pkt : %d \n", pktCount++);
					AVPacketGuard pktGuard(avpkt);
					ret = avcodec_send_packet(dec_ctx, avpkt);
					if (!avpkt)
						eos_send = true;

					if (ret != 0) {
						//setState(AVReaderState::kDEAD);
						return BOOL_RESULT_FOR(ResultCode::SYS, _RMSG("avcodec_send_packet() return : %d", ret));
					}

				}

			} while (true);

			return true;
		}



		virtual ~ImplBase () {

			if (dec_ctx)
				avcodec_free_context(&dec_ctx);		
			if (fmt_ctx)
				avformat_close_input(&fmt_ctx);
			
			if (out_frame)
				av_frame_free(&out_frame);
		}
		ImplBase() = default;
    };

//#define DST_PIX_FMT AV_PIX_FMT_BGRA
    
    struct FFmpegVideoReader::Impl : public ImplBase {


		SwsContext* sws_ctx = NULL;

		int width = 0;
		int height = 0;
		double framerate = 0;

		int realWidth = 0;
		int realHeight = 0;
		double realFramerate = 0;

		int scaleWidth = 0;
		int scaleHeight = 0;


		bool setupScale(VideoFormat fmt, AVPixelFormat pixFmt, int iwidth, int iheight) {
			// fmt never changed
            if (sws_ctx && iwidth == scaleWidth && iheight == scaleHeight)
				return true;
            
            AVPixelFormat dstPixFmt = AV_PIX_FMT_BGRA;
            if (fmt == VideoFormat::kI420)
                dstPixFmt = AV_PIX_FMT_YUV420P;

			sws_ctx = sws_getContext(iwidth, iheight, pixFmt, width, height, dstPixFmt, SWS_FAST_BILINEAR, NULL, NULL, NULL);
			if (!sws_ctx)
				return false;

			scaleWidth = iwidth;
			scaleHeight = iheight;

			return true;

		}

		Impl(std::string_view url, int preferWidth, int preferHeight) {

			this->url = url;
			this->width = preferWidth;
			this->height = preferHeight;

		}

		~Impl() {
			if (sws_ctx)
				sws_freeContext(sws_ctx);
		}
    };

FFmpegVideoReader::FFmpegVideoReader()
{
    getConfigValidator().InsertString("url", true);
    getConfigValidator().InsertNumber("fps");
    getConfigValidator().InsertNumber("width");
    getConfigValidator().InsertNumber("height");
    
   // impl_ = std::make_unique<Impl>();
}
FFmpegVideoReader::~FFmpegVideoReader() = default;


Result<VideoReaderOpenDataPtr> FFmpegVideoReader::do_open_video(const Config& config)
{


    auto inputUrl = config.GetString("url");
    auto inputWidth = config.GetIntNumberOr("width", 0);
    auto inputHeight = config.GetIntNumberOr("height", 0);
    //fps_ = config.GetIntNumberOr("fps", 0);

	auto impl = std::make_unique<Impl>(inputUrl, inputWidth, inputHeight);


	auto res = impl->setupCodec(AVMEDIA_TYPE_VIDEO);
	RETURN_ON_FAILURE(res);

	impl->realWidth = impl->dec_ctx->width;
	impl->realHeight = impl->dec_ctx->height;
	if (impl->width == 0)
		impl->width = impl->realWidth;
	if (impl->height == 0)
		impl->height = impl->realHeight;
	impl->realFramerate = av_q2d(impl->dec_ctx->framerate);

    auto preferFMT = VideoFormat::kARGB;

	if (!impl->setupScale(preferFMT, impl->dec_ctx->pix_fmt, impl->realWidth, impl->realHeight)) {

		return  RESULT_FOR(VideoReaderOpenDataPtr, RESULT_FAILURE, _RMSG("setupScale() failed"));
	}
	

	int64_t duration = av_rescale_q( impl->fmt_ctx->streams[impl->streamIdx]->duration,
								impl->fmt_ctx->streams[impl->streamIdx]->time_base, _defaultRational);

    auto tag = std::make_unique<VideoFrameTag>(preferFMT, impl->width, impl->height);



    VideoReaderOpenDataPtr odp = std::make_shared<VideoReaderOpenData>();
    odp->duration = duration;
    odp->tag = std::move(tag);
    odp->frame_rate = impl->realFramerate;//track.nominalFrameRate;

	impl_ = std::move(impl);

    return odp;
}

VoidResult FFmpegVideoReader::do_close()
{
	impl_.reset();
    return {};
}


IntResult FFmpegVideoReader::do_seek(int64_t ts)
{
	return impl_->seek(ts);
}

Result<VideoFramePtr> FFmpegVideoReader::do_read_next_video_frame()
{

	AVFrame* frame = av_frame_alloc();
	if (!frame) {
		return RESULT_FOR(VideoFramePtr, ResultCode::NO_MEM, _RMSG("OOM"));
	}
	AVFrameGuard frameGuard(frame);

	auto res = impl_->readNextFrameTo(frame);
	if_result_success(res) {
        
        if (frame->pts > GetDuration()) {
            return RESULT_FOR(VideoFramePtr, ResultCode::END);
        }

        ////auto memstub = std::make_shared<VideoMemStub>(GetVideoFrameTag());
		////VideoFramePtr retFrame = MakeFrame<VideoFrame>(GetVideoFrameTag(), memstub, frame->pts);//convertFrame(frame);

        auto retFrame = MakeVideoFrame<VideoMemStub>(GetVideoFrameTag(), frame->pts);
        auto memstub = retFrame->GetStub<VideoMemStub>();
#if 1
		 /* convert to destination format */
		uint8_t* dst_data[4]{ 0 };
		int dst_linesize[4]{ 0 };
		dst_data[0] = memstub->GetMutableData(0);
        dst_data[1] = memstub->GetMutableData(1);
        dst_data[2] = memstub->GetMutableData(2);
		dst_linesize[0] = (int)memstub->GetStride(0);
        dst_linesize[1] = (int)memstub->GetStride(1);
        dst_linesize[2] = (int)memstub->GetStride(2);
        
		int h = sws_scale(impl_->sws_ctx, (const uint8_t * const*)frame->data,
			frame->linesize, 0, impl_->realHeight, dst_data, dst_linesize);

		//fwrite(dst_data[0], 1, h * dst_linesize[0], s_fp);
#endif
		return retFrame;
	}

	if (!res.TestCode(ResultCode::END)) {
		setState(AVReaderState::kDEAD);
	}

	return res;

}


    
    
    
struct FFmpegAudioReader::Impl : public ImplBase {

	std::unique_ptr<AudioBuffer<int16_t>> audioBuffer;

	int maxTmpSampleCount = 1024;
	uint8_t* tmpSampleData[2] {nullptr};
	int tmpSampleLinesize {0};
	int64_t samplePos = -1;
	bool resampleFlushed = false;
	bool audioBufferEOS = false;

	SwrContext* swr_ctx = NULL;
	int channels = 0;
	int samplerate = 0;
	int sampleCount = 0;//frame size
	//AVSampleFormat sampleFmt = 0;

	int realChannels = 0;
	int realSamplerate = 0;
	AVSampleFormat realSampleFmt = AV_SAMPLE_FMT_NONE;

	int swrChannels = 0;
	int swrSamplerate = 0;
	AVSampleFormat swrSampleFmt = AV_SAMPLE_FMT_NONE;


	bool setupResample(AVSampleFormat sampleFmt, int ichannels, int isamplerate) {

		if (swr_ctx && sampleFmt == swrSampleFmt && ichannels == swrChannels &&
			isamplerate == swrSamplerate)
			return true;

		swr_ctx = swr_alloc();
		if (!swr_ctx)
			return false;

		/* set options */
		av_opt_set_int(swr_ctx, "in_channel_layout", dec_ctx->channel_layout, 0);
		av_opt_set_int(swr_ctx, "in_sample_rate", dec_ctx->sample_rate, 0);
		av_opt_set_sample_fmt(swr_ctx, "in_sample_fmt", dec_ctx->sample_fmt, 0);

		av_opt_set_int(swr_ctx, "out_channel_layout", (channels == 2) ? AV_CH_LAYOUT_STEREO : AV_CH_LAYOUT_MONO, 0);
		av_opt_set_int(swr_ctx, "out_sample_rate", samplerate, 0);
		av_opt_set_sample_fmt(swr_ctx, "out_sample_fmt", AV_SAMPLE_FMT_S16, 0);
		
		int ret = 0;
		/* initialize the resampling context */
		if ((ret = swr_init(swr_ctx)) < 0) {
			LOG_ERROR("Failed to initialize the resampling context, swr_init() return : %d", ret);
			return false;
		}

		swrChannels = ichannels;
		swrSamplerate = isamplerate;
		swrSampleFmt = sampleFmt;


		return true;

	}

	Impl(std::string_view url, int channels, int samplerate, int count) {
		this->url = url;
		this->channels = channels;
		this->samplerate = samplerate;
		this->sampleCount = count;


        audioBuffer = std::make_unique<AudioBuffer<int16_t>>(channels);

		int ret = av_samples_alloc(tmpSampleData, &tmpSampleLinesize, channels,
			maxTmpSampleCount, AV_SAMPLE_FMT_S16, 32);
		assert(ret >= 0);
	}

	~Impl() {
		if (swr_ctx)
			swr_free(&swr_ctx);

		if (tmpSampleData[0])
			av_freep(&tmpSampleData[0]);

	}
};
    
    
    
    
    FFmpegAudioReader::FFmpegAudioReader()
    {
        getConfigValidator().InsertString("url", true);
        getConfigValidator().InsertNumber("sample-rate");
        getConfigValidator().InsertNumber("sample-count");
        getConfigValidator().InsertNumber("channels");
        
    }
    
    FFmpegAudioReader::~FFmpegAudioReader() = default;
    
    
    Result<AudioReaderOpenDataPtr> FFmpegAudioReader::do_open_audio(const Config& config)
    {
	
        auto url = config.GetString("url");
        auto samplerate = config.GetIntNumberOr("sample-rate", 44100);
        auto channels = config.GetIntNumberOr("channels", 2);
        auto sampleCount = config.GetIntNumberOr("sample-count", 1024);
        
        if (channels > 2) {
            return MakeResultFor(ResultCode::NOT_ALLOWED, _RMSG("channels > 2 not allowed!"));
        }
        

		auto impl = std::make_unique<Impl>(url, channels, samplerate, sampleCount);

		auto res = impl->setupCodec(AVMEDIA_TYPE_AUDIO);
		RETURN_ON_FAILURE(res);

		impl->realSamplerate = impl->dec_ctx->sample_rate;
		impl->realChannels = impl->dec_ctx->channels;
		impl->realSampleFmt = impl->dec_ctx->sample_fmt;

		impl->samplerate = samplerate;
		impl->channels = channels;
		impl->sampleCount = sampleCount;
	


		if (!impl->setupResample(impl->realSampleFmt, impl->realChannels, impl->realSamplerate)) {

			return  RESULT_FOR(VideoReaderOpenDataPtr, RESULT_FAILURE,
				_RMSG("setupResample(%d, %d, %d) failed", impl->realSampleFmt, impl->realChannels, impl->realSamplerate));
		}

        
        auto tag = std::make_unique<AudioFrameTag>(AudioFormat::kS16, channels, samplerate, sampleCount);

		int64_t duration = av_rescale_q(impl->fmt_ctx->streams[impl->streamIdx]->duration,
										impl->fmt_ctx->streams[impl->streamIdx]->time_base, _defaultRational);
        
        auto odp = std::make_shared<AudioReaderOpenData>();
        odp->duration = duration;
        odp->tag = std::move(tag);

		impl_ = std::move(impl);

        return odp;
    }
    
    VoidResult FFmpegAudioReader::do_close()
    {
        impl_.reset();
        return {};
    }
    
    
    IntResult FFmpegAudioReader::do_seek(int64_t ts)
    {
		impl_->samplePos = -1;
		impl_->audioBufferEOS = false;
		impl_->resampleFlushed = false;
		return impl_->seek(ts);
    }
    
    Result<AudioFramePtr> FFmpegAudioReader::do_read_next_audio_frame()
    {
      

		
		if (impl_->audioBufferEOS)
			return RESULT_FOR(VideoFramePtr, ResultCode::END, _RMSG("EOS"));

        while (impl_->audioBuffer->GetSize() < impl_->sampleCount && !impl_->resampleFlushed) {
            
			int ret = 0;
			AVFrame* frame = av_frame_alloc();
			if (!frame) {
				return RESULT_FOR(VideoFramePtr, ResultCode::NO_MEM, _RMSG("OOM"));
			}
			AVFrameGuard frameGuard(frame);
			auto res = impl_->readNextFrameTo(frame);
			//bool need_flush = false;
			if_result_failure(res) {
				if (!res.TestCode(ResultCode::END)) {
					setState(AVReaderState::kDEAD);
					return res;
				}
				
				//break;
				
				if (impl_->resampleFlushed) {
					break;
				}
				impl_->resampleFlushed = true;
			//	need_flush = true;
			}

			if (!impl_->resampleFlushed) {

				if (impl_->samplePos < 0) {
					impl_->samplePos = frame->pts * av_q2d(_defaultRational) * impl_->samplerate;
				}

				int64_t sample_count = av_rescale_rnd(swr_get_delay(impl_->swr_ctx, impl_->realSamplerate) + frame->nb_samples,
					impl_->samplerate, impl_->realSamplerate, AV_ROUND_UP);
				if (sample_count > impl_->maxTmpSampleCount) {
					av_freep(&impl_->tmpSampleData[0]);
					ret = av_samples_alloc(impl_->tmpSampleData, &impl_->tmpSampleLinesize, impl_->channels, sample_count, AV_SAMPLE_FMT_S16, 32);
					if (ret < 0) {
						return RESULT_FOR(AudioFramePtr, ResultCode::NO_MEM);
					}
					impl_->maxTmpSampleCount = sample_count;
				}

				ret = swr_convert(impl_->swr_ctx, impl_->tmpSampleData, sample_count, (const uint8_t **)frame->extended_data, frame->nb_samples);


			} else {
				ret = swr_convert(impl_->swr_ctx, impl_->tmpSampleData, impl_->maxTmpSampleCount, (const uint8_t **)NULL, 0);
			}
			if (ret < 0) {
				LOG_ERROR("swr_convert() return : %d", ret);
				return RESULT_FOR(AudioFramePtr, ResultCode::SYS, _RMSG("swr_convert() failed, return : %d", ret));
			}
				

            size_t wcount = impl_->audioBuffer->Enqueue((const int16_t*)impl_->tmpSampleData[0], ret);
            if (wcount < ret) {
                LOG_WARN("audio buffer overflowed, ignore current enqueue");
            }
		
        }

		if (impl_->audioBuffer->GetSize() == 0) {
			// no more audio data
			impl_->audioBufferEOS = true;
			return RESULT_FOR(VideoFramePtr, ResultCode::END, _RMSG("EOS"));
		}


        int64_t pts = impl_->samplePos * 1000 / impl_->samplerate; // ms
//        auto stub = std::make_shared<AudioMemStub>(GetAudioFrameTag());
//        auto fp = MakeFrame<AudioFrame>(GetAudioFrameTag(), stub, pts);
        
        auto fp = MakeAudioFrame<AudioMemStub>(GetAudioFrameTag(), pts);
        auto stub = fp->GetStub<AudioMemStub>();
        if (!fp) {
            return RESULT_FOR(AudioFramePtr, RESULT_FAILURE, _RMSG("OOM"));
        }

		//fprintf(stderr, "audio : %lld \n", pts);
        
        //auto stub = fp->GetStub<MemStub>();
        size_t r = impl_->audioBuffer->Dequeue((int16_t*)stub->GetMutableData(), impl_->sampleCount);
		if (r == 0) {
			//trailing frame, that size less than sampleCount
			impl_->audioBufferEOS = true;

			r = impl_->audioBuffer->Dequeue((int16_t*)stub->GetMutableData(), impl_->audioBuffer->GetSize());
			assert(r != 0);
		}
        
        impl_->samplePos += r;

		//fwrite(stub->GetData(), 1, stub->GetDataSize(), s_fp);
        
		return fp;
    }
    
    
    
}
