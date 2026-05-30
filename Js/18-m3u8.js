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
http-request \.m3u8 script-path=https://raw.githubusercontent.com/fishdown/Ggsddu/refs/heads/master/Js/18-m3u8.js,requires-body=false,img-url=https://raw.githubusercontent.com/fishdown/Icon/master/app/m3u8.png,tag=抓取m3u8,argument=[{vid},{userscheme},{ucode}]

[Argument]
vid = select,"MKVPiP","lenna", "SenPlayer", "SenPlayer-dl", "Infuse", "Fileball", "VidHub", "Alook", "VLC", "KMPlayer", "IINA", "NPlayer", "Safari",tag=选取播放器,desc=
userscheme = input, "", tag=自定义Scheme, desc=
ucode  = select,"yes","no",tag=URL编码,desc=

*/

/**
 * 抓取 m3u8 地址并发送通知。
 *
 * 使用场景：
 * - 该脚本运行在支持 $request / $argument / $notification / $persistentStore 的代理脚本环境中。
 * - 当请求 URL 命中 .m3u8 时，根据配置的播放器 Scheme 生成跳转链接。
 * - 通过通知提供一键打开播放器的 openUrl，并将原始 m3u8 地址写入剪贴板。
 *
 * 参数说明：
 * - vid：预设播放器名称。
 * - userscheme：自定义播放器 Scheme，优先级高于 vid。
 * - ucode：是否对 m3u8 URL 进行 encodeURIComponent 编码，yes 表示编码。
 */

// 当前请求地址。
const reqUrl = $request.url;

// 仅处理 m3u8 请求；非 m3u8 请求直接放行并结束脚本。
if (!reqUrl || !/\.m3u8/i.test(reqUrl)) {
  console.log("请求地址非 m3u8");
  $done({});
  return;
}

// 读取插件参数，并做基础清理。
const vid = ($argument.vid || "").trim();
const userscheme = ($argument.userscheme || "").trim();
const ucode = ($argument.ucode || "").trim().toLowerCase();

/**
 * 预设播放器 Scheme 映射表。
 *
 * key：插件 UI 中选择的播放器名称。
 * value：对应播放器用于打开 URL 的 Scheme 前缀。
 */
const video = {
  MKVPiP: "mkvpipurl://",
  lenna: "lenna://x-callback-url/play?url=",
  SenPlayer: "SenPlayer://x-callback-url/play?url=",
  Infuse: "infuse://x-callback-url/play?url=",
  Fileball: "filebox://play?url=",
  Alook: "Alook://",
  VLC: "vlc://",
  KMPlayer: "kmplayer://",
  VidHub: "vidhub://x-callback-url/play?url=",
  IINA: "iina://weblink?url=",
  NPlayer: "nplayer-http://",
  Safari: "http://",
};

let scheme = "";
let playerName = "";

// 自定义 Scheme 优先级最高：填写后不再使用预设播放器映射。
if (userscheme) {
  scheme = userscheme;
  playerName = "自定义";
  console.log("使用自定义 scheme:", scheme);
} else {
  // 忽略大小写匹配播放器名称，避免参数大小写差异导致无法匹配。
  const key = Object.keys(video).find((item) => item.toLowerCase() === vid.toLowerCase());

  // 未匹配到播放器时，打印可选项并结束脚本。
  if (!key) {
    console.log("未匹配播放器：" + vid);
    console.log("可选:", Object.keys(video).join(", "));
    $done({});
    return;
  }

  scheme = video[key];
  playerName = key;
}

// 根据配置决定是否对原始 m3u8 地址进行 URL 编码。
// 某些播放器需要编码后的 URL，某些播放器可直接使用原始 URL。
const finalUrl = ucode === "yes" ? encodeURIComponent(reqUrl) : reqUrl;

// 缓存上一次通知过的 m3u8 地址，避免同一个视频连续打开时频繁通知。
const cacheKey = "LAST_M3U8_URL";
const lastUrl = $persistentStore.read(cacheKey);

if (lastUrl === reqUrl) {
  console.log("地址重复不通知");
  $done({});
  return;
}

// 记录本次 m3u8 地址，用于下一次去重判断。
$persistentStore.write(reqUrl, cacheKey);

// 拼接最终跳转链接：播放器 Scheme + m3u8 地址。
const jumpUrl = scheme + finalUrl;

console.log("跳转Url：\n" + jumpUrl);

// 通知附加动作：
// - openUrl：点击通知后打开播放器。
// - clipboard：复制原始 m3u8 地址，便于手动粘贴使用。
const attach = {
  openUrl: jumpUrl,
  clipboard: reqUrl,
};

// 发送通知。
$notification.post(
  "🎬 捕获到 m3u8",
  `播放器: ${playerName} | 编码: ${ucode === "yes" ? "是" : "否"}`,
  "",
  attach
);

$done({});
