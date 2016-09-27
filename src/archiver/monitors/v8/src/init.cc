#include <v8.h>
#include <node.h>

#include "cv8.hh"

extern "C" {
    void Initialize(v8::Handle<v8::Object> target) {
        Nan::HandleScope scope;
        Nan::SetMethod(target, "onGC", cv8::OnGC);
        Nan::SetMethod(target, "gc", cv8::GC);
        Nan::AddGCPrologueCallback(cv8::GCPrologueCallback);
        Nan::AddGCEpilogueCallback(cv8::GCEpilogueCallback);
    }
    NODE_MODULE(cv8, Initialize);
};
