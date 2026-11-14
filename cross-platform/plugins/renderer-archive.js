const {unzipSync,zipSync}=require('fflate');
module.exports.stripParticleBridge=function(input){
 const aar=unzipSync(input),classes=unzipSync(aar['classes.jar']);
 const prefix='com/viromedia/bridge/component/node/control/VRTParticleEmitter';
 const names=Object.keys(classes).filter(name=>name===`${prefix}.class`||name.startsWith(`${prefix}$`));
 if(!names.length)return input;
 for(const name of names)delete classes[name];
 aar['classes.jar']=zipSync(classes,{level:6});return zipSync(aar,{level:6});
};
module.exports.stripSurfaceFactories=function(input){
 const aar=unzipSync(input),classes=unzipSync(aar['classes.jar']);
 const names=['com/viro/core/ViroEGLWindowSurfaceFactory.class','com/viro/core/ViroEGLTextureWindowSurfaceFactory.class'];
 if(!names.some(name=>classes[name]))return input;
 for(const name of names)delete classes[name];
 aar['classes.jar']=zipSync(classes,{level:6});
 return zipSync(aar,{level:6});
};
module.exports.stripSceneBridge=function(input){
 const aar=unzipSync(input),classes=unzipSync(aar['classes.jar']);
 const prefix='com/viromedia/bridge/component/node/VRTARScene';
 const names=Object.keys(classes).filter(name=>name===`${prefix}.class`||name.startsWith(`${prefix}$`));
 if(!names.length)return input;
 for(const name of names)delete classes[name];
 aar['classes.jar']=zipSync(classes,{level:6});
 return zipSync(aar,{level:6});
};
