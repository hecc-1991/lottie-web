#ifndef PULSEVIDIO_CONFIG_H_
#define PULSEVIDIO_CONFIG_H_

#include <memory>
#include <string>
#include <string_view>
#include <map>
#include <initializer_list>
#include <variant>
#include <vector>


#include "util.hh"
#include "result.hh"


namespace pulsevideo {



enum class ConfigType {
    kNONE,
    kNUMBER,
    kSTRING,
    kBUFFER
};


class Config {


//using buffer_t = std::vector<uint8_t>;
using Value = std::variant<double, std::string, std::vector<uint8_t>>;

public:
    Config() = default;
    ~Config() noexcept = default;
	//DISABLE_COPY_AND_ASSIGN(Config);


    size_t Extends(const Config& oth);

    size_t ResetBy(const Config & oth);

    bool Exists(std::string_view name, ConfigType type = ConfigType::kNONE) const;

    int GetIntNumber(std::string_view key) const;
    double GetNumber(std::string_view key) const;
    std::string GetString(std::string_view key) const;
    const std::vector<uint8_t>& GetBuffer(std::string_view key) const;


    int GetIntNumberOr(std::string_view key, int v) const;
    double GetNumberOr(std::string_view key, double v) const;
    std::string GetStringOr(std::string_view key, std::string v) const;
    //std::vector<uint8_t> GetBufferOr(std::string_view key, std::string v) const;

    
	void SetIntNumber(std::string key, int v);
    void SetNumber(std::string key, double v);
    void SetString(std::string key, std::string v);
    void SetBuffer(std::string key, std::vector<uint8_t> v);

    void Unset(std::string_view key);
    

    inline bool IsEmpty() const {
        return items_.empty();
    }

    inline size_t GetSize() const {
        return items_.size();
    }
private:
    std::map<std::string, Value, std::less<>> items_;
};




class ConfigValidator {

public:

    struct BaseItem {
        BaseItem(bool required = false) {
            this->required = required;
        }
        bool required;
    };

    struct NumberItem : public BaseItem {
        NumberItem(double min = 1.0, double max = -1.0, bool required = false): BaseItem(required) {
            this->min = min;
            this->max = max;
        }
        double min;
        double max;
    };
    struct EnumStringItem : public BaseItem {
        EnumStringItem(bool required = false): BaseItem(required) {
        }
        std::vector<std::string> list;
    };
    struct StringItem : public BaseItem {
        StringItem(bool required = false): BaseItem(required) {
        }
    };
    struct BufferItem : public BaseItem {
        BufferItem(bool required = false): BaseItem(required) {
        }
    };

    using ValidateItem = std::variant<NumberItem, StringItem, EnumStringItem, BufferItem>;


public:
    ConfigValidator() = default;
    ~ConfigValidator() noexcept = default;
    DISABLE_COPY_AND_ASSIGN(ConfigValidator);

    void Insert(std::string name, ConfigType type, bool required = false);

    void InsertNumber(std::string name, bool required = false);
    void InsertNumber(std::string name, double range_min, double range_max, bool required = false);
    void InsertString(std::string name, bool required = false);
    void InsertEnumString(std::string name, std::initializer_list<std::string> strs, bool required = false);
    void InsertBuffer(std::string name, bool required = false);


    inline size_t GetSize() const {
        return items_.size();
    }

//    inline void SetConfig(const Config& config) {
//        config_ = config;
//    }
//
//    inline Config& GetConfig() {
//        return config_;
//    }


    bool Validate(const Config& config) const;

private:
    std::map<std::string, ValidateItem, std::less<>> items_;

    //Config config_;
};





class Configurable {

public:

    BoolResult SetConfig(const Config& config);
    Config& GetConfig();

    //BoolResult UpdateConfig();

protected:

    ConfigValidator& getConfigValidator() {
        return config_validator_;
    }

    inline void setConfig(const Config& config) {
        config_ = config;
    }

private:
    Config config_;
    ConfigValidator config_validator_;
};



}


#endif
