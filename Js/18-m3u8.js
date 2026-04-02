/*
#!name = 抓取m3u8地址porn
#!desc = 自行添加hostname，为了防止频发通知，同一个视频连续打开第二次不会通知
#!author = fishdown[https://github.com/fishdown/Ggsddu]
#!icon = https://raw.githubusercontent.com/fishdown/Icon/refs/heads/master/app/porn.png

[Rule]
#-----------------------------------------------------------------m3u8地址
# 萝莉岛 妻友社区
DOMAIN-SUFFIX,cloudfront.net,PROXY
# 50度灰，海角社区，91porn短视频
# long.*.cn 走直连
# MissAV
DOMAIN-SUFFIX,cdn2020.com,PROXY
DOMAIN,surrit.com,PROXY
# 糖心
DOMAIN,tth.txh069.com,PROXY
# xx9
DOMAIN,babe.babeshop.xyz,PROXY
#ikm26 
DOMAIN,m2.kdamao.com,PROXY
# 麻豆社
DOMAIN,dash.madou.club,PROXY
# pear
DOMAIN-SUFFIX,pear2.cc,PROXY
# mmav
DOMAIN,kwmdmmsp.hongtaitanghua.com,PROXY
# 红杏视频
DOMAIN,bf4.qrtuv.com,PROXY
# 91工厂
DOMAIN-SUFFIX,kyxcom.com,PROXY
# 好色tv
DOMAIN-SUFFIX,hdcdn.online,PROXY

[MitM]
hostname = *.cloudfront.net,long.*.cn,*.cdn2020.com,surrit.com,babe.babeshop.xyz,m2.kdamao.com,dash.madou.club,*.pear2.cc,kwmdmmsp.hongtaitanghua.com,bf4.qrtuv.com,*.kyxcom.com,*.hdcdn.online

[Script]
http-request (?i)\.m3u8(?:\?|#|$) script-path=18-m3u8.js,requires-body=false,img-url=https://raw.githubusercontent.com/fishdown/Icon/master/app/m3u8.png,enable={sw},tag=抓取m3u8,argument=[{vid},{userscheme},{ucode}]

[Argument]
vid = select,"MKVPiP","lenna", "SenPlayer", "SenPlayer-dl", "Infuse", "Fileball", "VidHub", "Alook", "VLC", "KMPlayer", "IINA", "NPlayer", "Safari",tag=选取播放器,desc=
userscheme = input, "", tag=自定义Scheme, desc=
ucode  = select,"yes","no",tag=URL编码,desc=

*/

//
//  插件ui页面
//  自定义scheme优先级最高
//  
//  
//  

const reqUrl=$request.url;if(!reqUrl||!/\.m3u8(\?|$)/i.test(reqUrl)){console.log("请求地址非m3u8");$done({});return}const vid=($argument.vid||"").trim(),userscheme=($argument.userscheme||"").trim(),ucode=($argument.ucode||"").trim().toLowerCase(),video={"MKVPiP":"mkvpipurl://","lenna":"lenna://x-callback-url/play?url=","SenPlayer":"SenPlayer://x-callback-url/play?url=","Infuse":"infuse://x-callback-url/play?url=","Fileball":"filebox://play?url=","Alook":"Alook://","VLC":"vlc://","KMPlayer":"kmplayer://","VidHub":"vidhub://x-callback-url/play?url=","IINA":"iina://weblink?url=","NPlayer":"nplayer-http://","Safari":"http://"};let scheme="",playerName="";if(userscheme){scheme=userscheme;playerName="自定义";console.log("使用自定义 scheme:",scheme)}else{const key=Object.keys(video).find(k=>k.toLowerCase()===vid.toLowerCase());if(!key){console.log("未匹配播放器："+vid);console.log("可选:",Object.keys(video).join(", "));$done({});return}scheme=video[key];playerName=key}const finalUrl=ucode==="yes"?encodeURIComponent(reqUrl):reqUrl,cacheKey="LAST_M3U8_URL",lastUrl=$persistentStore.read(cacheKey);if(lastUrl===reqUrl){console.log("地址重复不通知");$done({});return}$persistentStore.write(reqUrl,cacheKey);let jumpUrl=scheme+finalUrl;console.log("跳转Url：",jumpUrl);const attach={openUrl:jumpUrl,clipboard:reqUrl};$notification.post("🎬 捕获到 m3u8",`播放器: ${playerName} | 编码: ${ucode==="yes"?"是":"否"}`,"",attach);$done({});




