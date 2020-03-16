#!/bin/bash

set -ex

BASE_DIR=$(pwd)

EMCC=`which emcc`
EMCXX=`which em++`
EMAR=`which emar`

BUILD_DIR=${BASE_DIR}/out


mkdir -p $BUILD_DIR
# sometimes the .a files keep old symbols around - cleaning them out makes sure
# we get a fresh build.
#rm -f $BUILD_DIR/*.*

echo "Compiling bitcode"


#emconfigure ./configure --cc="emcc" --cxx="em++" ar="emar" \
#	--enable-cross-compile --disable-ffmpeg \
#	--disable-ffplay --disable-ffprobe \
#	--disable-asm --disable-doc --disable-devices \
#	--disable-pthreads --disable-w32threads \
#	--disable-network --disable-hwaccels
#
#emmake make

TUCODEC_SRC='
./tucodec/src/audio_stream.cc
./tucodec/src/avreader.cc
./tucodec/src/base.cc
./tucodec/src/codec.cc
./tucodec/src/config_new.cc
./tucodec/src/fake_reader.cc
./tucodec/src/ffmpeg_producer.cc
./tucodec/src/ffmpeg_reader.cc
./tucodec/src/ffmpeg_util.cc
./tucodec/src/frame.cc
./tucodec/src/log.cc
./tucodec/src/mem_frame.cc
./tucodec/src/player_session.cc
./tucodec/src/producer_session.cc
./tucodec/src/result.cc
./tucodec/src/stream.cc
./tucodec/src/test-producer.cpp
./tucodec/src/util.cc
./tucodec/src/video_stream.cc'



#${EMCXX} \
#    -Itucodec/include \
#    -I/home/tutu/hecc/env/FFmpeg \
#    ${TUCODEC_SRC} \
#    -std=c++17 \
#    -s WASM=1 \
#    -o $BUILD_DIR/videostream.bc

#export EMCC_CLOSURE_ARGS="--externs $BASE_DIR/externs.js "

echo "Generating final wasm"

# Emscripten prefers that the .a files go last in order, otherwise, it
# may drop symbols that it incorrectly thinks aren't used. One day,
# Emscripten will use LLD, which may relax this requirement.

#$BUILD_DIR/ffmpeg.bc \
${EMCXX} \
    -Itucodec/include \
    -I/home/tutu/hecc/env/FFmpeg \
    -std=c++17 \
    --bind \
	  --pre-js $BASE_DIR/pre.js \
	  --pre-js $BASE_DIR/interface.js \
	  --pre-js $BASE_DIR/post.js \
    $BASE_DIR/videoreader_bindings.cpp \
    $BUILD_DIR/libavcodec.a \
    $BUILD_DIR/libavformat.a \
    $BUILD_DIR/libavutil.a \
    $BUILD_DIR/libswresample.a \
    $BUILD_DIR/libswscale.a \
    $BUILD_DIR/videostream.bc \
    -lworkerfs.js \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s STRICT=1 \
    -s TOTAL_MEMORY=128MB \
    -s WASM=1 \
    -o $BUILD_DIR/VideoReaderWorker.js
