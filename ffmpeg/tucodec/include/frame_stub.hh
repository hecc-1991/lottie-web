
#ifndef PULSEVIDEO_FRAME_STUB_H_
#define PULSEVIDEO_FRAME_STUB_H_

#include <memory>

namespace pulsevideo {

struct FrameStub : public std::enable_shared_from_this<FrameStub> {

public:
    virtual ~FrameStub() = default;

    inline bool IsValid() const {
        return valid_;
    }
    
    template<typename T,
             typename = std::enable_if_t<std::is_base_of_v<FrameStub, T>>>
    SPtr<T> CastTo() {
        return std::static_pointer_cast<T>(shared_from_this());
    }

protected:
    inline void setValid(bool b = true) {
        valid_ = b;
    }

private:
    //FrameStubAllocator* allocator_ {nullptr};
    bool valid_ {false};
};

using FrameStubPtr = SPtr<FrameStub>;


template <typename T, typename... ARGS>
SPtr<T> MakeFrameStub(ARGS... args) {
    return std::make_shared<T>(std::forward<ARGS>(args)...);
}


}

#endif
