#ifndef PULSEVIDEO_PLATFORM_H_
#define PULSEVIDEO_PLATFORM_H_

/**

#define PV_PLATFORM_WIN
	#define PV_PLATFORM_WIN64  1
	#define PV_PLATFORM_WIN32  1
#define PV_PLATFORM_IOS
	#define PV_PLATFORM_IOS_SIMULATOR  1
	#define PV_PLATFORM_IOS  1

#define PV_PLATFORM_MACOS  1
#define PV_PLATFORM_ANDROID  1
#define PV_PLATFORM_LINUX  1

*/



////
////https://sourceforge.net/p/predef/wiki/OperatingSystems/

#ifdef _WIN32
//define something for Windows (32-bit and 64-bit, this part is common)
	#define PV_PLATFORM_WIN  1
#ifdef _WIN64
//define something for Windows (64-bit only)
	#define PV_PLATFORM_WIN64  1
#else
//define something for Windows (32-bit only)
	#define PV_PLATFORM_WIN32  1
#endif

#elif __APPLE__

#include "TargetConditionals.h"
#if TARGET_IPHONE_SIMULATOR
// iOS Simulator
	#define PV_PLATFORM_IOS_SIMULATOR  1
	#define PV_PLATFORM_IOS  1
#elif TARGET_OS_IPHONE
// iOS device
	#define PV_PLATFORM_IOS  1
#elif TARGET_OS_MAC
// Other kinds of Mac OS
	#define PV_PLATFORM_MACOS  1
#else
#   error "Unknown Apple platform"
#endif

#elif __ANDROID__
// Android
//// __ANDROID_API__
	#define PV_PLATFORM_ANDROID  1

#elif __unix__
// linux
////
	#define PV_PLATFORM_LINUX  1
/*
* #elif __unix__ // all unices not caught above
* // Unix
* //// __unix
* #elif defined(_POSIX_VERSION)
* // POSIX
* ////
*/
#else
#   error "Unknown platform"
#endif




#endif

