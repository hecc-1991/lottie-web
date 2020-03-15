#ifndef VIDEO_STREAM_H_
#define VIDEO_STREAM_H_

#include <string>

using namespace std;

class VideoReaderStream
{
public:
    VideoReaderStream();
    ~VideoReaderStream();
    int do_video_stream_open(string path, int frameRate);
    int do_video_stream_close();
    int do_video_stream_read_frame(float time);
};

#endif