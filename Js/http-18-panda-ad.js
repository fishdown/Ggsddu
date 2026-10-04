/*
#!name = 熊猫视频去广告 porn
#!desc = 免费18+网页，Adfree
#!openUrl = https://www.vv99kk.com
#!icon = https://raw.githubusercontent.com/fishdown/Icon/refs/heads/master/app/panda.png
#!author = fishdown
#!tag = ad,18+
#!date = 2026-10-04

[Script]
response if ${url} ~= /^https:\/\/(?:xmad\.7wzx9\.com\/common45\.js|spiderscloudcn2\.51111666\.com\/(?:getDataInit|forward))(?:\?.*)?$/i then script("http-18-panda-ad.js") with tag="panda网页广告", img_url="https://raw.githubusercontent.com/fishdown/Icon/master/app/panda.png", timeout=60, requires_body=true

[MitM]
hostname = xmad.7wzx9.com,spiderscloudcn2.51111666.com

*/
/*
[rewrite_local]
^https:\/\/(?:xmad\.7wzx9\.com\/common45\.js|spiderscloudcn2\.51111666\.com\/getDataInit)(?:\?.*)?$ url script-response-body https://raw.githubusercontent.com/fishdown/Ggsddu/refs/heads/master/Js/http-18-panda-ad.js
[mitm]
hostname = xmad.7wzx9.com,spiderscloudcn2.51111666.com
*
*
*/



var body = $response.body;
var url = ($request && $request.url) || "";
var isCommon45 = /^https:\/\/xmad\.7wzx9\.com\/common45\.js(?:\?.*)?$/i.test(url);
var isGetDataInit = /^https:\/\/spiderscloudcn2\.51111666\.com\/getDataInit(?:\?.*)?$/i.test(url);
var isForward = /^https:\/\/spiderscloudcn2\.51111666\.com\/forward(?:\?.*)?$/i.test(url);

function findArrayEnd(source, start) {
    var depth = 0;
    var quote = "";
    var lineComment = false;
    var blockComment = false;

    for (var i = start; i < source.length; i++) {
        var ch = source.charAt(i);
        var next = source.charAt(i + 1);

        if (lineComment) {
            if (ch === "\n" || ch === "\r") lineComment = false;
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (quote) {
            if (ch === "\\") {
                i++;
            } else if (ch === quote) {
                quote = "";
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            lineComment = true;
            i++;
            continue;
        }
        if (ch === "/" && next === "*") {
            blockComment = true;
            i++;
            continue;
        }
        if (ch === "'" || ch === '"' || ch === "`") {
            quote = ch;
            continue;
        }
        if (ch === "[") {
            depth++;
        } else if (ch === "]") {
            depth--;
            if (depth === 0) return i + 1;
        }
    }
    return -1;
}

function removeCommon45Ads(source) {
    var adArrays = [
        "moreUrl",
        "coupletData",
        "coupletData1",
        "topData",
        "btmData",
        "midData",
        "centerData",
        "topGGData",
        "btmGGData",
        "btmGGDataX",
        "rollingad",
        "danData",
        "PopGG"
    ];
    var ranges = [];
    var declaration = new RegExp(
        "\\b(?:var|let|const)\\s+(" + adArrays.join("|") + ")\\s*=\\s*\\[",
        "g"
    );
    var match;

    while ((match = declaration.exec(source)) !== null) {
        var arrayStart = declaration.lastIndex - 1;
        var arrayEnd = findArrayEnd(source, arrayStart);
        if (arrayEnd !== -1) {
            ranges.push({ start: arrayStart, end: arrayEnd });
            declaration.lastIndex = arrayEnd;
        }
    }

    ranges.sort(function (a, b) {
        return b.start - a.start;
    });
    for (var i = 0; i < ranges.length; i++) {
        source = source.slice(0, ranges[i].start) + "[]" + source.slice(ranges[i].end);
    }

    source = source.replace(
        /(\b(?:var|let|const)\s+couplet\s*=\s*)true(\s*;)/g,
        "$1false$2"
    );
    source = source.replace(
        /(\b(?:var|let|const)\s+couplet1\s*=\s*)true(\s*;)/g,
        "$1false$2"
    );
    return source;
}

function filterGetDataInit(source) {
    var trimmedBody = source.trim();
    if (trimmedBody.charAt(0) !== "{" && trimmedBody.charAt(0) !== "[") {
        return source;
    }

    try {
        var response = JSON.parse(source);
        var groups = response && response.data && response.data.menu0ListMap;
        var data = response && response.data;

        if (data &&
            Object.prototype.hasOwnProperty.call(data, "macVodLinkMap")) {
            if (typeof $persistentStore !== "undefined" &&
                $persistentStore &&
                typeof $persistentStore.write === "function") {
                var cacheWritten = $persistentStore.write(
                    JSON.stringify(data.macVodLinkMap),
                    "panda_macVodLinkMap"
                );
                if (!cacheWritten) {
                    console.log("Loon ad filter: failed to cache macVodLinkMap");
                }
            } else {
                console.log("Loon ad filter: $persistentStore.write is unavailable; macVodLinkMap was not cached");
            }
        }

        function hasAllowedSort(item) {
            if (!item || (typeof item.sort !== "number" && typeof item.sort !== "string")) {
                return false;
            }
            return /^[1-5]$/.test(String(item.sort));
        }

        if (Array.isArray(groups)) {
            response.data.menu0ListMap = groups.filter(hasAllowedSort);
        } else if (groups && typeof groups === "object") {
            var filteredGroups = {};
            Object.keys(groups).forEach(function (key) {
                if (hasAllowedSort(groups[key])) {
                    filteredGroups[key] = groups[key];
                }
            });
            response.data.menu0ListMap = filteredGroups;
        }
        return JSON.stringify(response);
    } catch (error) {
        console.log("Loon ad filter: getDataInit JSON response could not be parsed; leaving it unchanged");
    }
    return source;
}

function notifySenPlayer(source) {
    try {
        var response = JSON.parse(source);
        var result = response && response.data && response.data.result;
        if (!result || result.vod_server_id == null || !result.vod_url) {
            console.log("Loon ad filter: forward response is missing result, vod_server_id, or vod_url");
            return source;
        }

        if (typeof $persistentStore === "undefined" ||
            !$persistentStore ||
            typeof $persistentStore.read !== "function") {
            console.log("Loon ad filter: $persistentStore.read is unavailable");
            $notification.post("SenPlayer 跳转失败", "", "无法读取 macVodLinkMap 缓存");
            return source;
        }

        var cachedMap = $persistentStore.read("panda_macVodLinkMap");
        if (!cachedMap) {
            console.log("Loon ad filter: panda_macVodLinkMap cache is empty");
            $notification.post("SenPlayer 跳转失败", "", "macVodLinkMap 缓存为空");
            return source;
        }

        var linkMap = JSON.parse(cachedMap);
        var serverLinks = linkMap[String(result.vod_server_id)];
        if (!serverLinks || typeof serverLinks !== "object") {
            console.log("Loon ad filter: no cached links for vod_server_id " + result.vod_server_id);
            $notification.post("SenPlayer 跳转失败", "", "找不到对应的视频服务器地址");
            return source;
        }

        var linkKeys = ["LINK_1", "LINK_2"];
        var availableLinks = linkKeys.filter(function (key) {
            return typeof serverLinks[key] === "string" && serverLinks[key].length > 0;
        });
        if (availableLinks.length === 0) {
            console.log("Loon ad filter: no playable LINK value for vod_server_id " + result.vod_server_id);
            $notification.post("SenPlayer 跳转失败", "", "没有可用的视频播放地址");
            return source;
        }

        var selectedKey = availableLinks[Math.floor(Math.random() * availableLinks.length)];
        var playUrl = serverLinks[selectedKey] + result.vod_url;
        var senPlayerUrl = "SenPlayer://x-callback-url/play?url=" + encodeURIComponent(playUrl);
        $notification.post(
            "熊猫视频播放地址",
            result.vod_name || "点击通知打开 SenPlayer",
            "已随机选择 " + selectedKey,
            {
                openUrl: senPlayerUrl,
                clipboard: playUrl
            }
        );
    } catch (error) {
        console.log("Loon ad filter: failed to process forward response: " + error);
        $notification.post("SenPlayer 跳转失败", "", "解析播放地址时发生错误");
    }
    return source;
}

if (typeof body === "string" && body.length > 0) {
    if (isCommon45) {
        body = removeCommon45Ads(body);
    } else if (isGetDataInit) {
        body = filterGetDataInit(body);
    } else if (isForward) {
        body = notifySenPlayer(body);
    }
}

$done({ body: body });
