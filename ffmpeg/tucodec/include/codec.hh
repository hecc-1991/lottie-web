#ifndef PULSEVIDEO_CODEC_H_
#define PULSEVIDEO_CODEC_H_


#include <string>
#include <memory>
#include <deque>

//#include "defines.h"
//#include "buffer.hh"

namespace pulsevideo {




enum class MediaType {
    kNONE,
    kVIDEO,
    kAUDIO,
};

enum class CodecType {
    kNONE,
    //////////
    kMP2,
    kMP3,
    kAAC,
    //////////
    kH264,
    kH265,
    kMPEG4,
};

enum class VideoFormat {
    kNONE,
    //!memory
    kRGB,    //b8g8r8
    kARGB,   //b8g8r8a8
    kI420,   //yyyy/u/v
    kNV12,   //yyyy/uv
    kNV21,    //yyyy/vu
    
    //!hardware
    kGL_TEXTURE,
    kMTL_IMAGE,
    kDX_TEXTURE
    
};

enum class AudioFormat {
    kNONE,
    kFLOATP, //[-1.0, 1.0]
    kS16,    //[-32768, 32767]
};


}







#endif
