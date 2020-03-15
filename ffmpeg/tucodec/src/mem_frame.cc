#include "mem_frame.hh"

#include <numeric>
#include <cassert>

#include "log.hh"

namespace pulsevideo {



#if PV_ENABLE_FFMPEG



BoolResult VideoMemStub::ToAVFrame(AVFrame* avframe)
{
    if (!avframe) {
        return MakeResultFor(ResultCode::INVALID_ARG);
    }
    
    if (avframe->width != (int)width_ || avframe->height != (int)height_ || avframe->format != AV_PIX_FMT_YUV420P) {
        return MakeResultFor(ResultCode::NOT_IMPL);
    }
    
    int ret = av_frame_make_writable(avframe);
    if (ret) {
        return MakeResultFor(ResultCode::NO_MEM);
    }
    
    
    {
        const uint8_t* sdata = GetData(0);
        uint8_t* ddata = avframe->data[0];
        
        size_t sstride = GetStride(0);
        size_t dstride = avframe->linesize[0];
        auto cstride = std::min(sstride, dstride);
        for (int l = 0; l < avframe->height; l++) {
            memcpy(ddata + dstride * l, sdata + sstride * l, cstride);
        }
    }
    {
        const uint8_t* sdata = GetData(1);
        uint8_t* ddata = avframe->data[1];
        
        size_t sstride = GetStride(1);
        size_t dstride = avframe->linesize[1];
        auto cstride = std::min(sstride, dstride);
        for (int l = 0; l < avframe->height / 2; l++) {
            memcpy(ddata + dstride * l, sdata + sstride * l, cstride);
        }
    }
    {
        const uint8_t* sdata = GetData(2);
        uint8_t* ddata = avframe->data[2];
        
        size_t sstride = GetStride(2);
        size_t dstride = avframe->linesize[2];
        auto cstride = std::min(sstride, dstride);
        for (int l = 0; l < avframe->height / 2; l++) {
            memcpy(ddata + dstride * l, sdata + sstride * l, cstride);
        }
    }
    
    return true;
}


AVFrame* VideoMemStub::ToAVFrame() {
    
    
    assert(format_ == VideoFormat::kI420);
    
    
    AVFrame* avframe = av_frame_alloc();
    
    avframe->format = AV_PIX_FMT_YUV420P;//ctx->pix_fmt;
    avframe->width = (int)width_;
    avframe->height = (int)height_;
    
    auto ret = av_frame_get_buffer(avframe, 0);
    if (ret) {
        LOG_ERROR("av_frame_get_buffer() failure : %d", ret);
        av_frame_free(&avframe);
        return NULL;
    }
    
    {
        const uint8_t* sdata = GetData(0);
        uint8_t* ddata = avframe->data[0];
        
        size_t sstride = GetStride(0);
        size_t dstride = avframe->linesize[0];
        for (int l = 0; l < avframe->height; l++) {
            memcpy(ddata + dstride * l, sdata + sstride * l, dstride);
        }
    }
    {
        const uint8_t* sdata = GetData(1);
        uint8_t* ddata = avframe->data[1];
        
        size_t sstride = GetStride(1);
        size_t dstride = avframe->linesize[1];
        for (int l = 0; l < avframe->height / 2; l++) {
            memcpy(ddata + dstride * l, sdata + sstride * l, dstride);
        }
    }
    {
        const uint8_t* sdata = GetData(2);
        uint8_t* ddata = avframe->data[2];
        
        size_t sstride = GetStride(2);
        size_t dstride = avframe->linesize[2];
        for (int l = 0; l < avframe->height / 2; l++) {
            memcpy(ddata + dstride * l, sdata + sstride * l, dstride);
        }
    }
    
    return avframe;
}


VideoMemStub::VideoMemStub(const AVFrame* avframe) : MemStub(MediaType::kVIDEO) {}



#endif


VideoMemStub::VideoMemStub(VideoFormat fmt, size_t width, size_t height)
    : MemStub(MediaType::kVIDEO)
{
    assert(fmt == VideoFormat::kARGB || fmt == VideoFormat::kI420);
    assert(width != 0 && height != 0);

    //type_ = MediaType::kVIDEO;
    width_ = width;
    height_ = height;

    std::fill_n(planes_, kPlaneMaxCount, nullptr);
    std::fill_n(strides_, kPlaneMaxCount, 0);
    std::fill_n(vstrides_, kPlaneMaxCount, 0);
    
    format_ = fmt;
    
    if (fmt == VideoFormat::kARGB) {
        strides_[0] = width * 4;
        vstrides_[0] = height;

        plane_count_ = 1;
        data_size_ = width * height * 4;
        
    } else if (fmt == VideoFormat::kI420) {
        
        assert(width % 2 == 0);
        
        strides_[0] = width;
        strides_[1] = width / 2;
        strides_[2] = width / 2;
        
        vstrides_[0] = height;
        vstrides_[1] = height / 2;
        vstrides_[2] = height / 2;
        plane_count_ = 3;
        data_size_ = width * height * 3 / 2;
    }
    
    

    data_.reset(new (std::nothrow) uint8_t[data_size_]);
    if (!data_)
        return;
    
    std::fill_n(data_.get(), data_size_, 0);
    //memset(data_.get(), 0, data_size_);
    
    
    if (fmt == VideoFormat::kARGB) {
        planes_[0] = data_.get();
        
    } else if (fmt == VideoFormat::kI420) {
        
        planes_[0] = data_.get();
        planes_[1] = planes_[0] + strides_[0] * vstrides_[0];
        planes_[2] = planes_[1] + strides_[1] * vstrides_[1];
    }

    
    
    setValid(true);

}

VideoMemStub::VideoMemStub(const VideoFrameTag& tag) : VideoMemStub(tag.format, tag.width, tag.height) {}




AudioMemStub::AudioMemStub(AudioFormat fmt, size_t channels, size_t sampleCount)
    : MemStub(MediaType::kAUDIO)
{
    assert(fmt == AudioFormat::kS16);
    assert(channels != 0 && sampleCount != 0);

    format_ = AudioFormat::kS16;
    channels_ = channels;
    sample_count_ = sampleCount;

    std::fill_n(strides_, kPlaneMaxCount, 0);
    std::fill_n(vstrides_, kPlaneMaxCount, 0);
    strides_[0] = channels * sampleCount * sizeof(int16_t);
    vstrides_[0] = 1;

    plane_count_ = 1;
    data_size_ = channels * sampleCount * sizeof(int16_t);

    data_.reset(new (std::nothrow) uint8_t[data_size_]);
    if (!data_)
        return ;
    std::fill_n(data_.get(), data_size_, 0);
    //memset(data_.get(), 0, data_size_);
    planes_[0] = data_.get();

    setValid(true);
}


AudioMemStub::AudioMemStub(const AudioFrameTag& tag) : AudioMemStub(tag.format, tag.channels, tag.sampleCount) {}




#if PV_ENABLE_FFMPEG


BoolResult AudioMemStub::ToAVFrame(AVFrame* avframe)
{
    if (!avframe) {
        return MakeResultFor(ResultCode::INVALID_ARG);
    }
    
    if ((avframe->format != AV_SAMPLE_FMT_S16 && avframe->format != AV_SAMPLE_FMT_FLTP) ||
        avframe->channels != (int)channels_ ||
        avframe->nb_samples != (int)sample_count_) {
        
        return MakeResultFor(ResultCode::NOT_ALLOWED);
    }
    
    int ret = av_frame_make_writable(avframe);
    if (ret) {
        return MakeResultFor(ResultCode::NO_MEM);
    }
    
    
    if (avframe->format == AV_SAMPLE_FMT_S16) {
        
        const uint8_t* sdata = GetData(0);
        uint8_t* ddata = avframe->data[0];
        
        size_t sstride = GetStride(0);
        size_t dstride = avframe->linesize[0];
        //for (int l = 0; l < 1; l++) {
        memcpy(ddata, sdata, std::min(sstride, dstride));
        //}
    } else if (avframe->format == AV_SAMPLE_FMT_FLTP) {

        const uint16_t* sdata = (const uint16_t*)GetData(0);
        
        for (size_t sample = 0; sample < sample_count_; sample++) {
            
            for (size_t ch = 0; ch < channels_; ch++) {
                
                float* dpch = (float*)avframe->extended_data[ch];
                
                const int16_t* spch = ((const int16_t*)sdata) + channels_ * sample + ch;
                
                dpch[sample] = std::clamp(float(*spch) / std::numeric_limits<int16_t>::max(), -1.0f, 1.0f);
            }
            
        }
        
        
        
    } else {
        std::terminate();
    }
    
    
 
    
    return true;
}


AVFrame* AudioMemStub::ToAVFrame()
{
    AVFrame* avframe = av_frame_alloc();
    avframe->nb_samples = (int)sample_count_;//tag.sampleCount;
    avframe->format = AV_SAMPLE_FMT_S16;
    avframe->channel_layout = av_get_default_channel_layout((int)channels_);
    
    auto ret = av_frame_get_buffer(avframe, 0);
    if (ret) {
        LOG_ERROR("av_frame_get_buffer() failure : %d", ret);
        av_frame_free(&avframe);
        return NULL;
    }
    
    
    {
        const uint8_t* sdata = GetData(0);
        uint8_t* ddata = avframe->data[0];
        
        size_t sstride = GetStride(0);
        size_t dstride = avframe->linesize[0];
        //for (int l = 0; l < 1; l++) {
        memcpy(ddata, sdata, std::min(sstride, dstride));
        //}
    }
    
    return avframe;
    
}

#endif


#if 0
VideoMemStub::VideoMemStub(AVFrame* avframe)
    : MemStub(MediaType::kVIDEO)
{

    assert(avframe != nullptr);
    assert(avframe->width > 0 && avframe->height > 0);

    plane_count_ = 0;
    data_size_ = 0;

    // video frame
    type_ = MediaType::kVIDEO;

    for (int i = 0; avframe->linesize[i] != 0; i++) {
        strides_[i] = avframe->linesize[i];
        vstrides_[i] = AVPixelFormatToVStride(avframe->format, avframe->height, i);
        data_size_ += strides_[i] * vstrides_[i];
        plane_count_++;
    }


    data_.reset(new (std::nothrow) uint8_t[data_size_]);
    if (!data_)
        return;


    planes_[0] = data_.get();
    for (int i = 1; i < plane_count_; i++) {
        /// FIXME assume psize always <= avframe's
        size_t psize = strides_[i - 1] * vstrides_[i - 1];
        planes_[i] = planes_[i - 1] + psize;
    }
    for (int i = 0; i < plane_count_; i++) {
        size_t psize = strides_[i] * vstrides_[i];
        memcpy(planes_[i], avframe->data[i], psize);
    }

    setValid(true);

}

static AVFrame* convertToS16(AVFrame* frame);


    AudioMemStub::AudioMemStub(AVFrame* avframe)
    : MemStub(MediaType::kAUDIO)
    {
        //if (!avframe)
        //   return ;
        assert(avframe != nullptr);
        assert(avframe->nb_samples > 0 && avframe->channels > 0);

        plane_count_ = 0;
        data_size_ = 0;


            // audio frame
            type_ = MediaType::kAUDIO;

            avframe = convertToS16(avframe);

            strides_[0] = avframe->linesize[0];
            vstrides_[0] = 1;
            data_size_ += avframe->linesize[0];
            plane_count_++;
#if 0
            size_t plane_size = avframe->linesize[0] / avframe->channels;
            for (int i = 0; i < avframe->channels; i++) {
                strides_[i] = plane_size;
                vstrides_[i] = 1;
                data_size_ += plane_size;
                plane_count_++;
            }
#endif


        data_.reset(new (std::nothrow) uint8_t[data_size_]);
        if (!data_)
            return;


        planes_[0] = data_.get();
        for (int i = 1; i < plane_count_; i++) {
            /// FIXME assume psize always <= avframe's
            size_t psize = strides_[i - 1] * vstrides_[i - 1];
            planes_[i] = planes_[i - 1] + psize;
        }
        for (int i = 0; i < plane_count_; i++) {
            size_t psize = strides_[i] * vstrides_[i];
            memcpy(planes_[i], avframe->data[i], psize);
        }

        setValid(true);

    }


static AVFrame* convertToS16(AVFrame* frame) {

    AVFrame* avframe = av_frame_alloc();
    avframe->format = AV_SAMPLE_FMT_S16;
    avframe->nb_samples = frame->nb_samples;
    avframe->channel_layout = frame->channel_layout;
    int ret = av_frame_get_buffer(avframe, 0);
    if (ret) {
        av_frame_free(&avframe);
        return nullptr;
    }
    int nchannels = frame->channels;
    int nb_samples = frame->nb_samples;
#define MAX_CHANNELS 8
    float* pi[MAX_CHANNELS];
#undef MAX_CHANNELS
    for (int i = 0; i < nchannels; i++) {
        pi[i] = (float*)frame->data[i];
    }
    //pi[1] = (float*)frame->data[1];
    int16_t* po = (int16_t*)avframe->data[0];
    for (int i = 0; i < nb_samples; i++) {
        for (int ch = 0; ch < nchannels; ch++) {
            int32_t v = static_cast<int32_t>(pi[ch][i] * std::numeric_limits<int16_t>::max());
            int16_t nv = ((v > std::numeric_limits<int16_t>::max()) ? std::numeric_limits<int16_t>::max() :
                          ((v < std::numeric_limits<int16_t>::min()) ? std::numeric_limits<int16_t>::min() : v));
            po[i * nchannels + ch] = nv;
        }
    }
    return avframe;
}

#endif












}

