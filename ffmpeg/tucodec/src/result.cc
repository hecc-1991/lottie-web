#include "result.hh"
#include <cstdarg>

//#include "defines.h"

#define PV_BUILD_PREFIX_OFFSET 22

namespace pulsevideo {

static thread_local char s_result_desc_buf[128];

const char* build_result_desc_printf(const char* fmt, ...) {

    va_list ap;
    va_start(ap, fmt);

    vsnprintf(s_result_desc_buf, sizeof s_result_desc_buf, fmt, ap);

    va_end(ap);
    return s_result_desc_buf;
}


const char* remove_build_prefix(const char* fullpath) {

    if (!fullpath)
        return nullptr;

    return fullpath + PV_BUILD_PREFIX_OFFSET;
}

}
