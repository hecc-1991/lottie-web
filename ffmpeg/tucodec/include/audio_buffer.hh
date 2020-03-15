#ifndef PULSEVIDEO_AUDIO_BUFFER_H_
#define PULSEVIDEO_AUDIO_BUFFER_H_

#include <stdint.h>
#include <memory>

namespace pulsevideo {


    template<typename T>
    class AudioBuffer {

        static_assert(std::is_same_v<T, int16_t> || std::is_same_v<T, float>);

    public:
        AudioBuffer(int ch, size_t capacity = 1024 * 16) : channels_(ch), capacity_(capacity) {
            data_ = std::make_unique<T[]>(capacity_ * channels_);
        }


        size_t Enqueue(const T* in, size_t count) {

            if (count > capacity_ - size_)
                return 0;

            size_t to_end = capacity_ - tail_;
            if (count < to_end) {
                size_t msiz = count * channels_ * sizeof(T);
                memcpy(data_.get() + tail_ * channels_, in, msiz);
                tail_ += count;
            } else {
                
                size_t msiz = to_end * channels_ * sizeof(T);
                memcpy(data_.get() + tail_ * channels_, in, msiz);
                
                memcpy(data_.get(), in + to_end * channels_, (count - to_end) * channels_ * sizeof(T));
                tail_ = count - to_end;
            }
            
            size_ += count;
            return count;
        }

        size_t Dequeue(T* out, size_t count) {

            if (count > size_) {
                return 0;
            }
            
            size_t to_end = capacity_ - head_;
            if (count < to_end) {
                size_t msiz = count * channels_ * sizeof(T);
                memcpy(out, data_.get() + head_ * channels_, msiz);
                head_ += count;
            } else {
                
                size_t msiz = to_end * channels_ * sizeof(T);
                memcpy(out, data_.get() + head_ * channels_, msiz);
                
                memcpy(out + to_end * channels_, data_.get(), (count - to_end) * channels_ * sizeof(T));
                head_ = count - to_end;
            }
            size_ -= count;
            return count;
        }

        size_t GetSize() const {
            return size_;
        }
        
        size_t GetSpace() const {
            return capacity_ - size_;
        }

        void Reset() {
            head_ = 0;
            tail_ = 0;
            size_ = 0;
        }

    private:

        //int sample_rate_ {0};
        int channels_ {0};

        size_t capacity_ {0};
        std::unique_ptr<T[]> data_;

        size_t head_ {0};
        size_t tail_ {0};
        size_t size_ {0};
    };


}

#endif
