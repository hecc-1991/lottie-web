#ifndef PULSEVIDEO_DEFINES_H_
#define PULSEVIDEO_DEFINES_H_


#include "platform.h"





#define PV_ENABLE_LOG 1
//#define PV_ENABLE_FFMPEG 1

#define PV_BUILD_PREFIX_OFFSET 22





//#define INFINITE_DURATION ((int64_t)(0x8000000000000000 - 1))
//#define UNKNOWN_DURATION ((int64_t)(0x0))
//#define INVALID_PTS ((int64_t)0x8000000000000000)
#if 0
struct Point {
    int x;
    int y;
};
struct Size {
    int width;
    int height;
};

struct Rectangle {
    int x
    int y;
    int width;
    int height;
};

struct Rect {
    int x0;
    int y0;
    int x1;
    int y1;
};
#endif

#endif
