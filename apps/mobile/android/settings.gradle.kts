// Gestión de plugins y repositorios para la aplicación móvil
pluginManagement {
    val flutterSdkPath = run {
        val properties = java.util.Properties() // Propiedades de configuración local
        file("local.properties").inputStream().use { properties.load(it) } // Carga la ruta de Flutter SDK
        val flutterSdkPath = properties.getProperty("flutter.sdk") // Obtiene la ruta del SDK
        require(flutterSdkPath != null) { "flutter.sdk no está configurado en local.properties" } // Valida que exista
        flutterSdkPath // Retorna la ruta
    }

    includeBuild("$flutterSdkPath/packages/flutter_tools/gradle") // Incluye las herramientas de Gradle de Flutter

    repositories {
        google() // Repositorio de Google para librerías de Android
        mavenCentral() // Repositorio central Maven
        gradlePluginPortal() // Portal de plugins de Gradle
    }
}

plugins {
    id("dev.flutter.flutter-plugin-loader") version "1.0.0" // Cargador de dependencias de plugins Flutter
    id("com.android.application") version "8.11.1" apply false // Plugin oficial de Android (Flutter estable exige 8.11.1 o más nuevo)
    id("org.jetbrains.kotlin.android") version "2.3.20" apply false // Kotlin 2.3.20: lee las librerías de Firebase compiladas con Kotlin 2.4 (Flutter pide 2.2.20 como mínimo)
    id("com.google.gms.google-services") version "4.5.0" apply false // Plugin de Google Services para Firebase
}

include(":app") // Incluye el módulo de la aplicación móvil
