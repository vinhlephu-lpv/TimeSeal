# ProGuard/R8 rules for React Native + Firebase

# Keep React Native bridge / Hermes related classes
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**

# Firebase / Google Play services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Keep annotation metadata used by Firebase / Kotlin reflection paths
-keepattributes *Annotation*

# Keep react-native-image-picker model classes
-keep class com.imagepicker.** { *; }

# Keep react-native-permissions
-keep class com.zoontek.rnpermissions.** { *; }

# Keep react-native-view-shot
-keep class fr.greweb.reactnativeviewshot.** { *; }
