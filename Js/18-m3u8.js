/*
#!name = 抓取m3u8地址porn
#!desc = 自行添加hostname，为了防止频发通知，同一个视频连续打开第二次不会通知
#!author = fishdown[https://github.com/fishdown/Ggsddu]
#!icon = https://raw.githubusercontent.com/fishdown/Icon/refs/heads/master/app/porn.png

[Script]
http-request (?i)\.m3u8(?:\?|#|$) script-path=https://raw.githubusercontent.com/fishdown/Ggsddu/refs/heads/master/Js/18-m3u8.js,img-url=https://raw.githubusercontent.com/fishdown/Icon/master/app/m3u8.png,  tag = 抓取m3u8, argument=[{sch}]

[Argument]
sch = input,"mkvpipurl://",tag=输入完整scheme,desc=

[MitM]
hostname = *.cloudfront.net,long.gfuhubh.cn



# 萝莉岛 d1w3p997s8acw6.cloudfront.net
# 妻友社区 d10cvfvt18g9rw.cloudfront.net
# 50度灰 long.gfuhubh.cn:443


插件ui页面填写Scheme
Scheme示例：
- Safari：留空
- SenPlayer：SenPlayer://x-callback-url/play?url=
- MKVPiP：mkvpipurl://

*/


// 当前请求 URL
const reqUrl = $request.url;
// console.log("请求Url：");
// console.log(reqUrl);

// 仅处理 m3u8
if (!reqUrl || !/\.m3u8(\?|$)/i.test(reqUrl)) {
  console.log("请求地址非m3u8");
  $done({});
  return;
}

// 从 argument 获取 scheme
const scheme = ($argument.sch || "").trim();
// console.log("获取到的scheme：");
// console.log(scheme);

// 读取上一次 m3u8
const cacheKey = "LAST_M3U8_URL";
const lastUrl = $persistentStore.read(cacheKey);

// 防止重复通知
if (lastUrl === reqUrl) {
  console.log("地址重复不通知");
  $done({});
  return;
}

// 写入缓存
$persistentStore.write(reqUrl, cacheKey);

// 拼接跳转链接
const jumpUrl = scheme + reqUrl;
console.log("跳转Url：");
console.log(jumpUrl);

// 通知附件（点击跳转 + 复制）
const attach = {
  openUrl: jumpUrl,
  clipboard: reqUrl
};

// 发送通知
$notification.post(
  "🎬 捕获到 m3u8",
  "点击使用播放器打开",
  "",
  attach
);

$done({});






