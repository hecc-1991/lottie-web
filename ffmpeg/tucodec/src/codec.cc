#include "codec.hh"

#include <algorithm>

namespace pulsevideo {



#if 0

static struct _video_frame_format_string_map_t {
    VideoFormat fmt;
    const std::string name;
    int planes;
    int pixel_scale0;    //plane[0] 
    int stride_scale[4]; //width * stride_scale[i] = stride[i]
    int vstride_scale[4]; //height * vstride_scale[i] = vstride[i]
} _video_frame_format_string_map[] = {
    {VideoFormat::kNONE, "none", 0, 0, {0, 0, 0, 0}, {0, 0, 0, 0}},
    {VideoFormat::kRGB,  "rgb",  1, 3, {1, 0, 0, 0}, {1, 0, 0, 0}},
    {VideoFormat::kARGB, "argb", 1, 4, {1, 0, 0, 0}, {1, 0, 0, 0}},
    {VideoFormat::kI420, "i420", 3, 1, {1, 2, 2, 0}, {1, 2, 2, 0}},
    {VideoFormat::kNV12, "nv12", 2, 1, {1, 1, 0, 0}, {1, 2, 0, 0}},
    {VideoFormat::kNV21, "nv21", 2, 1, {1, 1, 0, 0}, {1, 2, 0, 0}}
};

static struct _audio_frame_format_string_map_t {
    AudioFormat fmt;
    const std::string name;
    int sample_scale;// sample_count * stride_scale = plane_size
} _audio_frame_format_string_map[] = {
    {AudioFormat::kNONE,   "none", 0},
    {AudioFormat::kFLOATP, "fltp", 4},
    {AudioFormat::kS16,  "s16",  2}
};



const std::string& VideoFrameFormatToString(VideoFormat fmt) 
{
    size_t len = sizeof _video_frame_format_string_map / sizeof _video_frame_format_string_map[0];
    for (size_t i = 0; i < len; i++) {
        if (_video_frame_format_string_map[i].fmt == fmt) {
            return _video_frame_format_string_map[i].name;
        }
    }
    return _video_frame_format_string_map[0].name;
}

const std::string& AudioFrameFormatToString(AudioFormat fmt)
{
    size_t len = sizeof _audio_frame_format_string_map / sizeof _audio_frame_format_string_map[0];
    for (size_t i = 0; i < len; i++) {
        if (_audio_frame_format_string_map[i].fmt == fmt) {
            return _audio_frame_format_string_map[i].name;
        }
    }
    return _audio_frame_format_string_map[0].name;
}

VideoFormat StringToVideoFormat(const std::string& name)
{
    size_t len = sizeof _video_frame_format_string_map / sizeof _video_frame_format_string_map[0];
    for (size_t i = 0; i < len; i++) {
        if (_video_frame_format_string_map[i].name == name) {
            return _video_frame_format_string_map[i].fmt;
        }
    }
    return _video_frame_format_string_map[0].fmt;
}

AudioFormat StringToAudioFormat(const std::string& name)
{
    size_t len = sizeof _audio_frame_format_string_map / sizeof _audio_frame_format_string_map[0];
    for (size_t i = 0; i < len; i++) {
        if (_audio_frame_format_string_map[i].name == name) {
            return _audio_frame_format_string_map[i].fmt;
        }
    }
    return _audio_frame_format_string_map[0].fmt;
}





int CalculateVideoFrameStrides(VideoFormat fmt, size_t width, size_t height, size_t (&ostrides)[MAX_PLANE_SIZE], size_t (&ovstrides)[MAX_PLANE_SIZE], size_t align, size_t valign)
{
    int ret = 0;
    if (fmt == VideoFormat::kNONE || width == 0 || height == 0)
        return ret;
    
    size_t len = sizeof _video_frame_format_string_map / sizeof _video_frame_format_string_map[0];
    size_t mask = ~(align - 1);
    size_t vmask = ~(valign - 1);

    std::fill(std::begin(ostrides), std::end(ostrides), 0);
    std::fill(std::begin(ovstrides), std::end(ovstrides), 0);

    for (size_t i = 0; i < len; i++) {
        if (_video_frame_format_string_map[i].fmt == fmt) {

            for (int j = 0; j < _video_frame_format_string_map[i].planes; j++) {

                size_t lsize = width * _video_frame_format_string_map[i].pixel_scale0 / _video_frame_format_string_map[i].stride_scale[j];
                size_t csize = height / _video_frame_format_string_map[i].vstride_scale[j];
                lsize = (lsize + align - 1) & mask;
                csize = (csize + valign - 1) & vmask;
                ostrides[j] = lsize;
                ovstrides[j] = csize;
            }
            ret = _video_frame_format_string_map[i].planes;
            break;
        }
    }
    return ret;

}

int CalculateAudioFrameStrides(AudioFormat fmt, int channels, int count, size_t& ostride, size_t& ovstride, size_t align, size_t valign)
{
    int ret = 0;
    if (fmt == AudioFormat::kNONE || channels <= 0 || count <= 0)
        return ret;
    
    
    size_t mask = ~(align - 1);
    size_t vmask = ~(valign - 1);
    size_t len = sizeof _audio_frame_format_string_map / sizeof _audio_frame_format_string_map[0];
    for (size_t i = 0; i < len; i++) {
        if (_audio_frame_format_string_map[i].fmt == fmt) {

            size_t lsize = count * _audio_frame_format_string_map[i].sample_scale;
            size_t vsize = channels;
            if (fmt == AudioFormat::kS16) {
                lsize *= channels;
                vsize = 1;
            }

            lsize = (lsize + align - 1) & mask;
            vsize = (vsize + valign - 1) & vmask;
            ostride = lsize;
            ovstride = vsize;
            ret = static_cast<int>(vsize);
            break;
        }
    }
    return ret;

}



size_t CalculateVideoFrameSize(VideoFormat fmt, size_t width, size_t height, size_t align, size_t valign)
{
    size_t size = 0;
    size_t strides[MAX_PLANE_SIZE]; 
    size_t vstrides[MAX_PLANE_SIZE]; 

    int np = CalculateVideoFrameStrides(fmt, width, height, strides, vstrides, align, valign);

    for (int i = 0; i < np; i++) {
        size += strides[i] * vstrides[i];
    }

    return size;
}

size_t CalculateAudioFrameSize(AudioFormat fmt, int channels, int count, size_t align, size_t valign)
{
    size_t size = 0;
    size_t stride; 
    size_t vstride; 

    CalculateAudioFrameStrides(fmt, channels, count, stride, vstride, align, valign);

    size = stride * vstride;

    return size;
}



    
void TimestampQueue::push(int64_t pts, int64_t dur)
{
    auto item = TimestampItem(pts, dur);
    que_.push_back(item);
    std::sort(que_.begin(), que_.end(),[](TimestampItem& item1, TimestampItem& item2) {
        return item1.pts < item2.pts;
    });
}

TimestampItem TimestampQueue::pop()
{
    if (que_.empty())
        return TimestampItem();
    TimestampItem ret = que_.front();
    que_.pop_front();
    return ret;
}

void TimestampQueue::clear()
{
    que_.clear();
}


#endif


}
