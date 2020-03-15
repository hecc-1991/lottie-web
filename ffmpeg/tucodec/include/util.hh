#ifndef PULSEVIDEO_UTIL_HH_
#define PULSEVIDEO_UTIL_HH_

#include <memory>
#include <string>
#include <initializer_list>
#include <algorithm>
#include <functional>

#include <stdint.h>
namespace pulsevideo {


template <typename T>
using Holder = std::unique_ptr<T>;

template <typename T>
using Ptr = std::shared_ptr<T>;

template <typename T>
using SPtr = std::shared_ptr<T>;

template <typename T>
using UPtr = std::unique_ptr<T>;

#define MakeShared std::make_shared


template<typename T, size_t N>
size_t ARRAY_SIZE(const T(&array)[N]) {
    return N;
}



#define DISABLE_COPY_AND_ASSIGN(classname)              \
classname(const classname& other) = delete;             \
classname& operator=(const classname& other) = delete;  \
classname(classname&& other) = delete;                  \
classname& operator=(classname&& other) = delete


/// get backtrace info
std::string BacktraceInfo(int skip = 1);



}



#endif
