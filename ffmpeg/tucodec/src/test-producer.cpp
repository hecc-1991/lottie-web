#include "platform.h"

#if !PV_PLATFORM_WIN
#include <unistd.h>
#endif

#include "util.hh"
#include "producer_session.hh"
#include "ffmpeg_producer.hh"

//#include "ffmpeg_reader.hh"
#include "audio_stream.hh"
#include "video_stream.hh"

#include "audio_resampler.hh"

using namespace pulsevideo;




#define SMP_CNT 1024
#define SMP_RATE 44100
#define NCH 1

#define VWIDTH  640
#define VHEIGHT 480


static StreamContext gStreamCtx;
//static std::unique_ptr<PlayerSession> gPlayer;
static AudioStreamPtr gAudioStream;
static VideoStreamPtr gVideoStream;

#if PV_PLATFORM_WIN

std::string mediaPrefix = "C:/hecc/develop/tutu/tuVE/media/";
#else
#if 1
std::string mediaPrefix = "/Users/tutu/Devspace/tuVE/media/";
#else
std::string mediaPrefix = "/Users/zoeric/Devspace/TUTU/media/";
#endif
#endif
int main_producer
(int argc, char** argv)
{
    
    std::string url = mediaPrefix + "vidtest.mp4";

    
    Config aconfig;
    aconfig.SetString("url", url);
    aconfig.SetIntNumber("sample-count", SMP_CNT);
    aconfig.SetIntNumber("sample-rate", SMP_RATE);
    aconfig.SetIntNumber("channels", NCH);
    //gAudioStream = MakeShared<AudioReaderStream>(gStreamCtx);
    gAudioStream = Stream::Make<AudioReaderStream>(gStreamCtx);
    auto ares = gAudioStream->Open(aconfig);
    
    
    Config vconfig;
    vconfig.SetString("url", url);
    vconfig.SetNumber("prefer-width", VWIDTH);
    vconfig.SetNumber("prefer-height", VHEIGHT);
    vconfig.SetNumber("prefer-fps", 25);
    //gVideoStream = MakeShared<VideoReaderStream>(gStreamCtx);
    gVideoStream = Stream::Make<VideoReaderStream>(gStreamCtx);
    auto vres = gVideoStream->Open(vconfig);
    
    if (!ares || !vres) {
        return -1;
    }
    
    
    ProducerParam param;
    param.path = mediaPrefix + "out-vidtest.mp4";
    
    
    
    auto vp = ProducerSession::Make<FFmpegProducer>();
    //auto vp = MakeShared<FFmpegProducer>();
#if 1
    
    vp->SetAudioStream(gAudioStream);
    
    vp->SetVideoStream(gVideoStream);
    
    vp->Initialize(param);
    
    vp->Run();
    
#if 0
    sleep(3);
    
    vp->Cancel();
#else
    
//    while(true) {
//        
//        
//        sleep(1);
//    }
    
    
    
#endif
    
    vp->Finalize();
#endif
    
    gAudioStream->Close();
    gVideoStream->Close();
    
    return 0;
}
