
#include "log.hh"
#include <cstdarg>

#if PV_PLATFORM_WIN
#include <Windows.h>
#include <WinBase.h>
#else
#include <unistd.h>
#include <time.h>
#endif
#include <stdint.h>


namespace pulsevideo {

#define LOG_MAX_LENGTH 2048
thread_local char s_log_prefix_buf[64];
thread_local int64_t s_tv_sec = 0;
thread_local size_t s_log_prefix_len = 0;

//#ifdef PV_PLATFORM_
    
//#undef ERROR
const char* LogLevel2String(LogLevel lv) {

    const char* ret = "**";
    switch (lv) {
        case LogLevel::kDEBUG:
            ret = "DD";
            break;
        case LogLevel::kINFO:
            ret = "II";
            break;
        case LogLevel::kWARN:
            ret = "WW";
            break;
        case LogLevel::kERROR:
            ret = "EE";
            break;
        default:
            break;
    }
    return ret;
}

size_t log_printf(LogLevel lv, const char* fmt, ...) {

	size_t ret = 0;

	char buf[LOG_MAX_LENGTH];

#if !PV_PLATFORM_WIN
	struct timespec ts;
	struct tm ti;

    clock_gettime(CLOCK_REALTIME, &ts);
    int64_t tv_sec = ts.tv_sec;
    if (tv_sec != s_tv_sec) {
        localtime_r (&ts.tv_sec, &ti);
        s_log_prefix_len = strftime(s_log_prefix_buf, sizeof s_log_prefix_buf, "%Y/%m/%d %H:%M:%S.", &ti);
        s_tv_sec = tv_sec;

    }
    snprintf(s_log_prefix_buf + s_log_prefix_len, sizeof s_log_prefix_buf - s_log_prefix_len, "%03ld [%s]", ts.tv_nsec / 1000000, LogLevel2String(lv));
#else


	
	
#endif
	va_list ap;
	va_start(ap, fmt);
	vsnprintf(buf, sizeof buf, fmt, ap);
	va_end(ap);

#if PV_PLATFORM_WIN
	char lbuf[LOG_MAX_LENGTH];
	ret = snprintf(lbuf, sizeof lbuf, "--- [%s] : %s\n", LogLevel2String(lv), buf);
	OutputDebugString(lbuf);
#else
    ret = fprintf(stderr, "%s : %s\n", s_log_prefix_buf, buf);
#endif

	return ret;
}

}

