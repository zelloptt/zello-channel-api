# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

-keep public class * extends android.content.BroadcastReceiver
-keep public class com.zello.channel.sdk.BuildConfig { *; }

-keep public class com.zello.channel.sdk.IncomingVoiceConfiguration { *; }
-keep public class com.zello.channel.sdk.IncomingVoiceStream { *; }
-keep public class com.zello.channel.sdk.IncomingVoiceStreamInfo { *; }
-keep public class com.zello.channel.sdk.OutgoingVoiceConfiguration { *; }
-keep public class com.zello.channel.sdk.OutgoingVoiceStream { *; }
-keep public enum com.zello.channel.sdk.OutgoingVoiceStreamError { *; }
-keep public enum com.zello.channel.sdk.ReconnectReason { *; }
-keep public class com.zello.channel.sdk.Session { *; }
-keep public class com.zello.channel.sdk.Session$Builder { *; }
-keep public enum com.zello.channel.sdk.SessionConnectError { *; }
-keep public enum com.zello.channel.sdk.SessionConnectError$Code { *; }
-keep public class com.zello.channel.sdk.SessionListener { *; }
-keep public class com.zello.channel.sdk.SessionLogger { *; }
-keep public class com.zello.channel.sdk.SessionLoggerAdb { *; }
-keep public class com.zello.channel.sdk.SessionLoggerNull { *; }
-keep public enum com.zello.channel.sdk.SessionState { *; }
-keep public class com.zello.channel.sdk.VoiceReceiver { *; }
-keep public class com.zello.channel.sdk.VoiceSink { *; }
-keep public class com.zello.channel.sdk.VoiceSource { *; }
-keep public class com.zello.channel.sdk.VoiceStream { *; }
-keep public enum com.zello.channel.sdk.VoiceStreamState { *; }
