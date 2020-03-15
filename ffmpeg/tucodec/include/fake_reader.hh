#ifndef PULSEVIDEO_FAKE_READER_H_
#define PULSEVIDEO_FAKE_READER_H_


#include "avreader.hh"


namespace pulsevideo {


    class FakeVideoReader : public VideoReader {

    public:
        FakeVideoReader();
        virtual ~FakeVideoReader();


    private:

        virtual Result<VideoReaderOpenDataPtr> do_open_video(const Config& config) override;
        virtual VoidResult do_close() override;
        virtual IntResult do_seek(int64_t ts) override;
        virtual Result<VideoFramePtr> do_read_next_video_frame() override;


    private:

        struct Impl;
        std::unique_ptr<Impl> impl_;
    };




    class FakeAudioReader : public AudioReader {

    public:
        FakeAudioReader();
        virtual ~FakeAudioReader();


    private:

        virtual Result<AudioReaderOpenDataPtr> do_open_audio(const Config& config) override;
        virtual VoidResult do_close() override;
        virtual IntResult do_seek(int64_t ts) override;
        virtual Result<AudioFramePtr> do_read_next_audio_frame() override;

    private:

        struct Impl;
        std::unique_ptr<Impl> impl_;
    };









}







#endif

