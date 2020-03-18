#!/bin/bash

set -ex

BASE_DIR=$(pwd)

FFMPEG_DIR=ffmpeg

EMCC=`which emcc`
EMCXX=`which em++`
EMAR=`which emar`

BUILD_DIR=${BASE_DIR}/out

mkdir -p $BUILD_DIR
# sometimes the .a files keep old symbols around - cleaning them out makes sure
# we get a fresh build.
#rm -f $BUILD_DIR/*.*

echo "Compiling ffmpeg"

# 如果没下载ffmpeg，先下载
# git clone https://git.ffmpeg.org/ffmpeg.git $FFMPEG_DIR

cd $FFMPEG_DIR
emconfigure ./configure --cc="emcc" --cxx="em++" ar="emar" \
	--enable-cross-compile --disable-ffmpeg \
	--disable-ffplay --disable-ffprobe \
	--disable-asm --disable-doc --disable-devices \
	--disable-pthreads --disable-w32threads \
	--disable-network --disable-hwaccels

emmake make

cd ..

echo "Compiling codec"

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



${EMCXX} \
    -Itucodec/include \
    -I$FFMPEG_DIR \
    ${TUCODEC_SRC} \
    -std=c++17 \
    -s WASM=1 \
    -o $BUILD_DIR/videostream.bc

#export EMCC_CLOSURE_ARGS="--externs $BASE_DIR/externs.js "

echo "Generating final wasm"

# Emscripten prefers that the .a files go last in order, otherwise, it
# may drop symbols that it incorrectly thinks aren't used. One day,
# Emscripten will use LLD, which may relax this requirement.

${EMCXX} \
    -Itucodec/include \
    -I$FFMPEG_DIR \
    -std=c++17 \
    --bind \
	  --pre-js $BASE_DIR/pre.js \
	  --pre-js $BASE_DIR/interface.js \
	  --pre-js $BASE_DIR/post.js \
    $BASE_DIR/videoreader_bindings.cpp \
    $FFMPEG_DIR/libavcodec/libavcodec.a \
    $FFMPEG_DIR/libavutil/libavutil.a \
    $FFMPEG_DIR/libavformat/libavformat.a \
    $FFMPEG_DIR/libswresample/libswresample.a \
    $FFMPEG_DIR/libswscale/libswscale.a \
    $BUILD_DIR/videostream.bc \
    -lworkerfs.js \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s STRICT=1 \
    -s TOTAL_MEMORY=128MB \
    -s WASM=1 \
    -o $BUILD_DIR/VideoReaderWorker.js
