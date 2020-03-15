#ifndef PULSEVIDEO_STATEFUL_H_
#define PULSEVIDEO_STATEFUL_H_

#include <string>
#include <initializer_list>
//#include <algorithm>
#include <mutex>
#include "result.hh"
//#include "config_new.hh"

namespace pulsevideo {



using StateType = uint32_t;
struct State {
enum : StateType {
    kINIT = 0,
//    kRUNNING,
//    kBAD,
    kSEP_ = 0xff
};
};

#define DEFINE_STATE_BEGIN(name) \
using name##StateType = StateType;    \
struct name##State : public State {   \
	enum : name##StateType {          \
        kBEGIN_ = State::kSEP_ + 1,

#define DEFINE_STATE_END(name) };};

#define STATE_ITEM(v) v,

class Stateful {

    //friend class StatefulGuard;
public:

    inline StateType GetState() const {
        std::lock_guard<std::mutex> lg(lock_);
        return state_;
    }

protected:

    inline void setState(StateType s) {
        std::lock_guard<std::mutex> lg(lock_);
        state_ = s;
    }


    inline bool testState(StateType s) const {
        std::lock_guard<std::mutex> lg(lock_);
        return state_ == s;
    }

    inline bool testStates(std::initializer_list<StateType> sl) const {
        std::lock_guard<std::mutex> lg(lock_);
        return sl.end() != std::find(sl.begin(), sl.end(), state_);
    }

private:
    mutable std::mutex lock_;
    StateType state_ {State::kINIT};
};
    
}

#endif
