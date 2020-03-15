#ifndef PULSEVIDEO_BASE_H_
#define PULSEVIDEO_BASE_H_

#include <string>
#include <initializer_list>
#include <algorithm>
#include <mutex>
#include "result.hh"
#include "config_new.hh"

namespace pulsevideo {

#if 0

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

#endif
       
        
class ISuspendable {

public:
    ISuspendable() = default;
    virtual ~ISuspendable() noexcept = default;

    BoolResult Suspend() {
        return do_suspend();
    }
    BoolResult Unsuspend() {
        return do_unsuspend();
    }

private:
    virtual BoolResult do_suspend() = 0;
    virtual BoolResult do_unsuspend() = 0;
};


class IOpenable {

public:
    IOpenable() = default;
    virtual ~IOpenable() noexcept = default;

    BoolResult Open(const Config& config) {
        return do_open(config);
    }
    VoidResult Close() {
        return do_close();
    }

protected:
    virtual BoolResult do_open(const Config& config) = 0;
    virtual VoidResult do_close() = 0;

};


class ISerializable {

public:
    ISerializable() = default;
    virtual ~ISerializable() noexcept = default;


    Result<std::string> DumpToString() {
        return do_dump();
    }

    BoolResult LoadFromString(const std::string& data) {
        return do_load(data);
    }

    BoolResult DumpToFile(const std::string& path);

    BoolResult LoadFromFile(const std::string& path);

private:

    virtual BoolResult do_load(const std::string& data) = 0;
    virtual Result<std::string> do_dump() = 0;


};

class IPrepared {

public:

    BoolResult Prepare(const Config& config) {
        return do_prepare(config);
    }

protected:
    virtual BoolResult do_prepare(const Config& config) = 0;

};


    
}

#endif
