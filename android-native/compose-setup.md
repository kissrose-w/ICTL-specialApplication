# Android 原生开启 Jetpack Compose & Glance 桌面小组件配置指南

本项目架构支持通过 **Expo Prebuild** (`npx expo prebuild --platform android`) 生成原生工程，或者直接接入已有 Bare 原生工程。以下是在 Android 原生层启用 **Jetpack Compose** 与 **Glance AppWidget**（桌面小组件）的核心 Gradle 配置。

---

## 1. 根级 `android/build.gradle` 配置

在 `buildscript` 或根级 `plugins` 中确保引入 Kotlin 及 Compose 编译器插件（对于 Kotlin 2.0+ 推荐使用 Compose 官方 Gradle 插件）：

```groovy
buildscript {
    ext {
        buildToolsVersion = findProperty('android.buildToolsVersion') ?: '35.0.0'
        minSdkVersion = Integer.parseInt(findProperty('android.minSdkVersion') ?: '24')
        compileSdkVersion = Integer.parseInt(findProperty('android.compileSdkVersion') ?: '35')
        targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '35')
        kotlinVersion = findProperty('android.kotlinVersion') ?: '2.0.21'
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
        // Kotlin 2.0+ 官方 Compose 编译器插件
        classpath("org.jetbrains.kotlin:compose-compiler-gradle-plugin:$kotlinVersion")
    }
}
```

---

## 2. 模块级 `android/app/build.gradle` 核心配置

在 `android/app/build.gradle` 文件中添加以下内容：

```groovy
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
// 启用 Compose 编译器插件 (Kotlin 2.0+)
apply plugin: "org.jetbrains.kotlin.plugin.compose"

android {
    namespace "com.ictl.duoapp"
    compileSdkVersion rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.ictl.duoapp"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
    }

    // 1. 开启 Jetpack Compose 特性支持
    buildFeatures {
        compose true
    }

    // 若使用的是 Kotlin 1.9.x (旧版)，则需在此处配置 composeOptions:
    // composeOptions {
    //     kotlinCompilerExtensionVersion = "1.5.14"
    // }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // React Native 依赖
    implementation("com.facebook.react:react-android")

    // 2. Jetpack Compose BOM 统一版本管理 (推荐 2024.09.00 或更高)
    def composeBom = platform('androidx.compose:compose-bom:2024.09.00')
    implementation composeBom
    androidTestImplementation composeBom

    // Compose 核心 UI 库
    implementation 'androidx.compose.ui:ui'
    implementation 'androidx.compose.ui:ui-graphics'
    implementation 'androidx.compose.ui:ui-tooling-preview'
    implementation 'androidx.compose.material3:material3'
    debugImplementation 'androidx.compose.ui:ui-tooling'

    // 3. Android 桌面小组件专用的 Glance 库
    implementation 'androidx.glance:glance-appwidget:1.1.0'
    implementation 'androidx.glance:glance-material3:1.1.0'

    // 4. 精确闹钟与后台唤醒所需核心组件
    implementation 'androidx.core:core-ktx:1.13.1'
    implementation 'androidx.work:work-runtime-ktx:2.9.1'
}
```

---

## 3. AndroidManifest.xml 权限与桌面小组件声明

在 `android/app/src/main/AndroidManifest.xml` 中添加精准闹钟唤醒权限和小组件 Receiver：

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Android 12+ (API 31+) 调度精确闹钟所需权限 -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application ...>
        <!-- 声明 Glance 桌面小组件 Receiver -->
        <receiver
            android:name=".glance.DuoTodoAppWidgetReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/duo_widget_info" />
        </receiver>
    </application>
</manifest>
```

---

## 4. Kotlin Glance 小组件与 React Native 桥接示例代码

### (1) Glance 桌面小组件界面 (`DuoTodoAppWidget.kt`)
```kotlin
package com.ictl.duoapp.glance

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

class DuoTodoAppWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            GlanceTheme {
                WidgetContent()
            }
        }
    }

    @Composable
    private fun WidgetContent() {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(12.dp)
                .background(GlanceTheme.colors.background)
        ) {
            Text(
                text = "双人专属待办",
                style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp)
            )
            Spacer(modifier = GlanceModifier.height(8.dp))
            Row(modifier = GlanceModifier.fillMaxWidth()) {
                Text(text = "我: 1 项待办", modifier = GlanceModifier.defaultWeight())
                Text(text = "TA: 2 项待办", modifier = GlanceModifier.defaultWeight())
            }
        }
    }
}

class DuoTodoAppWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = DuoTodoAppWidget()
}
```

### (2) React Native 桥接模块 (`GlanceWidgetModule.kt`)
```kotlin
package com.ictl.duoapp.bridge

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import androidx.glance.appwidget.updateAll
import com.ictl.duoapp.glance.DuoTodoAppWidget
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GlanceWidgetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "GlanceWidgetModule"

    @ReactMethod
    fun updateWidgetData(payloadJson: String, promise: Promise) {
        // 保存数据至 Android SharedPreferences (供 Glance 读取)
        val prefs = reactContext.getSharedPreferences("duo_widget_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("widget_data", payloadJson).apply()

        // 刷新所有 Glance 小组件
        CoroutineScope(Dispatchers.IO).launch {
            try {
                DuoTodoAppWidget().updateAll(reactContext)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("WIDGET_ERROR", e.message)
            }
        }
    }
}
```
