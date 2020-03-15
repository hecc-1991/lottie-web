#ifndef PULSEVIDEO_MAKABLE_HH_
#define PULSEVIDEO_MAKABLE_HH_ 

#include <type_traits>

#include "util.hh"

namespace pulsevideo {

template <typename T>
class Makable {
    
public:
    template <typename D, typename... ARGS>
    static std::enable_if_t<std::is_base_of_v<T, D>, SPtr<D>> Make(ARGS&&... args) {
       
       return SPtr<D>(new (std::nothrow) D(std::forward<ARGS>(args)...));
       //
       //return MakeShared<D>(std::forward<ARGS>(args)...);
    }
    
  
    
};

}



#endif
