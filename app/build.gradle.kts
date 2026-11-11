plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.neev.diwalicamera"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.neev.diwalicamera"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildTypes { release { isMinifyEnabled = false } }
    androidResources { noCompress += "wav" }
}
dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.camera:camera-camera2:1.4.2")
    implementation("androidx.camera:camera-lifecycle:1.4.2")
    implementation("androidx.camera:camera-view:1.4.2")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:rules:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.test.uiautomator:uiautomator:2.3.0")
}
val verifyAudioBundle by tasks.registering {
    val assetRoot=layout.projectDirectory.dir("src/main/assets")
    inputs.dir(assetRoot)
    doLast {
        for(name in listOf("anar","sutli","chakri","sky","ladi","phuljhadi")) {
            val file=assetRoot.file("audio/$name.wav").asFile
            check(file.isFile && file.length()>48000) { "Missing bundled recording: $name. See ASSETS.md." }
        }
        check(assetRoot.file("audio-manifest.json").asFile.isFile)
        check(assetRoot.file("credits.txt").asFile.isFile)
    }
}
tasks.named("preBuild").configure { dependsOn(verifyAudioBundle) }
