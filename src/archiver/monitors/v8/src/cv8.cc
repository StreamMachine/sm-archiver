#include "cv8.hh"

#include <node.h>
#include <string>

#define NANOS_PER_SEC 1000000000

using namespace v8;
using namespace node;

Nan::Callback *g_cb;

struct Baton {
    uv_work_t req;
    GCType type;
};

static struct {
    uint64_t start_t;
    uint64_t finish_t;
    size_t last_m = 0;
    size_t start_m = 0;
    size_t finish_m = 0;
} stats;

static void GCEpilogue(uv_work_t* request) {
    Nan::HandleScope scope;
    Baton * b = (Baton *) request->data;
    std::string event;
    std::string type;

    if (b->type == kGCTypeMarkSweepCompact) {
        event = "gc:full";
        type = "full";
    }
    else {
        event = "gc:inc";
        type = "inc";
    }
    if (!g_cb->IsEmpty()) {
        uint64_t diff = stats.finish_t - stats.start_t;
        Local<Array> duration = Nan::New<Array>(2);
        Local<Object> data = Nan::New<v8::Object>();
        Local<Value> argv[2];

        duration->Set(0, Nan::New<Number>(diff / NANOS_PER_SEC));
        duration->Set(1, Nan::New<Number>(diff % NANOS_PER_SEC));
        data->Set(Nan::New("type").ToLocalChecked(), Nan::New(type).ToLocalChecked());
        data->Set(Nan::New("duration").ToLocalChecked(), duration);
        data->Set(Nan::New("allocated").ToLocalChecked(), Nan::New<v8::Number>(stats.start_m - stats.last_m));
        data->Set(Nan::New("released").ToLocalChecked(), Nan::New<v8::Number>(stats.start_m - stats.finish_m));
        argv[0] = Nan::New(event).ToLocalChecked();
        argv[1] = data;
        g_cb->Call(2, argv);
    }
    delete b;
}

static void noop(uv_work_t *) { }

NAN_GC_CALLBACK(cv8::GCPrologueCallback) {
    Nan::HandleScope scope;
    v8::HeapStatistics hs;
    Nan::GetHeapStatistics(&hs);

    stats.start_t = uv_hrtime();
    stats.start_m = hs.used_heap_size();
};

NAN_GC_CALLBACK(cv8::GCEpilogueCallback) {
    Nan::HandleScope scope;
    Baton * baton = new Baton;
    v8::HeapStatistics hs;
    Nan::GetHeapStatistics(&hs);

    stats.finish_t = uv_hrtime();
    stats.last_m = stats.finish_m;
    stats.finish_m = hs.used_heap_size();
    baton->type = type;
    baton->req.data = (void *) baton;
    uv_queue_work(uv_default_loop(), &(baton->req), noop, (uv_after_work_cb)GCEpilogue);
};

NAN_METHOD(cv8::OnGC) {
    Nan::HandleScope scope;
    if (info.Length() >= 1 && info[0]->IsFunction()) {
        g_cb = new Nan::Callback(info[0].As<v8::Function>());
    }
    info.GetReturnValue().Set(Nan::Undefined());
};

NAN_METHOD(cv8::GC) {
    Nan::HandleScope scope;
    int deadline_in_ms = 500;
    if (info.Length() >= 1 && info[0]->IsNumber()) {
        deadline_in_ms = (int)(info[0]->Int32Value());
    }
    Nan::IdleNotification(deadline_in_ms);
    Nan::LowMemoryNotification();
    info.GetReturnValue().Set(Nan::Undefined());
};
