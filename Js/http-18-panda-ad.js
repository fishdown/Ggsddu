/*
#!name = 熊猫视频去广告 porn
#!desc = 免费18+网页，Adfree
#!openUrl = https://www.vv99kk.com
#!icon = https://raw.githubusercontent.com/fishdown/Icon/refs/heads/master/app/panda.png
#!author = fishdown
#!tag = ad,18+
#!date = 2026-10-03

[Script]
response if ${url} ~= /^https:\/\/(?:xmad\.7wzx9\.com\/common45\.js|spiderscloudcn2\.51111666\.com\/getDataInit)(?:\?.*)?$/i then script("https://raw.githubusercontent.com/fishdown/Ggsddu/refs/heads/master/Js/http-18-panda-ad.js") with tag="panda网页广告", img_url="https://raw.githubusercontent.com/fishdown/Icon/master/app/panda.png", timeout=60, requires_body=true

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



// Shared Loon http-response script for common45.js and getDataInit.
// Both matching rules should use this file with requires-body=true.

var body = $response.body;

if (typeof body === "string" && body.length > 0) {
    var trimmedBody = body.trim();

    if (trimmedBody.charAt(0) === "{" || trimmedBody.charAt(0) === "[") {
        try {
            var response = JSON.parse(body);
            var groups = response && response.data && response.data.menu0ListMap;
            var allowedGroups = {
                "\u4f20\u5a92": true,
                "\u89c6\u9891": true,
                "\u7535\u5f71": true,
                "\u56fe\u7247": true,
                "\u5c0f\u8bf4": true
            };

            if (groups && typeof groups === "object") {
                if (Array.isArray(groups)) {
                    response.data.menu0ListMap = groups.filter(function (group) {
                        return group &&
                            allowedGroups[String(group.typeName || "").trim()] === true;
                    });
                } else {
                    var filteredGroups = {};
                    Object.keys(groups).forEach(function (key) {
                        var group = groups[key];
                        if (group &&
                            allowedGroups[String(group.typeName || "").trim()] === true) {
                            filteredGroups[key] = group;
                        }
                    });
                    response.data.menu0ListMap = filteredGroups;
                }
                body = JSON.stringify(response);
            }
        } catch (error) {
            console.log("Loon ad filter: JSON response could not be parsed; leaving it unchanged");
        }
    }

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

    while ((match = declaration.exec(body)) !== null) {
        var arrayStart = declaration.lastIndex - 1;
        var arrayEnd = findArrayEnd(body, arrayStart);
        if (arrayEnd !== -1) {
            ranges.push({ start: arrayStart, end: arrayEnd });
            declaration.lastIndex = arrayEnd;
        }
    }

    ranges.sort(function (a, b) {
        return b.start - a.start;
    });
    for (var i = 0; i < ranges.length; i++) {
        body = body.slice(0, ranges[i].start) + "[]" + body.slice(ranges[i].end);
    }

    body = body.replace(/(\bvar\s+couplet\s*=\s*)true(\s*;)/g, "$1false$2");
    body = body.replace(/(\bvar\s+couplet1\s*=\s*)true(\s*;)/g, "$1false$2");
}

$done({ body: body });
