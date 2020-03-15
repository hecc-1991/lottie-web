#include "util.hh"



#if __linux__ || __APPLE__
#include <execinfo.h>
#include <cxxabi.h>
#include <dlfcn.h>
#include <stdlib.h>
#endif


#include <sstream>

namespace pulsevideo {


#if __linux__ || __APPLE__
std::string BacktraceInfo(int skip)
{
#define MAX_FRAMES 128
    std::stringstream ss; 
    void* callstack[MAX_FRAMES];
    int frames = backtrace(callstack, MAX_FRAMES);
    char** symbols = backtrace_symbols(callstack, frames);
    char buf[1024];
    for (int i = skip; i < frames; ++i) {

        Dl_info info;
        if (dladdr(callstack[i], &info) && info.dli_sname) {
            char *demangled = NULL;
            int status = -1;
            if (info.dli_sname[0] == '_')
                demangled = abi::__cxa_demangle(info.dli_sname, NULL, 0, &status);
            snprintf(buf, sizeof(buf), "%-3d %*p %s + %zd",
                     i - skip, int(2 + sizeof(void*) * 2), callstack[i],
                     status == 0 ? demangled :
                     info.dli_sname == 0 ? symbols[i] : info.dli_sname,
                     (char *)callstack[i] - (char *)info.dli_saddr);
            free(demangled);
        } else {
            snprintf(buf, sizeof(buf), "%-3d %*p %s",
                     i - skip, int(2 + sizeof(void*) * 2), callstack[i], symbols[i]);
        }

        ss << buf << std::endl;
    }
    free(symbols);
    if (frames == MAX_FRAMES)
        ss << "[truncated]" << std::endl;

    fprintf(stderr, "%s", ss.str().c_str());

    return ss.str();
}
#elif _WIN32

std::string BacktraceInfo(int skip)
{
	std::string ret;


	return ret;
}
#endif
}