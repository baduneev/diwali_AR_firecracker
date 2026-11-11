const {withProjectBuildGradle,withAndroidManifest,withInfoPlist,withGradleProperties}=require('expo/config-plugins');
module.exports=function withNativeCorrections(config){
 config=withGradleProperties(config,c=>{
  c.modResults=c.modResults.filter(p=>p.key!=='reactNativeArchitectures');
  c.modResults.push({type:'property',key:'reactNativeArchitectures',value:'arm64-v8a'});
  return c;
 });
 config=withProjectBuildGradle(config,c=>{
  // Viro's legacy replacement downgrades AGP to 4.1.1; RN 0.81 needs Expo's AGP.
  c.modResults.contents=c.modResults.contents.replace(/classpath\('com.android.tools.build:gradle:4\.1\.1'\)/g,'classpath("com.android.tools.build:gradle")');
  return c;
 });
 config=withAndroidManifest(config,c=>{
  const m=c.modResults.manifest;
  for(const f of m['uses-feature']||[]){if(f.$['android:name']==='android.hardware.camera.ar')f.$['android:required']='false';}
  for(const application of m.application||[]){for(const entry of application['meta-data']||[]){if(entry.$['android:name']==='com.google.ar.core')entry.$['android:value']='optional';}}
  return c;
 });
 config=withInfoPlist(config,c=>{
  delete c.modResults.NSMicrophoneUsageDescription;delete c.modResults.NSPhotoLibraryUsageDescription;delete c.modResults.NSPhotoLibraryAddUsageDescription;
  return c;
 });
 return config;
};
