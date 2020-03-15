#include "config_new.hh"

#include <cstring>



namespace pulsevideo {




bool Config::Exists(std::string_view name, ConfigType type) const
{
    auto it = items_.find(name);
    if (it == items_.end()) {
        return false;
    }

    // any type acceptable
    if (type == ConfigType::kNONE)
        return true;

    // validate type
    if (type == ConfigType::kNUMBER) {
        auto pv = std::get_if<double>(&it->second);
        if (pv)
            return true;

    } else if (type == ConfigType::kSTRING) {
        auto pv = std::get_if<std::string>(&it->second);
        if (pv)
            return true;
    } else if (type == ConfigType::kBUFFER) {
        auto pv = std::get_if<std::vector<uint8_t>>(&it->second);
        if (pv)
            return true;
    }

    return false;
}


size_t Config::Extends(const Config& oth)
{
    size_t ret = 0;
    for (auto& it : oth.items_) {
        items_.insert(std::make_pair(it.first, it.second));
        ret++;
    }
    return ret;
}


size_t Config::ResetBy(const Config & oth)
{
    items_ = oth.items_;
    return items_.size();
}

int Config::GetIntNumber(std::string_view key) const
{
    auto it = items_.find(key);
    if (it == items_.end()) {
        std::terminate();
    }
    auto pv = std::get_if<double>(&it->second);
    if (!pv) {
        std::terminate();
    }
    return static_cast<int>(*pv);
}

double Config::GetNumber(std::string_view key) const
{
    auto it = items_.find(key);
    if (it == items_.end()) {
        std::terminate();
    }
    auto pv = std::get_if<double>(&it->second);
    if (!pv) {
        std::terminate();
    }
    return *pv;
}

std::string Config::GetString(std::string_view key) const
{
    auto it = items_.find(key);
    if (it == items_.end()) {
        std::terminate();
    }
    auto pv = std::get_if<std::string>(&it->second);
    if (!pv) {
        std::terminate();
    }
    return *pv;
}


const std::vector<uint8_t>& Config::GetBuffer(std::string_view key) const
{
    auto it = items_.find(key);
    if (it == items_.end()) {
        std::terminate();
    }
    auto pv = std::get_if<std::vector<uint8_t>>(&it->second);
    if (!pv) {
        std::terminate();
    }
    return *pv;
}

int Config::GetIntNumberOr(std::string_view key, int v) const
{
    auto it = items_.find(key);
    if (it == items_.end()) {
        return v;
    }

    auto pv = std::get_if<double>(&it->second);
    if (!pv) {
        return v;
    }

    return static_cast<int>(*pv);
}

double Config::GetNumberOr(std::string_view key, double v) const
{
    auto it = items_.find(key);
    if (it == items_.end()) {
        return v;
    }

    auto pv = std::get_if<double>(&it->second);
    if (!pv) {
        return v;
    }

    return *pv;
}

std::string Config::GetStringOr(std::string_view key, std::string v) const
{

    auto it = items_.find(key);
    if (it == items_.end()) {
        return v;
    }
    auto pv = std::get_if<std::string>(&it->second);
    if (!pv) {
        return v;
    }
    return *pv;
}

void Config::SetIntNumber(std::string key, int v)
{
    Value cv;
    cv = v;
    items_.erase(key);
    items_.emplace(std::move(key), std::move(cv));
}

void Config::SetNumber(std::string key, double v)
{
    Value cv;
    cv = v;
    items_.erase(key);
    items_.emplace(std::move(key), std::move(cv));
}

void Config::SetString(std::string key, std::string v)
{
    Value cv;
    cv = v;
    items_.erase(key);
    items_.emplace(std::move(key), std::move(cv));
}

void Config::SetBuffer(std::string key, std::vector<uint8_t> v)
{
    Value cv;
    cv = v;
    items_.erase(key);
    items_.emplace(std::move(key), std::move(cv));
}
void Config::Unset(std::string_view key)
{
    auto it = items_.find(key);
    if (it != items_.end())
        items_.erase(it);
}
    
    

void ConfigValidator::Insert(std::string name, ConfigType type, bool required)
{
    switch (type) {
        case ConfigType::kNUMBER:
            InsertNumber(std::move(name), required);
            break;
        case ConfigType::kSTRING:
            InsertString(std::move(name), required);
            break;
        case ConfigType::kBUFFER:
            InsertBuffer(std::move(name), required);
            break;
        default:
            break;
    }
}

void ConfigValidator::InsertNumber(std::string name, bool required)
{
    ValidateItem vi;
    vi = NumberItem(1.0, -1.0, required);
    items_.erase(name);
    items_.emplace(std::move(name), std::move(vi));
}

void ConfigValidator::InsertNumber(std::string name, double range_min, double range_max, bool required)
{
    ValidateItem vi;
    vi = NumberItem(range_min, range_max, required);
    items_.erase(name);
    items_.emplace(std::move(name), std::move(vi));
}

void ConfigValidator::InsertString(std::string name, bool required)
{
    ValidateItem vi;
    vi = StringItem(required);
    items_.erase(name);
    items_.emplace(std::move(name), std::move(vi));
}

void ConfigValidator::InsertEnumString(std::string name, std::initializer_list<std::string> strs, bool required)
{
    ValidateItem vi;
    EnumStringItem estrs(required);
    estrs.list = strs;
    vi = estrs;
    items_.erase(name);
    items_.emplace(std::move(name), std::move(vi));
}

void ConfigValidator::InsertBuffer(std::string name, bool required)
{
    ValidateItem vi;
    vi = BufferItem(required);
    items_.erase(name);
    items_.emplace(std::move(name), std::move(vi));
}

bool ConfigValidator::Validate(const Config& config) const
{

    for (auto& it: items_) {

        const std::string_view& name = it.first;
        const ValidateItem& item = it.second;

        auto ipv = std::get_if<NumberItem>(&item);
        if (ipv) {
            bool exists = config.Exists(name, ConfigType::kNUMBER);
            if (!exists && ipv->required)
                return false;

            if (exists && ipv->min <= ipv->max) {
                double v = config.GetNumber(name);
                if (v < ipv->min || v > ipv->max)
                    return false;
            }
            continue;
        }

        auto spv = std::get_if<StringItem>(&item);
        if (spv) {

            bool exists = config.Exists(name, ConfigType::kSTRING);
            if (!exists && spv->required)
                return false;
            continue;
        }


        auto espv = std::get_if<EnumStringItem>(&item);
        if (espv) {

            bool exists = config.Exists(name, ConfigType::kSTRING);
            if (!exists && espv->required)
                return false;

            if (exists) {
                auto&& v = config.GetString(name);

                auto it = std::find(espv->list.begin(), espv->list.end(), v);
                if (it == espv->list.end())
                    return false;
            }
            continue;
        }
        
        auto bpv = std::get_if<BufferItem>(&item);
        if (spv) {
            
            bool exists = config.Exists(name, ConfigType::kBUFFER);
            if (!exists && bpv->required)
                return false;
            continue;
        }
        

    }

    return true;

}



BoolResult Configurable::SetConfig(const Config& config)
{
    if (config.GetSize() == 0) {
        return BOOL_RESULT_FOR(ResultCode::INVALID_ARG);
    }

    if (!config_validator_.Validate(config)) {
        return BOOL_RESULT_FOR(ResultCode::INVALID_ARG, "validate failure");
    }

    config_ = config;
    return true;
}

Config& Configurable::GetConfig()
{
    return config_;
}












}
