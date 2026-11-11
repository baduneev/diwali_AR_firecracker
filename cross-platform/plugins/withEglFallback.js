const {withDangerousMod}=require('expo/config-plugins');
const fs=require('fs');const path=require('path');
const {stripSurfaceFactories}=require('./renderer-archive');
module.exports=function withEglFallback(config){
 return withDangerousMod(config,['android',async c=>{
  const root=c.modRequest.projectRoot;
  const aar=path.join(root,'node_modules/@reactvision/react-viro/android/viro_renderer/viro_renderer-release.aar');
  const original=fs.readFileSync(aar),patched=stripSurfaceFactories(original);
  if(patched!==original)fs.writeFileSync(aar,patched);
  const destination=path.join(c.modRequest.platformProjectRoot,'app/src/main/java/com/viro/core');
  fs.mkdirSync(destination,{recursive:true});
  for(const name of ['ViroEGLWindowSurfaceFactory.java','ViroEGLTextureWindowSurfaceFactory.java']){
   fs.copyFileSync(path.join(__dirname,'native',name),path.join(destination,name));
  }
  return c;
 }]);
};
