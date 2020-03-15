
#ifndef PULSEVIDEO_TIME_VALUE_HH_
#define PULSEVIDEO_TIME_VALUE_HH_

#include <limits>
#include <stdint.h>

namespace pulsevideo {

constexpr auto kINVALID_TS = std::numeric_limits<int64_t>::min();

constexpr auto kINF_DURATION = std::numeric_limits<int64_t>::max();

constexpr int64_t kINVALID_DURATION = 0;



namespace time_value {

namespace video {
// FIXME: duration 需要改成向上取整(ceil)

static int64_t adjustDuration(int64_t dur, double fps) {
    if (dur != kINVALID_DURATION && fps > 0)
        return (int64_t)(fps * dur / 1000) * (1000 / fps);
    return kINVALID_DURATION;
}

static int64_t adjustTimestamp(int64_t ts, double fps) {
    if (ts != kINVALID_TS && fps > 0)
        return (int64_t)(fps * ts / 1000) * (1000 / fps);
    return kINVALID_TS;
}

}


namespace audio {

static int64_t samplesToTimestamp(int64_t spos, int64_t sample_rate) {
    if (spos >= 0 && sample_rate > 0)
        return spos * 1000 / sample_rate;
    return kINVALID_TS;
}

static int64_t timestampToSamples(int64_t ts, int64_t sample_rate) {
    if (ts != kINVALID_TS && sample_rate > 0)
        return ts * sample_rate / 1000;
    return 0;
}

static int64_t adjustDuration(int64_t dur, int sample_rate, int sample_count) {
    if (dur != kINVALID_DURATION && sample_rate > 0 && sample_count > 0)
        return dur * sample_rate / sample_count * sample_count / sample_rate;
    return kINVALID_DURATION;
}
static int64_t adjustTimestamp(int64_t ts, int sample_rate, int sample_count) {
    if (ts != kINVALID_TS && sample_rate > 0 && sample_count > 0)
        return ts * sample_rate / sample_count * sample_count / sample_rate;
    return kINVALID_TS;
}

}

}


}


#endif /* PULSEVIDEO_TIME_VALUE_HH_ */
