#!/bin/bash

set -ex

BASE_DIR=$(pwd)

EMCC=`which emcc`
EMCXX=`which em++`
EMAR=`which emar`

BUILD_DIR=${BUILD_DIR:="out"}


mkdir -p $BUILD_DIR
# sometimes the .a files keep old symbols around - cleaning them out makes sure
# we get a fresh build.
rm -f $BUILD_DIR/*.*

echo "Compiling bitcode"


#emconfigure ./configure --cc="emcc" --cxx="em++" ar="emar" \
#	--enable-cross-compile --disable-ffmpeg \
#	--disable-ffplay --disable-ffprobe \
#	--disable-asm --disable-doc --disable-devices \
#	--disable-pthreads --disable-w32threads \
#	--disable-network --disable-hwaccels
#
#emmake make

${EMCXX} \
    -I.\
    video_stream.cpp \
    -s WASM=1 \
    -o $BUILD_DIR/videostream.bc

#export EMCC_CLOSURE_ARGS="--externs $BASE_DIR/externs.js "

echo "Generating final wasm"

# Emscripten prefers that the .a files go last in order, otherwise, it
# may drop symbols that it incorrectly thinks aren't used. One day,
# Emscripten will use LLD, which may relax this requirement.

#$BUILD_DIR/ffmpeg.bc \
${EMCXX} \
    -I. \
    -std=c++17 \
    --bind \
	  --pre-js $BASE_DIR/pre.js \
	  --pre-js $BASE_DIR/interface.js \
	  --pre-js $BASE_DIR/post.js \
    $BASE_DIR/videoreader_bindings.cpp \
    $BUILD_DIR/videostream.bc \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s STRICT=1 \
    -s WASM=1 \
    -o $BUILD_DIR/VideoReaderWorker.js
