#include "video_stream.h"


VideoReaderStream::VideoReaderStream(){

}

VideoReaderStream::~VideoReaderStream(){

}

int VideoReaderStream::do_video_stream_open(string path,int frameRate){
    printf("path = %s,frameRate = %d\n",path.c_str(),frameRate);
    return 0;
}

int VideoReaderStream::do_video_stream_close(){
        printf("close stream\n");
        return 0;
}

int VideoReaderStream::do_video_stream_read_frame(float time){
     printf("read_frame : %f\n",time);
     return 0;
}

