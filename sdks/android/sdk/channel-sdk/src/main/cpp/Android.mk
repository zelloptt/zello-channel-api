ORIG_PATH := $(call my-dir)

LOCAL_PATH := $(ORIG_PATH)
include $(CLEAR_VARS)
LOCAL_MODULE := embeddable.zello.sdk.util
LOCAL_SRC_FILES := \
		libutil.cpp wavefile.cpp

LOCAL_CFLAGS := -Wno-psabi
LOCAL_CFLAGS += -fvisibility=hidden -ffunction-sections -fdata-sections
LOCAL_CFLAGS += -DDLL_PUBLIC='__attribute__((visibility("default")))'
LOCAL_CFLAGS += -fno-stack-protector
LOCAL_LDFLAGS += -Wl,--cref,--gc-sections

ifeq ($(TARGET_ARCH),arm)
LOCAL_CFLAGS += -D__ARM__
endif

ifeq ($(TARGET_ARCH),x86)
LOCAL_CFLAGS += -D__X86__
endif

include $(BUILD_SHARED_LIBRARY)

include $(ORIG_PATH)/libopus/jni/Android.mk
