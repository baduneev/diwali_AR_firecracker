import {StyleSheet} from 'react-native';
export const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:'#11151b'},
 topRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
 statusText:{color:'#e2e4e6',fontSize:12,lineHeight:16,minHeight:16},
 tray:{position:'absolute',bottom:0,left:0,right:0,borderTopLeftRadius:18,borderTopRightRadius:18,paddingHorizontal:12,paddingTop:10,gap:8,backgroundColor:'#171e27ed'},
 selectedName:{color:'#fff7ec',fontSize:21,fontWeight:'600'},
 options:{gap:8},chip:{minHeight:48,paddingHorizontal:14,borderRadius:12,justifyContent:'center',backgroundColor:'#28313e',borderWidth:1,borderColor:'#424d5a'},chipSelected:{backgroundColor:'#443b2e',borderColor:'#ffd18b'},chipText:{color:'#e7e8e7',fontSize:13},chipTextSelected:{color:'#ffe4b8'},
 actionRow:{flexDirection:'row',gap:8},button:{minHeight:48,justifyContent:'center',alignItems:'center',paddingHorizontal:14,borderRadius:12,backgroundColor:'#2c3745'},primary:{backgroundColor:'#ffd18b'},buttonText:{color:'#f6f3ed',fontSize:14,fontWeight:'600'},primaryText:{color:'#1c2026'},
 small:{color:'#ced1d4',fontSize:12,lineHeight:18},
 modalRoot:{flex:1,justifyContent:'flex-end',backgroundColor:'#00000088'},
 settings:{backgroundColor:'#171e27',borderTopLeftRadius:22,borderTopRightRadius:22,padding:16,gap:12},
 settingsContent:{gap:12,paddingBottom:8},
 settingRow:{flexDirection:'row',alignItems:'center',minHeight:48,gap:12,justifyContent:'space-between'},settingLabel:{flex:1,color:'#f6f3ed',fontSize:15},
 settingButtons:{flexDirection:'row',flexWrap:'wrap',gap:8},
 center:{flex:1,alignItems:'center',justifyContent:'center',gap:18},big:{fontSize:25,color:'#fff5e9',textAlign:'center'},body:{fontSize:15,lineHeight:23,color:'#c9cfd5',textAlign:'center'},
});
