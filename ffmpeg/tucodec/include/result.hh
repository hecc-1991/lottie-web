#ifndef PULSEVIDEO_RESULT_H_
#define PULSEVIDEO_RESULT_H_

//#include "util.hh"
#include <string>
#include <type_traits>
#include <functional>
#include <stdint.h>

#define PV_RESULT_ENABLE_DESC 1
#define PV_RESULT_ENABLE_BT 0

namespace pulsevideo {

using ResultCodeType = int64_t;

struct ResultCode {
    enum : ResultCodeType {
        FAILURE = -1,
        SUCCESS = 0,

        /////////////
        NOT_IMPL,
        NOT_ALLOWED,
        //NOT_VALID,
        NOT_READY,
        ILLEGAL_STATE,
		OUT_OF_RANGE,
        INVALID_ARG,
        RETRY,
        AGAIN = RETRY,
        //TOO_BIG,
        END,
        IO,
        NO_MEM,
		SYS,

        //DENIED,
        //ALREADY,
        UNKNOWN,
    };
};


#define RESULT_SUCCESS    ResultCode::SUCCESS
#define RESULT_FAILURE    ResultCode::FAILURE


#if PV_RESULT_ENABLE_BT
extern std::string BacktraceInfo(int skip);
#endif

const char* remove_build_prefix(const char* fullpath);

using MatchFunctor = std::function<void()>;




class ResultBase {

public:
    ResultBase(ResultCodeType ret) :code_(ret){}
    ResultBase(ResultCodeType ret
#if PV_RESULT_ENABLE_DESC
               , const char* desc
#endif
               , const char* fl
               , uint32_t ln
    )
    : code_(ret)
    , file_name_(remove_build_prefix(fl))
    , line_num_(ln)
#if PV_RESULT_ENABLE_DESC
    , desc_(desc)
#endif
#if PV_RESULT_ENABLE_BT
    , backtrace_(ret != 0 ? BacktraceInfo(2) : "")
#endif
    {}


    ///
   
    inline operator bool() const {
        return code_ == RESULT_SUCCESS;
    }

    ///
    inline ResultCodeType Code() const {
        return code_;
    }

    inline bool TestCode(ResultCodeType code) const {
        return code_ == code;
    }

#if PV_RESULT_ENABLE_DESC
    inline const char* Desc() const {
        return desc_.c_str();
    }
#endif

    inline const char* File() const {
        return file_name_;
    }

    inline uint32_t Line() const {
        return line_num_;
    }

#if PV_RESULT_ENABLE_BT
    inline const std::string& Backtrace() const {
        return backtrace_;
    }
#endif




protected:
    ResultCodeType code_ {RESULT_SUCCESS};

    const char* file_name_{nullptr};
    uint32_t line_num_{ 0 };
#if PV_RESULT_ENABLE_DESC
    std::string desc_;
#endif
#if PV_RESULT_ENABLE_BT
    std::string backtrace_;
#endif
};



template<typename T,
         typename = std::enable_if_t<!std::is_reference_v<T>>>
class Result : public ResultBase
{
public:
    //~Result() = default;
    Result() : ResultBase(ResultCode::UNKNOWN){}
    Result(T v) : ResultBase(RESULT_SUCCESS), value_(v) {}
        //: code_(RESULT_SUCCESS), value_(v) {}

    Result(ResultCodeType ret
#if PV_RESULT_ENABLE_DESC
        , const char* desc
#endif
        , const char* fl
        , uint32_t ln
    ) :ResultBase(ret
#if PV_RESULT_ENABLE_DESC
        , desc
#endif
        , fl
        , ln
    ), value_(T()) {}


    Result(T v
        , ResultCodeType ret
#if PV_RESULT_ENABLE_DESC
        , const char* desc
#endif
        , const char* fl
        , uint32_t ln
    ) :ResultBase(ret
#if PV_RESULT_ENABLE_DESC
        , desc
#endif
        , fl
        , ln
    ), value_(v) {}

    //template<typename U>
    //Result(const Result<U>& o);

    template<typename U>
    Result(const Result<U>& o, typename std::enable_if_t<!std::is_convertible_v<U, T>>* v = nullptr)
    : ResultBase(o.Code()
#if PV_RESULT_ENABLE_DESC
                 , o.Desc()
#endif
                 , o.File()
                 , o.Line()
                 ) {}

    template<typename U>
    Result(const Result<U>& o, typename std::enable_if_t<std::is_convertible_v<U, T>>* v = nullptr)
    : ResultBase(o.Code()
#if PV_RESULT_ENABLE_DESC
                 , o.Desc()
#endif
                 , o.File()
                 , o.Line()
                 ), value_(*o) {}
    //////
#if 1
    template<typename U, typename = std::enable_if_t<std::is_convertible_v<U, T>>>
    Result(U&& o)
    : ResultBase(RESULT_SUCCESS), value_(std::move(o)) {}

#endif

    inline const T& operator->() const {
        return value_;
    }
    inline T& operator->() {
        return value_;
    }

    inline const T& operator*() const {
        return value_;
    }
    inline T& operator*() {
        return value_;
    }

//    inline operator const T&() const {
//        return value_;
//    }
//    inline operator T&() {
//        return value_;
//    }

//    inline const T& Value() const {
//        return value_;
//    }
//    inline T& Value() {
//        return value_;
//    }

    Result<T>& Assert(ResultCodeType code = RESULT_SUCCESS) {
        if (code_ != code) {
            std::terminate();
        }
        return *this;
    }

    Result<T>& Match(ResultCodeType code, MatchFunctor functor) {
        if (code == code_)
            functor();
        return *this;
    }


private:
    T value_ {};
};




///////////////////////////////////////////////////////////////////////////////

    template<>
    class Result<bool> : public ResultBase
    {
    public:
        //~Result() = default;
        Result(bool v) : ResultBase(RESULT_SUCCESS), bool_value_(v) {}
        //: code_(RESULT_SUCCESS), value_(v) {}

        Result(ResultCodeType ret
#if PV_RESULT_ENABLE_DESC
               , const char* desc
#endif
               , const char* fl
               , uint32_t ln
               ) :ResultBase(ret
#if PV_RESULT_ENABLE_DESC
                , desc
#endif
                , fl
                , ln
        ) {}


        Result(bool v
               , ResultCodeType ret
#if PV_RESULT_ENABLE_DESC
               , const char* desc
#endif
               , const char* fl
               , uint32_t ln
               ) :ResultBase(ret
#if PV_RESULT_ENABLE_DESC
                , desc
#endif
                , fl
                , ln
        ), bool_value_(v) {}


        template<typename U> Result(const Result<U>& o)
        : ResultBase(o.Code()
        #if PV_RESULT_ENABLE_DESC
                     , o.Desc()
#endif
                     , o.File()
                     , o.Line()
                     ) {}
        //////


        inline const bool operator*() const {
            return bool_value_;
        }

//        inline const bool Value() const {
//            return bool_value_;
//        }

        Result<bool>& Assert(ResultCodeType code = RESULT_SUCCESS) {
            if (code_ != code) {
                abort();
            }
            return *this;
        }

        Result<bool>& Match(ResultCodeType code, MatchFunctor functor) {
            if (code == code_)
                functor();
            return *this;
        }

    private:
        bool bool_value_ {false};
    };

///////////////////////////////////////////////////////////////////////////////

template<>
class Result<void> : public ResultBase
{
public:
    Result() : ResultBase(RESULT_SUCCESS) {}
    //explicit Result(bool v) : ResultBase(RESULT_SUCCESS) {}
    //~Result() = default;

    Result(ResultCodeType ret
#if PV_RESULT_ENABLE_DESC
        , const char* desc
#endif
        , const char* fl
        , uint32_t ln
    )   : ResultBase(ret
#if PV_RESULT_ENABLE_DESC
        , desc
#endif
        , fl
        , ln
    ) {}


    template<typename U> Result(const Result<U>& o)
    : ResultBase(o.Code()
#if PV_RESULT_ENABLE_DESC
                 , o.Desc()
#endif
                 , o.File()
                 , o.Line()
                 ) {}

    Result<void>& Assert(ResultCodeType code = RESULT_SUCCESS) {
        if (code_ != code) {
            abort();
        }
        return *this;
    }

    Result<void>& Match(ResultCodeType code, MatchFunctor functor) {
        if (code == code_)
            functor();
        return *this;
    }

};

// common defination
using VoidResult = Result<void>;
using BoolResult = Result<bool>;
using IntResult = Result<int64_t>;
//using Int64Result = Result<int64_t>;
//using SizeResult = Result<size_t>;



#define RETURN_ON_FAILURE(res) if (!res) return res

//#define if_result_failure(r) if (r.Failure())
//#define if_result_success(r) if (!r.Failure())

#define if_result_failure(r) if (!r)
#define if_result_success(r) if (r)



/// MACRO OVERLOADING
//https://stackoverflow.com/questions/11761703/overloading-macro-on-number-of-arguments/21371401
#define CALL_N_ARGS(_a1, _a2, _a3, _a4, FUNC_NAME,...) FUNC_NAME

#if PV_RESULT_ENABLE_DESC

const char* build_result_desc_printf(const char* fmt, ...);
#define _RMSG(fmt, ...) build_result_desc_printf(fmt, ##__VA_ARGS__)

/// work around for msvc
//https://stackoverflow.com/questions/5134523/msvc-doesnt-expand-va-args-correctly
#define EXPAND(x) x

#define RESULT_FOR_A1(type)                    Result<type>(RESULT_SUCCESS, "", __FILE__, __LINE__)
#define RESULT_FOR_A2(type, code)              Result<type>(code, "", __FILE__, __LINE__)
#define RESULT_FOR_A3(type, code, msg)         Result<type>(code, msg, __FILE__, __LINE__)
#define RESULT_FOR_A4(type, value, code, msg)  Result<type>(value, code, msg, __FILE__, __LINE__)
#define RESULT_FOR(...)                        EXPAND(CALL_N_ARGS(__VA_ARGS__, RESULT_FOR_A4, RESULT_FOR_A3, RESULT_FOR_A2, RESULT_FOR_A1)(__VA_ARGS__))

#define VOID_RESULT_FOR_A1(code)               Result<void>(code, "", __FILE__, __LINE__)
#define VOID_RESULT_FOR_A2(code, msg)          Result<void>(code, msg, __FILE__, __LINE__)
#define VOID_RESULT_FOR_A3(code, msg, a3)      Result<void>(code, msg, __FILE__, __LINE__)
#define VOID_RESULT_FOR_A4(code, msg, a3, a4)  Result<void>(code, msg, __FILE__, __LINE__)
#define VOID_RESULT_FOR(...)                   EXPAND(CALL_N_ARGS(__VA_ARGS__, VOID_RESULT_FOR_A4, VOID_RESULT_FOR_A3, VOID_RESULT_FOR_A2, VOID_RESULT_FOR_A1)(__VA_ARGS__))

#define BOOL_RESULT_FOR_A1(code)               Result<bool>(false, code, "", __FILE__, __LINE__)
#define BOOL_RESULT_FOR_A2(code, msg)          Result<bool>(false, code, msg, __FILE__, __LINE__)
#define BOOL_RESULT_FOR_A3(code, msg, a3)      Result<bool>(false, code, msg, __FILE__, __LINE__)
#define BOOL_RESULT_FOR_A4(code, msg, a3, a4)  Result<bool>(false, code, msg, __FILE__, __LINE__)
#define BOOL_RESULT_FOR(...)                   EXPAND(CALL_N_ARGS(__VA_ARGS__, BOOL_RESULT_FOR_A4, BOOL_RESULT_FOR_A3, BOOL_RESULT_FOR_A2, BOOL_RESULT_FOR_A1)(__VA_ARGS__))




#define INT_RESULT_FOR_A1(code)                 IntResult(0, code, "", __FILE__, __LINE__)
#define INT_RESULT_FOR_A2(code, msg)            IntResult(0, code, msg, __FILE__, __LINE__)
#define INT_RESULT_FOR_A3(value, code, msg)     IntResult(value, code, msg, __FILE__, __LINE__)
#define INT_RESULT_FOR_A4(value, code, msg, a4) IntResult(value, code, msg, __FILE__, __LINE__)
#define INT_RESULT_FOR(...)                     EXPAND(CALL_N_ARGS(__VA_ARGS__, INT_RESULT_FOR_A4, INT_RESULT_FOR_A3, INT_RESULT_FOR_A2, INT_RESULT_FOR_A1)(__VA_ARGS__))



//#define RESULT_OK(type, value)             Result<type>(value, RESULT_SUCCESS, "", __FILE__, __LINE__)
//#define VOID_RESULT_OK                     Result<void>(RESULT_SUCCESS, "", __FILE__, __LINE__)


#else

#define _RMSG(...)

#define RESULT_FOR_A1(type)                    Result<type>(RESULT_SUCCESS, __FILE__, __LINE__)
#define RESULT_FOR_A2(type, code)              Result<type>(code, __FILE__, __LINE__)
#define RESULT_FOR_A3(type, code, msg)         Result<type>(code, __FILE__, __LINE__)
#define RESULT_FOR_A4(type, value, code, msg)  Result<type>(value, code, __FILE__, __LINE__)
#define RESULT_FOR(...) EXPAND(CALL_N_ARGS(__VA_ARGS__, RESULT_A4, RESULT_A3, RESULT_A2, RESULT_A1)(__VA_ARGS__))


#define VOID_RESULT_FOR_A1(code)               Result<void>(code, __FILE__, __LINE__)
#define VOID_RESULT_FOR_A2(code, msg)          Result<void>(code, __FILE__, __LINE__)
#define VOID_RESULT_FOR_A3(code, msg, a3)      Result<void>(code, __FILE__, __LINE__)
#define VOID_RESULT_FOR_A4(code, msg, a3, a4)  Result<void>(code, __FILE__, __LINE__)
#define VOID_RESULT_FOR(...)  EXPAND(CALL_N_ARGS(__VA_ARGS__, VOID_RESULT_A4, VOID_RESULT_A3, VOID_RESULT_A2, VOID_RESULT_A1)(__VA_ARGS__))

#define BOOL_RESULT_FOR_A1(code)               Result<bool>(false, code, __FILE__, __LINE__)
#define BOOL_RESULT_FOR_A2(code, msg)          Result<bool>(false, code, __FILE__, __LINE__)
#define BOOL_RESULT_FOR_A3(code, msg, a3)      Result<bool>(false, code, __FILE__, __LINE__)
#define BOOL_RESULT_FOR_A4(code, msg, a3, a4)  Result<bool>(false, code, __FILE__, __LINE__)
#define BOOL_RESULT_FOR(...)  EXPAND(CALL_N_ARGS(__VA_ARGS__, BOOL_RESULT_A4, BOOL_RESULT_A3, BOOL_RESULT_A2, BOOL_RESULT_A1)(__VA_ARGS__))



#define INT_RESULT_FOR_A1(code)                 IntResult(0, code, __FILE__, __LINE__)
#define INT_RESULT_FOR_A2(code, msg)            IntResult(0, code, __FILE__, __LINE__)
#define INT_RESULT_FOR_A3(value, code, msg)     IntResult(value, code, __FILE__, __LINE__)
#define INT_RESULT_FOR_A4(value, code, msg, a4) IntResult(value, code, __FILE__, __LINE__)
#define INT_RESULT_FOR(...)                     EXPAND(CALL_N_ARGS(__VA_ARGS__, INT_RESULT_FOR_A4, INT_RESULT_FOR_A3, INT_RESULT_FOR_A2, INT_RESULT_FOR_A1)(__VA_ARGS__))




//#define RESULT_OK(type, value)             Result<type>(value, RESULT_SUCCESS, __FILE__, __LINE__)
//#define VOID_RESULT_OK                     Result<void>(RESULT_SUCCESS, __FILE__, __LINE__)

#endif

#define MakeResultFor VOID_RESULT_FOR


}
#endif
