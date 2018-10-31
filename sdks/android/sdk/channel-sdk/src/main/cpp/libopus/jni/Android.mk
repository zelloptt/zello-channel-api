MY_PATH := $(call my-dir)

LOCAL_PATH := $(MY_PATH)/libopus
include $(CLEAR_VARS)
include $(MY_PATH)/libopus/celt_sources.mk
include $(MY_PATH)/libopus/silk_sources.mk
LOCAL_MODULE := embeddable.zello.sdk.opus
LOCAL_SRC_FILES := \
	$(CELT_SOURCES) $(SILK_SOURCES) \
	src/opus.c src/opus_decoder.c src/opus_encoder.c src/opus_multistream.c src/repacketizer.c \
	../encoderopus.cpp  ../decoderopus.cpp ../../../amplifier.cpp ../libopus.cpp
LOCAL_C_INCLUDES := \
	$(LOCAL_PATH) $(MY_PATH)/libopus/include $(MY_PATH)/libopus/src \
	$(MY_PATH)/libopus/celt $(MY_PATH)/libopus/silk
LOCAL_CFLAGS += \
	-Drestrict='' -DOPUS_BUILD -DUSE_ALLOCA -DHAVE_LRINT -DHAVE_LRINTF -D__EMX__ \
	-fvisibility=hidden -ffunction-sections -fdata-sections \
	-DDLL_PUBLIC='__attribute__((visibility("default")))' \
	-fno-stack-protector -fno-math-errno -Wno-psabi
LOCAL_LDLIBS := -llog
LOCAL_LDFLAGS += -Wl,--cref,--gc-sections

ifeq ($(TARGET_ARCH_ABI),$(filter $(TARGET_ARCH_ABI), armeabi-v7a))

LOCAL_CFLAGS += \
	-DOPUS_ARM_INLINE_EDSP=1 -DOPUS_ARM_INLINE_ASM=1 -DOPUS_ARM_ASM \
	-DOPUS_ARM_INLINE_MEDIA=1 -DOPUS_ARM_INLINE_NEON=1 -DOPUS_ARM_MAY_HAVE_EDSP=1 \
	-DOPUS_ARM_MAY_HAVE_MEDIA=1 -DOPUS_ARM_MAY_HAVE_NEON=1 -DOPUS_ARM_MAY_HAVE_NEON_INTR \
	-DOPUS_ARM_PRESUME_EDSP=1 -DOPUS_ARM_PRESUME_MEDIA=1 -DOPUS_ARM_PRESUME_NEON=1 \
	-DOPUS_ARM_PRESUME_NEON_INTR=1
LOCAL_SRC_FILES += \
	$(CELT_SOURCES_ARM) $(CELT_SOURCES_ARM_NEON_INTR) \
	$(SILK_SOURCES_ARM_NEON_INTR) $(SILK_SOURCES_FLOAT) \
	celt/arm/celt_pitch_xcorr_arm-gnu.S \
	src/analysis.c src/mlp.c src/mlp_data.c
LOCAL_C_INCLUDES += $(MY_PATH)/libopus/silk/float
LOCAL_ARM_NEON := true

else ifeq ($(TARGET_ARCH_ABI),$(filter $(TARGET_ARCH_ABI), arm64-v8a))

LOCAL_CFLAGS += \
	-DFLOAT_APPROX=1 -DOPUS_ARM_MAY_HAVE_NEON_INTR=1 -DOPUS_ARM_PRESUME_AARCH64_NEON_INTR=1
LOCAL_SRC_FILES += \
	$(SILK_SOURCES_FLOAT) \
	src/analysis.c src/mlp.c src/mlp_data.c
LOCAL_C_INCLUDES += $(MY_PATH)/libopus/silk/float

else ifeq ($(TARGET_ARCH_ABI),$(filter $(TARGET_ARCH_ABI), x86_64))

LOCAL_CFLAGS += \
	-DCPU_INFO_BY_ASM=1
	-DFLOAT_APPROX=1 -DOPUS_HAVE_RTCD=1 -DOPUS_X86_MAY_HAVE_AVX=1 -DOPUS_X86_MAY_HAVE_SSE=1 \
	-DOPUS_X86_MAY_HAVE_SSE2=1 -DOPUS_X86_MAY_HAVE_SSE4_1=1 -DOPUS_X86_PRESUME_SSE=1 \
	-DOPUS_X86_PRESUME_SSE2=1
LOCAL_SRC_FILES += \
	$(SILK_SOURCES_FLOAT) $(SILK_SOURCES_SSE4_1) \
	$(CELT_SOURCES_SSE) $(CELT_SOURCES_SSE2) $(CELT_SOURCES_SSE4_1) \
	src/analysis.c src/mlp.c src/mlp_data.c
LOCAL_C_INCLUDES += $(MY_PATH)/libopus/silk/float

else ifeq ($(TARGET_ARCH_ABI),$(filter $(TARGET_ARCH_ABI), x86))

LOCAL_CFLAGS += \
	-DCPU_INFO_BY_ASM=1
	-DFLOAT_APPROX=1 -DOPUS_HAVE_RTCD=1 -DOPUS_X86_MAY_HAVE_AVX=1 -DOPUS_X86_MAY_HAVE_SSE=1 \
	-DOPUS_X86_MAY_HAVE_SSE2=1 -DOPUS_X86_MAY_HAVE_SSE4_1=1 -DOPUS_X86_PRESUME_SSE=1 \
	-DOPUS_X86_PRESUME_SSE2=1
LOCAL_SRC_FILES += \
	$(SILK_SOURCES_FLOAT) \
	$(CELT_SOURCES_SSE) $(CELT_SOURCES_SSE2) \
	src/analysis.c src/mlp.c src/mlp_data.c
LOCAL_C_INCLUDES += $(MY_PATH)/libopus/silk/float

else

LOCAL_CFLAGS +=  -DFIXED_POINT -DDISABLE_FLOAT_API
LOCAL_SRC_FILES += $(SILK_SOURCES_FIXED)
LOCAL_C_INCLUDES += $(MY_PATH)/libopus/silk/fixed

endif

ifeq ($(TARGET_ARCH),arm)
LOCAL_CFLAGS += -D__ARM__
endif

ifeq ($(TARGET_ARCH),x86)
LOCAL_CFLAGS += -D__X86__
endif

include $(BUILD_SHARED_LIBRARY)
