#include "base.hh"

#include <fstream>
#include <sstream>

namespace pulsevideo {




BoolResult ISerializable::DumpToFile(const std::string& path) {

    std::ofstream os(path);
    if (!os.is_open()) {
        return BOOL_RESULT_FOR(ResultCode::IO, _RMSG("open file : %s failed", path.c_str()));
    }

    auto res = do_dump();
    if_result_failure(res) {
        return BOOL_RESULT_FOR(ResultCode::IO);
    }


    os << *res;
    os.close();

    return true;
}

BoolResult ISerializable::LoadFromFile(const std::string& path) {

    std::stringstream ss;

    std::ifstream is(path);
    if (!is.is_open()) {
        return BOOL_RESULT_FOR(ResultCode::IO, _RMSG("open file : %s failed", path.c_str()));
    }

    ss << is.rdbuf();
    is.close();

    return do_load(ss.str());
}




}
