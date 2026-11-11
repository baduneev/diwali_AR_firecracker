import {StyleSheet} from 'react-native';
export const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:'#11151b'},header:{position:'absolute',top:0,left:0,right:0,paddingHorizontal:18,paddingBottom:12,backgroundColor:'#10151caa'},
 topRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},brand:{color:'#fff7eb',fontSize:30,fontWeight:'600'},eyebrow:{color:'#e0d3c1',fontSize:9,letterSpacing:1.1,marginTop:3},
 status:{alignSelf:'center',borderRadius:18,backgroundColor:'#11171ed9',paddingHorizontal:16,paddingVertical:10,marginTop:20},statusText:{color:'#fff3dd',fontSize:13,textAlign:'center'},
 tray:{position:'absolute',bottom:0,left:0,right:0,borderTopLeftRadius:24,borderTopRightRadius:24,padding:18,backgroundColor:'#171e27f5'},selectedName:{color:'#fff7ec',fontSize:21,fontWeight:'600'},mode:{color:'#e2c494',fontSize:10,letterSpacing:1},
 hint:{fontSize:13,color:'#c8c9c9',marginTop:5,marginBottom:14},options:{gap:8,paddingBottom:14},chip:{minHeight:46,paddingHorizontal:14,borderRadius:13,justifyContent:'center',backgroundColor:'#28313e',borderWidth:1,borderColor:'#424d5a'},chipSelected:{backgroundColor:'#443b2e',borderColor:'#ffd18b'},chipText:{color:'#e7e8e7',fontSize:13},chipTextSelected:{color:'#ffe4b8'},
 viewControls:{gap:8,paddingBottom:12},
 actionRow:{flexDirection:'row',gap:10},button:{minHeight:48,justifyContent:'center',alignItems:'center',paddingHorizontal:16,borderRadius:15,backgroundColor:'#2c3745'},primary:{backgroundColor:'#ffd18b'},buttonText:{color:'#f6f3ed',fontSize:15,fontWeight:'600'},primaryText:{color:'#1c2026'},
 footer:{flexDirection:'row',alignItems:'center',gap:8,marginTop:10},small:{color:'#ced1d4',fontSize:12},about:{marginLeft:'auto',minHeight:44,justifyContent:'center',paddingLeft:12},
 center:{flex:1,alignItems:'center',justifyContent:'center',gap:18},big:{fontSize:25,color:'#fff5e9',textAlign:'center'},body:{fontSize:15,lineHeight:23,color:'#c9cfd5',textAlign:'center'},
});
