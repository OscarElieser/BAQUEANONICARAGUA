// Configuración de compilación para la aplicación Android de Baqueano Nicaragua
import java.util.Properties // Lee el archivo key.properties (pares nombre=valor)

plugins {
    id("com.android.application") // Plugin principal de aplicación Android
    id("kotlin-android") // Soporte para código fuente en Kotlin
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin") // Integración con el motor de Flutter
    // Add the Google services Gradle plugin
    id("com.google.gms.google-services") // Plugin de Google Services para Firebase
}

// Llave de firma de publicación del dueño. Vive solo en su computadora o en los secretos de GitHub, nunca en el repositorio:
// android/key.properties (ignorado por git) dice dónde está el archivo .jks y sus contraseñas. Pasos en docs/DESPLIEGUE.md.
val firmaPropiedades = Properties() // Datos de la llave de publicación
val firmaArchivo = rootProject.file("key.properties") // Archivo apps/mobile/android/key.properties
val hayFirmaPropia = firmaArchivo.exists() // Si el dueño ya creó su llave en esta computadora
if (hayFirmaPropia) firmaArchivo.inputStream().use { firmaPropiedades.load(it) } // Lee los datos solo si el archivo existe

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

    signingConfigs {
        if (hayFirmaPropia) { // Solo se declara cuando existe key.properties
            create("publicacion") { // Llave propia para Google Play
                storeFile = file(requireNotNull(firmaPropiedades.getProperty("storeFile")) { "Falta storeFile en key.properties" }) // Ruta del archivo .jks
                storePassword = requireNotNull(firmaPropiedades.getProperty("storePassword")) { "Falta storePassword en key.properties" } // Contraseña del almacén
                keyAlias = requireNotNull(firmaPropiedades.getProperty("keyAlias")) { "Falta keyAlias en key.properties" } // Nombre de la llave dentro del almacén
                keyPassword = requireNotNull(firmaPropiedades.getProperty("keyPassword")) { "Falta keyPassword en key.properties" } // Contraseña de la llave
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hayFirmaPropia) signingConfigs.getByName("publicacion") else signingConfigs.getByName("debug") // Llave propia si existe; si no, la de pruebas (sirve para probar, no para Google Play)
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
