// Configuración de compilación para la aplicación Android de Baqueano Nicaragua
plugins {
    id("com.android.application") // Plugin principal de aplicación Android
    id("kotlin-android") // Soporte para código fuente en Kotlin
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin") // Integración con el motor de Flutter
    // Add the Google services Gradle plugin
    id("com.google.gms.google-services") // Plugin de Google Services para Firebase
}

android {
    namespace = "com.baqueano.nicaragua" // Espacio de nombres único de la aplicación
    compileSdk = flutter.compileSdkVersion // Versión de Android SDK para compilar
    ndkVersion = flutter.ndkVersion // Versión del NDK utilizada por Flutter

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11 // Compatibilidad de código fuente con Java 11
        targetCompatibility = JavaVersion.VERSION_11 // Código binario compatible con Java 11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString() // Destino de la máquina virtual de Kotlin
    }

    defaultConfig {
        applicationId = "com.baqueano.nicaragua" // Identificador del paquete de la aplicación
        minSdk = flutter.minSdkVersion // Versión mínima de Android admitida
        targetSdk = flutter.targetSdkVersion // Versión objetivo del sistema Android
        versionCode = flutter.versionCode // Número incremental de compilación
        versionName = flutter.versionName // Nombre descriptivo de la versión
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("debug") // Firma temporal de depuración para release local
        }
    }
}

flutter {
    source = "../.." // Ruta relativa a la raíz del paquete de Flutter
}

dependencies {
    // Import the Firebase BoM
    implementation(platform("com.google.firebase:firebase-bom:35.0.0")) // Plataforma BoM de Firebase para gestionar versiones alineadas

    // TODO: Add the dependencies for Firebase products you want to use
    // When using the BoM, don't specify versions in Firebase dependencies
    implementation("com.google.firebase:firebase-analytics") // Analítica de Firebase para la aplicación Android

    // Add the dependencies for any other desired Firebase products
    // https://firebase.google.com/docs/android/setup#available-libraries
}
