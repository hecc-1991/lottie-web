#ifndef PULSEVIDEO_LOG_H_
#define PULSEVIDEO_LOG_H_
#include "platform.h"
//#include "defines.h"

#include <cstdio>

namespace pulsevideo
{
#if PV_PLATFORM_WIN
#undef ERROR
#endif
enum class LogLevel
{
    kDEBUG,
    kINFO,
    kWARN,
    kERROR,
    kFATAL
};

extern size_t log_printf(LogLevel lv, const char *fmt, ...);

//#define LOG(fmt, ...) \
//    log_printf(fmt, ##__VA_ARGS__)
//    //fprintf(stderr, "- " fmt "\n", ##__VA_ARGS__)

#if LOG_DISABLE

#define LOG_DEBUG(fmt, ...)
#define LOG_INFO(fmt, ...)
#define LOG_WARN(fmt, ...)
#define LOG_ERROR(fmt, ...)

#else

#define LOG_DEBUG(fmt, ...) log_printf(LogLevel::kDEBUG, fmt, ##__VA_ARGS__)
#define LOG_INFO(fmt, ...) log_printf(LogLevel::kINFO, fmt, ##__VA_ARGS__)
#define LOG_WARN(fmt, ...) log_printf(LogLevel::kWARN, fmt, ##__VA_ARGS__)
#define LOG_ERROR(fmt, ...) log_printf(LogLevel::kERROR, fmt, ##__VA_ARGS__)

#endif

#if PV_PLATFORM_WIN

#endif

} // namespace pulsevideo

#endif
