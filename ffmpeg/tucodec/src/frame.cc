#include "frame.hh"

#include <cassert>
#include <algorithm>

namespace pulsevideo {



//template <typename T,
//          typename = std::enable_if_t<std::is_base_of_v<Frame, T>>>
SPtr<VideoFrame> DuplicateVideoFrame(SPtr<VideoFrame> src, int64_t newts) {
    if (!src)
        return nullptr;
    if (newts == kINVALID_TS)
    newts = src->GetTimestamp();
    
    return MakeShared<VideoFrame>(src->GetVideoTag(), src->GetStub(), newts);
}


//template <typename T,
//          typename = std::enable_if_t<std::is_base_of_v<Frame, T>>>
SPtr<AudioFrame> DuplicateVideoFrame(const SPtr<AudioFrame>& src, int64_t newts) {
    if (!src)
        return nullptr;
    if (newts == kINVALID_TS)
        newts = src->GetTimestamp();
    
    return MakeShared<AudioFrame>(src->GetAudioTag(), src->GetStub(), newts);
}



}
