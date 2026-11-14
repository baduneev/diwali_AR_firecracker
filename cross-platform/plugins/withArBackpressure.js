const {withDangerousMod}=require('expo/config-plugins');
const fs=require('fs');const path=require('path');
const {stripSceneBridge,stripParticleBridge}=require('./renderer-archive');

// Viro 2.52.0 ships its bridge as an AAR. Replace scene event delivery and
// normalize particle colours; preserve renderer binaries, anchors and managers.
module.exports=function withArBackpressure(config){
 return withDangerousMod(config,['android',async c=>{
  const root=c.modRequest.projectRoot;
  const version=JSON.parse(fs.readFileSync(path.join(root,'node_modules/@reactvision/react-viro/package.json'),'utf8')).version;
  if(version!=='2.52.0')throw new Error('Review the native AR scene patch before changing Viro versions.');
  const aar=path.join(root,'node_modules/@reactvision/react-viro/android/react_viro/react_viro-release.aar');
  const original=fs.readFileSync(aar),patched=stripParticleBridge(stripSceneBridge(original));
  if(patched!==original)fs.writeFileSync(aar,patched);
  const destination=path.join(c.modRequest.platformProjectRoot,'app/src/main/java/com/viromedia/bridge/component/node');
  fs.mkdirSync(destination,{recursive:true});
  fs.copyFileSync(path.join(__dirname,'native/VRTARScene.java'),path.join(destination,'VRTARScene.java'));
  const controls=path.join(destination,'control');fs.mkdirSync(controls,{recursive:true});
  for(const file of ['VRTParticleEmitter.java','NormalizedParticleColor.java'])fs.copyFileSync(path.join(__dirname,'native',file),path.join(controls,file));
  return c;
 }]);
};
