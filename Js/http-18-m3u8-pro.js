/*
#!name = M3u8地址获取Pro版本
#!desc = 使用教程看Arg名称,详细说明js内查看
#!tag = fishdown
#!icon = https://raw.githubusercontent.com/fishdown/Icon/master/app/m3u8.png


[Argument]
notify  = switch,true,tag=Loon通知+点通知跳转,desc=和 vid 搭配使用
webhook  = switch,false,tag=推送Webhook,desc=webhook推送开关
webhookUrl = input, "", tag=webhookUrl, desc=webhookUrl地址从 https://webhook.site 获取，和 webhook 搭配使用
vid = select,"MKVPiP","lenna", "SenPlayer", "SenPlayer-dl", "Infuse", "Fileball", "VidHub", "Alook", "VLC", "KMPlayer", "IINA", "NPlayer", "Safari",tag=播放器,desc= 选择播放器类型
userscheme = input, "", tag=自定义播放器Scheme - 优先级最高, desc=
ucode  = switch,false,tag=m3u8URL编码 - 不智能+自己判断,desc=不会根据播放器自动识别需不需编码，自己去试
SkipKeywords = input, "", tag=url关键字跳过抓取en逗号隔开, desc= 例如：abc,cdsd,cdsf,wefw/wer,sfsdf.sfsdf.com,sfdf  


[Script]
http-request \.(m3u8|mp4|flv) script-path=https://raw.githubusercontent.com/fishdown/Ggsddu/refs/heads/master/Js/http-18-m3u8-pro.js,requires-body=false,img-url=https://raw.githubusercontent.com/fishdown/Icon/master/app/m3u8.png,enable={sw},tag=抓取m3u8,argument=[{notify},{webhook},{webhookUrl},{vid},{userscheme},{ucode},{SkipKeywords}]


[MitM]
hostname = *.top,www.hairwwwtoppd125.com,ikmjx.com,www.vv99kk.com,miss1.net,dash.madou.club,madou.club,*.cloudfront.net,*.cdn2020.com,surrit.com,babe.babeshop.xyz,m2.kdamao.com,kwmdmmsp.hongtaitanghua.com,m2.kdamao.com,bf4.qrtuv.com,*.kyxcom.com,nnrj1219.awbfszm5.work,long.*.cn,*.hdcdn.online,69833acc.soft-rain-111.site,recordplay.biz,h9k2w.cc,*.vf84i7x.work,live.douyin.com





*/

// https://webhook.site   推送地址，拿到后需填入UI页面

// ==========
// 启动日志
// ==========
console.log("====== 📡 M3U8 捕获脚本开始 ======");

// ==========
// 获取请求 URL
// ==========
const requestUrl = $request.url;
console.log("请求URL: \n" + requestUrl);

// 校验视频请求：m3u8 / mp4 / flv
if (!requestUrl || !/\.(m3u8|mp4|flv)(\?|#|$)/i.test(requestUrl)) {
    console.log("❌ 非 m3u8/mp4/flv 请求，退出");
    $done({});
    return;
}

// ==========
// 参数获取（带兜底）
// ==========
const args = typeof $argument !== "undefined" ? $argument : {};
console.log("\n插件原始参数:\n" + JSON.stringify(args));

const notify = String(args.notify);
const webhook = String(args.webhook);
const webhookUrl = (args.webhookUrl || "").trim();
const targetPlayer = args.vid;
const customScheme = (args.userscheme || "").trim();
const needEncode = String(args.ucode);

console.log("参数解析:");
console.log("notify=" + notify);      // true
console.log("webhook=" + webhook);    // false
console.log("webhookUrl=" + webhookUrl); // 空字符串（你传的就是空）
console.log("vid=" + targetPlayer);   // MKVPiP
console.log("userscheme=" + customScheme); // 空字符串
console.log("ucode=" + needEncode);   // false

// ==========
// 运行拦截关键词数组
// 插件参数示例：SkipKeywords=abc,cdsd,cdsf,wefw/wer,sfsdf.sfsdf.com,sfdf
// ==========

// 脚本内置关键词：直接用英文逗号隔开
const baseSkipKeywordsText = ".css,.js,.png,.jpg,.jpeg,.gif,.svg,.ico";

// 插件 UI 中声明的变量名为 SkipKeywords，通过 $argument.SkipKeywords 获取
const argSkipKeywordsText = String(args.SkipKeywords || "");

const skipKeywords = Array.from(
    new Set(
        (baseSkipKeywordsText + "," + argSkipKeywordsText)
            .split(",")
            .map(keyword => keyword.trim())
            .filter(Boolean)
    )
);

console.log("\n拦截关键词数组: \n" + JSON.stringify(skipKeywords));

// 请求地址命中关键词则停止运行
if (skipKeywords.some(keyword => requestUrl && requestUrl.includes(keyword))) {
    console.log("⛔ 请求地址命中拦截关键词，停止运行，命中关键词: " + skipKeywords.find(keyword => requestUrl.includes(keyword)));
    $done({});
    return;
}


// ==========
// 播放器表
// ==========
const playerSchemes = {
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
    Safari: ""
};

// ==========
// 选择播放器
// ==========
let usedScheme = "";
let playerName = "";

if (customScheme) {
    usedScheme = customScheme;
    playerName = "自定义";
    console.log("\n使用自定义 scheme: " + usedScheme);
} else {
    const matchedKey = Object.keys(playerSchemes).find(
        key => key.toLowerCase() === targetPlayer.toLowerCase()
    );

    if (!matchedKey) {
        console.log("\n未匹配播放器: " + targetPlayer);
        console.log("\n可选: " + Object.keys(playerSchemes).join(", "));
        $done({});
        return;
    }

    usedScheme = playerSchemes[matchedKey];
    playerName = matchedKey;
    console.log("\n匹配播放器: " + playerName);
}

// ==========
// 编码处理
// ==========
const mustEncodePlayers = ["Infuse", "IINA", "VidHub", "SenPlayer", "lenna"];

const finalVideoUrl =
    needEncode === "true" ||
        (needEncode !== "false" && mustEncodePlayers.indexOf(playerName) !== -1)
        ? encodeURIComponent(requestUrl)
        : requestUrl;

console.log("\n编码后URL: \n" + finalVideoUrl);

// ==========
// 去重
// ==========
const cacheKey = "M3U8_LAST_" + playerName;
const lastUrl = $persistentStore.read(cacheKey);

console.log("\n缓存URL: \n" + lastUrl);

if (lastUrl === requestUrl) {
    console.log("\n重复地址，跳过");
    $done({});
    return;
}

$persistentStore.write(requestUrl, cacheKey);
console.log("已写入缓存");

// ==========
// 生成跳转
// ==========
const jumpUrl = usedScheme ? usedScheme + finalVideoUrl : requestUrl;

console.log("\n最终跳转URL: \n" + jumpUrl);

// ==========
// 通知配置
// ==========
const notificationAttach = {
    openUrl: jumpUrl,
    clipboard: requestUrl
};

// ==========
// 防卡死控制
// ==========
let isDone = false;

function finish() {
    if (!isDone) {
        isDone = true;
        console.log("====== ✅ 脚本结束 ======");
        $done({});
    }
}

// ==========
// webhook 分支判断（重点日志）
// ==========
console.log("\n进入 webhook 判断...");
console.log("条件 webhook===" + webhook + " && webhookUrl存在=" + (!!webhookUrl));

if (webhook === "true" && webhookUrl) {

    console.log("\n进入 webhook 分支");
    const params = {
        url: webhookUrl,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestUrl),
        timeout: 5000
    };

    console.log("发送 webhook 请求: " + webhookUrl);

    $httpClient.post(params, function (err, resp, data) {

        console.log("📥 webhook 回调触发");

        if (err) {
            console.log("❌ webhook 错误: " + err);
        } else {
            console.log("✅ webhook 状态: " + (resp ? resp.status : "null"));
        }

        if (notify === "true") {
            console.log("📢 发送通知");
            $notification.post(
                "🎬 捕获到视频地址",
                "已转发 webhook",
                "",
                notificationAttach
            );
        } else {
            console.log("🔕 已关闭通知");
        }

        finish();
    });

    setTimeout(function () {
        console.log("⏱ webhook 超时兜底触发");
        finish();
    }, 6000);

} else {

    console.log("⚠️ 未进入 webhook 分支");

    if (notify === "true") {
        console.log("📢 普通通知");
        $notification.post(
            "🎬 捕获到视频地址",
            "播放器: " + playerName,
            "",
            notificationAttach
        );
    }

    finish();
}
