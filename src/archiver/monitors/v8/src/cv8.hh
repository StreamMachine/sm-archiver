#ifndef __CV8_HH
#define __CV8_HH

#include <node.h>
#include <nan.h>

namespace cv8 {
    NAN_METHOD(OnGC);
    NAN_METHOD(GC);
    NAN_GC_CALLBACK(GCPrologueCallback);
    NAN_GC_CALLBACK(GCEpilogueCallback);
};

#endif
