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
http-request (?i)\.m3u8(?:\?|#|$) script-path=https://raw.githubusercontent.com/fishdown/Ggsddu/refs/heads/master/Js/18-m3u8.js,img-url=https://raw.githubusercontent.com/fishdown/Icon/master/app/m3u8.png,  tag = 抓取m3u8, argument=[{sch}]

[Argument]
sch = input,"mkvpipurl://",tag=输入完整scheme,desc=

*/

//
//  插件ui页面填写Scheme
//  Scheme示例：
// - Safari：留空
//- SenPlayer：SenPlayer://x-callback-url/play?url=
//- MKVPiP：mkvpipurl://


const reqUrl=$request.url;if(!reqUrl||!/\.m3u8(\?|$)/i.test(reqUrl)){console.log("请求地址非m3u8");$done({});return}const scheme=($argument.sch||"").trim();const cacheKey="LAST_M3U8_URL";const lastUrl=$persistentStore.read(cacheKey);if(lastUrl===reqUrl){console.log("地址重复不通知");$done({});return}$persistentStore.write(reqUrl,cacheKey);const jumpUrl=scheme+reqUrl;console.log("跳转Url：");console.log(jumpUrl);const attach={openUrl:jumpUrl,clipboard:reqUrl};$notification.post("🎬 捕获到 m3u8","点击使用播放器打开","",attach);$done({});





