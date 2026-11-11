const {unzipSync,zipSync}=require('fflate');
module.exports.stripSurfaceFactories=function(input){
 const aar=unzipSync(input),classes=unzipSync(aar['classes.jar']);
 const names=['com/viro/core/ViroEGLWindowSurfaceFactory.class','com/viro/core/ViroEGLTextureWindowSurfaceFactory.class'];
 if(!names.some(name=>classes[name]))return input;
 for(const name of names)delete classes[name];
 aar['classes.jar']=zipSync(classes,{level:6});
 return zipSync(aar,{level:6});
};
