package com.timeseal_aurasoft_systems

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppVersionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppVersion"

  @ReactMethod
  fun getVersion(promise: Promise) {
    val versionMap = Arguments.createMap()
    versionMap.putString("versionName", BuildConfig.VERSION_NAME)
    versionMap.putInt("versionCode", BuildConfig.VERSION_CODE)
    versionMap.putString("packageName", BuildConfig.APPLICATION_ID)
    promise.resolve(versionMap)
  }
}
