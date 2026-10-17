/*
 * Loon 订阅转换脚本
 *
 * 参数：
 * twemoji、emoji、delemoji、front、behind、del、in、out、replace、gpt、ua、node
 *
 * 当 $resource 没有有效节点时，使用 node 参数作为订阅响应体；
 * 两者都没有有效节点时，使用 ua 通过 $resourceUrl 重试拉取。
 *
 * GPT 使用固定 GPT_USER_AGENT，
 * 不使用参数 ua。
 */

var resource = $resource;
var resourceUrl = $resourceUrl;
var ua = $argument.ua;
var nodeResource = $argument.node || "";

var MAX_RESOURCE_FETCH_ATTEMPTS = 3;
var RESOURCE_FETCH_TIMEOUT = 10000;

var emoji = $argument.emoji;
var twemoji = $argument.twemoji;
var delemoji = $argument.delemoji;
var front = $argument.front;
var behind = $argument.behind;
var delArg = $argument.del;
var inArg = $argument.in;
var outArg = $argument.out;
var replace = $argument.replace;
var gpt = $argument.gpt;
var api = $argument.api;


/* =========================================================
 * GPT 配置
 * ========================================================= */

var GPT_URL = "https://api.openai.com/v1/models";
var GPT_TIMEOUT = 10000;

var GPT_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/17.3.1 Mobile/15E148 Safari/604.1";


/* =========================================================
 * 基础函数
 * ========================================================= */

function log(message) {
  console.log("[Loon转换] " + message);
}

function errorLog(message) {
  console.log("[Loon转换][错误] " + message);
}

function gptLog(message) {
  console.log("[GPT测试] " + message);
}

function trim(value) {
  return String(
    value === undefined || value === null ? "" : value
  ).replace(/^\s+|\s+$/g, "");
}

function enabled(value) {
  return value === true ||
    String(value).toLowerCase() === "true";
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (e) {
    return String(value || "");
  }
}

function base64Decode(value) {
  try {
    var text = String(value || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .replace(/\s/g, "");

    while (text.length % 4 !== 0) {
      text += "=";
    }

    var binary = atob(text);
    var encoded = "";

    for (var i = 0; i < binary.length; i++) {
      encoded += "%" +
        ("00" + binary.charCodeAt(i).toString(16)).slice(-2);
    }

    try {
      return decodeURIComponent(encoded);
    } catch (e) {
      return binary;
    }
  } catch (e) {
    return null;
  }
}

function isProbablyBase64(value) {
  var text = String(value || "").replace(/\s/g, "");

  return text.length >= 8 &&
    text.length % 4 !== 1 &&
    /^[A-Za-z0-9+/_=-]+$/.test(text);
}

function quote(value) {
  value = String(
    value === undefined || value === null ? "" : value
  );

  return "\"" + value.replace(/"/g, "\\\"") + "\"";
}

function booleanText(value) {
  var text = String(value || "").toLowerCase();

  return text === "1" ||
    text === "true" ||
    text === "yes" ||
    text === "on"
    ? "true"
    : "false";
}

function addOption(options, key, value, forceQuote) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  value = String(value);

  if (
    forceQuote ||
    value.indexOf(",") !== -1 ||
    value.indexOf(" ") !== -1
  ) {
    options.push(key + "=" + quote(value));
  } else {
    options.push(key + "=" + value);
  }
}

function normalizeTransport(value) {
  value = String(value || "").toLowerCase();

  if (value === "ws") {
    return "ws";
  }

  if (value === "http" || value === "h2") {
    return "http";
  }

  return "tcp";
}

function splitKeywords(value) {
  var result = [];
  var text = trim(value);

  if (!text) {
    return result;
  }

  var list = text.split(",");

  for (var i = 0; i < list.length; i++) {
    var item = trim(list[i]);

    if (item) {
      result.push(item);
    }
  }

  return result;
}

/*
 * replace 格式：旧关键字#新关键字,旧关键字#新关键字
 * 例如：台湾#tw,香港#hk
 * # 后面的内容替换 # 前面的内容。
 */
function splitReplaceRules(value) {
  var result = [];
  var text = trim(value);

  if (!text) {
    return result;
  }

  var list = text.split(",");

  for (var i = 0; i < list.length; i++) {
    var item = trim(list[i]);
    var hashIndex = item.indexOf("#");

    if (hashIndex === -1) {
      continue;
    }

    var from = trim(item.substring(0, hashIndex));
    var to = trim(item.substring(hashIndex + 1));

    if (from) {
      result.push({
        from: from,
        to: to
      });
    }
  }

  return result;
}

var delKeywords = splitKeywords(delArg);
var inKeywords = splitKeywords(inArg);
var outKeywords = splitKeywords(outArg);
var replaceRules = splitReplaceRules(replace);

function isValidAPIKey(value) {
  var text = trim(value);

  if (!text) {
    return false;
  }

  /* OpenAI API Key 常见格式：sk-... */
  return /^sk-[A-Za-z0-9_-]{10,}$/.test(text);
}

var apiValid = isValidAPIKey(api);

log("ua: [" + String(ua || "") + "]");
log("node: [" + String(nodeResource || "") + "]");
log("emoji: [" + emoji + "]");
log("twemoji: [" + twemoji + "]");
log("delemoji: [" + delemoji + "]");
log("front: [" + String(front || "") + "]");
log("behind: [" + String(behind || "") + "]");
log("del: [" + delKeywords.join(",") + "]");
log("in: [" + inKeywords.join(",") + "]");
log("out: [" + outKeywords.join(",") + "]");
log("replace: [" + String(replace || "") + "]");
log("gpt: [" + gpt + "]");
log("api: [" + (apiValid ? "格式有效" : "为空或格式无效") + "]");


/* =========================================================
 * 整体订阅解码
 *
 * 这里是上一版缺失的函数。
 * ========================================================= */

function looksLikeNodeContent(text) {
  text = String(text || "");

  return /(?:vmess|ss|ssr|vless|trojan|anytls|hysteria2|hy2):\/\//i.test(text) ||
    /^\s*[^=\r\n]+?\s*=\s*(?:ShadowsocksR|Shadowsocks|VMess|VLESS|Trojan|AnyTLS|Hysteria2|Hysteria|http|https|socks5|WireGuard|Custom)\s*,/im.test(text);
}

function decodeWholeSubscription(text) {
  var current = trim(text);

  for (var i = 1; i <= 5; i++) {
    if (looksLikeNodeContent(current)) {
      return current;
    }

    var urlDecoded = safeDecode(current);

    if (
      urlDecoded !== current &&
      looksLikeNodeContent(urlDecoded)
    ) {
      log("第 " + i + " 层 URL 解码成功");
      current = urlDecoded;
      continue;
    }

    if (!isProbablyBase64(current)) {
      break;
    }

    var decoded = base64Decode(current);

    if (!decoded || decoded === current) {
      break;
    }

    log("第 " + i + " 层 Base64 解码成功");
    current = trim(decoded);
  }

  return current;
}

function hasNodeInfo(text) {
  return looksLikeNodeContent(
    decodeWholeSubscription(text)
  );
}


/* =========================================================
 * in / out
 * ========================================================= */

function containsKeyword(name, keywords) {
  var text = String(name || "").toLowerCase();

  for (var i = 0; i < keywords.length; i++) {
    if (
      text.indexOf(
        String(keywords[i]).toLowerCase()
      ) !== -1
    ) {
      return true;
    }
  }

  return false;
}

function shouldKeepNode(name) {
  name = String(name || "");

  if (
    inKeywords.length > 0 &&
    !containsKeyword(name, inKeywords)
  ) {
    log("in 未匹配，删除节点: [" + name + "]");
    return false;
  }

  if (
    outKeywords.length > 0 &&
    containsKeyword(name, outKeywords)
  ) {
    log("out 匹配，删除节点: [" + name + "]");
    return false;
  }

  return true;
}


/* =========================================================
 * Emoji
 * ========================================================= */

function hasCountryCode(text, codes) {
  text = String(text || "").toLowerCase();

  for (var i = 0; i < codes.length; i++) {
    if (new RegExp(
      "(^|[^a-z0-9])" +
      codes[i] +
      "([^a-z0-9]|$)",
      "i"
    ).test(text)) {
      return true;
    }
  }

  return false;
}

function removeEmoji(text) {
  return String(text || "")
    .replace(
      /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g,
      ""
    )
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(
      /[\uD83C-\uDBFF][\uDC00-\uDFFF]/g,
      ""
    )
    .replace(/[\uFE0E\uFE0F]/g, "")
    .replace(/\u200D/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+|[ \t]+$/g, "");
}

function getCountryEmoji(name) {
  var text = String(name || "").toLowerCase();

  var table = [
    [["台湾", "台灣", "taiwan", "台北", "taipei"], ["tw"], enabled(twemoji) ? "🇨🇳" : "🇹🇼"],
    [["中国", "中國", "大陆", "大陸", "china"], ["cn"], "🇨🇳"],
    [["香港", "hongkong", "hong kong"], ["hk"], "🇭🇰"],
    [["澳门", "澳門", "macau", "macao"], ["mo"], "🇲🇴"],
    [["日本", "东京", "東京", "japan", "tokyo"], ["jp"], "🇯🇵"],
    [["韩国", "韓國", "首尔", "首爾", "korea", "seoul"], ["kr"], "🇰🇷"],
    [["新加坡", "singapore"], ["sg"], "🇸🇬"],
    [["美国", "美國", "united states", "america", "usa"], ["us"], "🇺🇸"],
    [["加拿大", "canada"], ["ca"], "🇨🇦"],
    [["英国", "英國", "united kingdom", "london"], ["gb", "uk"], "🇬🇧"],
    [["德国", "德國", "germany"], ["de"], "🇩🇪"],
    [["法国", "法國", "france"], ["fr"], "🇫🇷"],
    [["澳大利亚", "澳洲", "australia"], ["au"], "🇦🇺"],
    [["俄罗斯", "俄羅斯", "russia"], ["ru"], "🇷🇺"],
    [["印度", "india"], ["in"], "🇮🇳"],
    [["土耳其", "turkey"], ["tr"], "🇹🇷"],
    [["荷兰", "荷蘭", "netherlands"], ["nl"], "🇳🇱"],
    [["瑞士", "switzerland"], ["ch"], "🇨🇭"],
    [["瑞典", "sweden"], ["se"], "🇸🇪"],
    [["挪威", "norway"], ["no"], "🇳🇴"],
    [["芬兰", "芬蘭", "finland"], ["fi"], "🇫🇮"],
    [["丹麦", "丹麥", "denmark"], ["dk"], "🇩🇰"],
    [["波兰", "波蘭", "poland"], ["pl"], "🇵🇱"],
    [["乌克兰", "烏克蘭", "ukraine"], ["ua"], "🇺🇦"],
    [["巴西", "brazil"], ["br"], "🇧🇷"],
    [["墨西哥", "mexico"], ["mx"], "🇲🇽"],
    [["南非", "south africa"], ["za"], "🇿🇦"],
    [["以色列", "israel"], ["il"], "🇮🇱"],
    [["阿联酋", "阿聯酋", "uae"], ["ae"], "🇦🇪"],
    [["越南", "vietnam"], ["vn"], "🇻🇳"],
    [["泰国", "泰國", "thailand"], ["th"], "🇹🇭"],
    [["马来西亚", "馬來西亞", "malaysia"], ["my"], "🇲🇾"],
    [["菲律宾", "菲律賓", "philippines"], ["ph"], "🇵🇭"],
    [["印度尼西亚", "印度尼西亞", "indonesia"], ["id"], "🇮🇩"],
    [["新西兰", "新西蘭", "new zealand"], ["nz"], "🇳🇿"],
    [["爱尔兰", "愛爾蘭", "ireland"], ["ie"], "🇮🇪"],
    [["罗马尼亚", "羅馬尼亞", "romania"], ["ro"], "🇷🇴"],
    [["保加利亚", "保加利亞", "bulgaria"], ["bg"], "🇧🇬"],
    [["格鲁吉亚", "格魯吉亞", "georgia"], ["ge"], "🇬🇪"],
    [["加蓬", "gabon"], ["ga"], "🇬🇦"]
  ];

  for (var i = 0; i < table.length; i++) {
    var matched = false;

    for (var j = 0; j < table[i][0].length; j++) {
      if (text.indexOf(table[i][0][j]) !== -1) {
        matched = true;
        break;
      }
    }

    if (!matched) {
      matched = hasCountryCode(text, table[i][1]);
    }

    if (matched) {
      return table[i][2];
    }
  }

  return "🌐";
}

function processName(name) {
  var result = trim(name);

  /*
   * 节点名称处理顺序：
   * twemoji -> emoji -> delemoji -> front -> behind -> del -> replace
   * in / out 仍然用于节点筛选，在转换节点前执行。
   */

  /* 1. twemoji：统一台湾旗帜显示。 */
  if (enabled(twemoji)) {
    result = result.replace(/🇹🇼/g, "🇨🇳");
  }

  /* 2. emoji：根据节点名称添加国家或地区 Emoji。 */
  if (enabled(emoji)) {
    result = getCountryEmoji(result) + " " + result;
  }

  /* 3. delemoji：删除当前名称中的 Emoji。 */
  if (enabled(delemoji)) {
    result = removeEmoji(result);
  }

  /* 4. front：添加名称前缀。 */
  if (
    front !== undefined &&
    front !== null &&
    String(front) !== ""
  ) {
    result = String(front) + result;
  }

  /* 5. behind：添加名称后缀。 */
  if (
    behind !== undefined &&
    behind !== null &&
    String(behind) !== ""
  ) {
    result = result + String(behind);
  }

  /* 6. del：删除节点名称关键字。 */
  for (var i = 0; i < delKeywords.length; i++) {
    if (delKeywords[i]) {
      result = result.split(delKeywords[i]).join("");
    }
  }

  /*
   * 7. replace：关键字替换。
   * 格式：旧关键字#新关键字,旧关键字#新关键字
   * 使用字符串替换，避免特殊字符被当成正则表达式。
   */
  for (var r = 0; r < replaceRules.length; r++) {
    if (replaceRules[r].from) {
      result = result.split(replaceRules[r].from).join(replaceRules[r].to);
    }
  }

  return result;
}


/* =========================================================
 * URI 解析
 * ========================================================= */

function parseURLNode(node) {
  var result = {
    protocol: "",
    name: "",
    user: "",
    host: "",
    port: "",
    params: {}
  };

  var schemeIndex = node.indexOf("://");

  if (schemeIndex === -1) {
    return result;
  }

  result.protocol = node.substring(0, schemeIndex);

  var rest = node.substring(schemeIndex + 3);

  var hashIndex = rest.indexOf("#");

  if (hashIndex !== -1) {
    result.name = safeDecode(
      rest.substring(hashIndex + 1)
    );

    rest = rest.substring(0, hashIndex);
  }

  var questionIndex = rest.indexOf("?");

  if (questionIndex !== -1) {
    var query = rest.substring(questionIndex + 1);
    var items = query.split("&");

    for (var i = 0; i < items.length; i++) {
      var item = items[i];

      if (!item) {
        continue;
      }

      var equalIndex = item.indexOf("=");

      if (equalIndex === -1) {
        result.params[safeDecode(item)] = "";
      } else {
        result.params[
          safeDecode(item.substring(0, equalIndex))
        ] = safeDecode(item.substring(equalIndex + 1));
      }
    }

    rest = rest.substring(0, questionIndex);
  }

  var atIndex = rest.lastIndexOf("@");

  if (atIndex !== -1) {
    result.user = safeDecode(
      rest.substring(0, atIndex)
    );

    rest = rest.substring(atIndex + 1);
  }

  if (rest.charAt(0) === "[") {
    var closeIndex = rest.indexOf("]");

    if (closeIndex !== -1) {
      result.host = rest.substring(1, closeIndex);

      if (rest.charAt(closeIndex + 1) === ":") {
        result.port = rest.substring(closeIndex + 2);
      }

      return result;
    }
  }

  var colonIndex = rest.lastIndexOf(":");

  if (
    colonIndex !== -1 &&
    rest.indexOf(":") === colonIndex
  ) {
    result.host = rest.substring(0, colonIndex);
    result.port = rest.substring(colonIndex + 1);
  } else {
    result.host = rest;
  }

  return result;
}


/* =========================================================
 * 已有 Loon 节点
 * ========================================================= */

function isExistingLoonNode(line) {
  return /^\s*[^=\r\n]+?\s*=\s*(?:ShadowsocksR|Shadowsocks|VMess|VLESS|Trojan|AnyTLS|Hysteria2|Hysteria|http|https|socks5|WireGuard|Custom)\s*,/i.test(line);
}

function processExistingLoonNode(line) {
  var index = line.indexOf("=");

  if (index === -1) {
    return "";
  }

  var name = trim(line.substring(0, index));

  if (!shouldKeepNode(name)) {
    return "";
  }

  return processName(name) +
    "=" +
    line.substring(index + 1);
}


/* =========================================================
 * 协议转换
 * ========================================================= */

function convertVMess(node) {
  var decoded = base64Decode(
    trim(node.substring("vmess://".length))
  );

  if (!decoded) {
    return "";
  }

  var config;

  try {
    config = JSON.parse(decoded);
  } catch (e) {
    return "";
  }

  var name = config.ps || config.add;

  if (!shouldKeepNode(name)) {
    return "";
  }

  if (!config.add || !config.port || !config.id) {
    return "";
  }

  var values = [
    processName(name) + " = VMess",
    config.add,
    config.port,
    config.scy || "auto",
    quote(config.id)
  ];

  var options = [];

  addOption(
    options,
    "transport",
    normalizeTransport(config.net || "tcp")
  );

  addOption(
    options,
    "alterId",
    config.aid === undefined ? "0" : config.aid
  );

  if (config.path) {
    addOption(options, "path", config.path);
  }

  if (config.host) {
    addOption(options, "host", config.host);
  }

  addOption(
    options,
    "over-tls",
    String(config.tls || "").toLowerCase() === "tls"
      ? "true"
      : "false"
  );

  if (config.sni) {
    addOption(options, "sni", config.sni);
  }

  if (config.fp) {
    addOption(options, "tls-profile", config.fp);
  }

  if (config.insecure !== undefined) {
    addOption(
      options,
      "skip-cert-verify",
      booleanText(config.insecure)
    );
  }

  if (config.alpn) {
    addOption(options, "alpn", config.alpn, true);
  }

  options.push("udp=true");
  options.push("block-quic=true");

  return values.concat(options).join(",");
}

function convertShadowsocks(node) {
  var body = node.substring("ss://".length);
  var name = "";

  var hashIndex = body.indexOf("#");

  if (hashIndex !== -1) {
    name = safeDecode(body.substring(hashIndex + 1));
    body = body.substring(0, hashIndex);
  }

  name = name || "Shadowsocks";

  if (!shouldKeepNode(name)) {
    return "";
  }

  var pluginIndex = body.indexOf("/?");
  var queryIndex = body.indexOf("?");
  var cutIndex = pluginIndex !== -1
    ? pluginIndex
    : queryIndex;

  if (cutIndex !== -1) {
    body = body.substring(0, cutIndex);
  }

  body = trim(body);

  var method = "";
  var password = "";
  var host = "";
  var port = "";

  var atIndex = body.indexOf("@");

  if (atIndex !== -1) {
    var userPart = body.substring(0, atIndex);
    var serverPart = body.substring(atIndex + 1);

    var userInfo = base64Decode(
      safeDecode(userPart)
    ) || safeDecode(userPart);

    var authIndex = userInfo.indexOf(":");

    if (authIndex === -1) {
      return "";
    }

    method = userInfo.substring(0, authIndex);
    password = userInfo.substring(authIndex + 1);

    var serverIndex = serverPart.lastIndexOf(":");

    if (serverIndex === -1) {
      return "";
    }

    host = serverPart.substring(0, serverIndex);
    port = serverPart.substring(serverIndex + 1);
  } else {
    var oldDecoded = base64Decode(body);

    if (!oldDecoded) {
      return "";
    }

    var oldAt = oldDecoded.lastIndexOf("@");

    if (oldAt === -1) {
      return "";
    }

    var auth = oldDecoded.substring(0, oldAt);
    var server = oldDecoded.substring(oldAt + 1);

    var authIndex2 = auth.indexOf(":");
    var serverIndex2 = server.lastIndexOf(":");

    if (
      authIndex2 === -1 ||
      serverIndex2 === -1
    ) {
      return "";
    }

    method = auth.substring(0, authIndex2);
    password = auth.substring(authIndex2 + 1);
    host = server.substring(0, serverIndex2);
    port = server.substring(serverIndex2 + 1);
  }

  if (!method || !host || !port) {
    return "";
  }

  return [
    processName(name) + " = Shadowsocks",
    host,
    port,
    method,
    quote(password),
    "fast-open=false",
    "udp=true",
    "block-quic=true"
  ].join(",");
}

function convertSSR(node) {
  var decoded = base64Decode(
    trim(node.substring("ssr://".length))
  );

  if (!decoded) {
    return "";
  }

  var slashIndex = decoded.indexOf("/");
  var main = slashIndex === -1
    ? decoded
    : decoded.substring(0, slashIndex);

  var query = slashIndex === -1
    ? ""
    : decoded.substring(slashIndex + 1);

  var parts = main.split(":");

  if (parts.length < 6) {
    return "";
  }

  var host = parts[0];
  var port = parts[1];
  var protocol = parts[2];
  var method = parts[3];
  var obfs = parts[4];
  var password = base64Decode(parts[5]) || "";

  var params = {};
  var queryItems = query.split("&");

  for (var i = 0; i < queryItems.length; i++) {
    var equalIndex = queryItems[i].indexOf("=");

    if (equalIndex !== -1) {
      params[
        queryItems[i].substring(0, equalIndex)
      ] = queryItems[i].substring(equalIndex + 1);
    }
  }

  var name = params.remarks
    ? base64Decode(params.remarks) ||
    safeDecode(params.remarks)
    : host;

  if (!shouldKeepNode(name)) {
    return "";
  }

  var options = [
    "protocol=" + protocol,
    "obfs=" + obfs
  ];

  if (params.protoparam !== undefined) {
    addOption(
      options,
      "protocol-param",
      base64Decode(params.protoparam) ||
      safeDecode(params.protoparam),
      true
    );
  }

  if (params.obfsparam !== undefined) {
    addOption(
      options,
      "obfs-param",
      base64Decode(params.obfsparam) ||
      safeDecode(params.obfsparam),
      true
    );
  }

  options.push("udp=true");
  options.push("block-quic=true");

  return [
    processName(name) + " = ShadowsocksR",
    host,
    port,
    method,
    quote(password)
  ].concat(options).join(",");
}

function convertVLESS(node) {
  var parsed = parseURLNode(node);
  var p = parsed.params;
  var name = parsed.name || parsed.host;

  if (!shouldKeepNode(name)) {
    return "";
  }

  if (!parsed.host || !parsed.port || !parsed.user) {
    return "";
  }

  var values = [
    processName(name) + " = VLESS",
    parsed.host,
    parsed.port,
    quote(parsed.user)
  ];

  var options = [];

  addOption(
    options,
    "transport",
    normalizeTransport(
      p.type || p.transport || p.network || "tcp"
    )
  );

  if (p.flow) {
    addOption(options, "flow", p.flow);
  }

  if (p.path) {
    addOption(options, "path", p.path);
  }

  if (p.host) {
    addOption(options, "host", p.host);
  }

  if (
    p.security === "tls" ||
    p.security === "reality"
  ) {
    addOption(options, "over-tls", "true");
  }

  if (p.sni) {
    addOption(options, "sni", p.sni);
  }

  if (p.fp) {
    addOption(options, "tls-profile", p.fp);
  }

  if (p.insecure !== undefined) {
    addOption(
      options,
      "skip-cert-verify",
      booleanText(p.insecure)
    );
  }

  if (p.pbk) {
    addOption(options, "public-key", p.pbk, true);
  }

  if (p.sid) {
    addOption(options, "short-id", p.sid);
  }

  if (p.alpn) {
    addOption(options, "alpn", p.alpn, true);
  }

  options.push("udp=true");
  options.push("block-quic=true");

  return values.concat(options).join(",");
}

function convertTrojan(node) {
  var parsed = parseURLNode(node);
  var p = parsed.params;
  var name = parsed.name || parsed.host;

  if (!shouldKeepNode(name)) {
    return "";
  }

  if (!parsed.host || !parsed.port || !parsed.user) {
    return "";
  }

  var values = [
    processName(name) + " = Trojan",
    parsed.host,
    parsed.port,
    quote(parsed.user)
  ];

  var options = [];

  addOption(
    options,
    "transport",
    normalizeTransport(
      p.type || p.transport || p.network || "tcp"
    )
  );

  if (p.path) {
    addOption(options, "path", p.path);
  }

  if (p.host) {
    addOption(options, "host", p.host);
  }

  options.push("over-tls=true");
  addOption(options, "sni", p.sni || parsed.host);

  if (p.fp) {
    addOption(options, "tls-profile", p.fp);
  }

  if (p.insecure !== undefined) {
    addOption(
      options,
      "skip-cert-verify",
      booleanText(p.insecure)
    );
  }

  if (p.alpn) {
    addOption(options, "alpn", p.alpn, true);
  }

  options.push("udp=true");
  options.push("block-quic=true");

  return values.concat(options).join(",");
}

function convertAnyTLS(node) {
  var parsed = parseURLNode(node);
  var p = parsed.params;
  var name = parsed.name || parsed.host;

  if (!shouldKeepNode(name)) {
    return "";
  }

  if (!parsed.host || !parsed.port || !parsed.user) {
    return "";
  }

  var values = [
    processName(name) + " = AnyTLS",
    parsed.host,
    parsed.port,
    quote(parsed.user)
  ];

  var options = [];

  addOption(options, "sni", p.sni || parsed.host);

  if (p.insecure !== undefined) {
    addOption(
      options,
      "skip-cert-verify",
      booleanText(p.insecure)
    );
  }

  if (p.fp) {
    addOption(options, "tls-profile", p.fp);
  }

  if (p.alpn) {
    addOption(options, "alpn", p.alpn, true);
  }

  if (p.pbk) {
    addOption(options, "public-key", p.pbk, true);
  }

  if (p.sid) {
    addOption(options, "short-id", p.sid);
  }

  options.push("udp=true");
  options.push("block-quic=true");

  return values.concat(options).join(",");
}

function convertHysteria2(node) {
  var parsed = parseURLNode(node);
  var p = parsed.params;
  var name = parsed.name || parsed.host;

  if (!shouldKeepNode(name)) {
    return "";
  }

  if (!parsed.host || !parsed.port || !parsed.user) {
    return "";
  }

  var values = [
    processName(name) + " = Hysteria2",
    parsed.host,
    parsed.port,
    quote(parsed.user)
  ];

  var options = [];

  addOption(options, "sni", p.sni || parsed.host);

  if (p.insecure !== undefined) {
    addOption(
      options,
      "skip-cert-verify",
      booleanText(p.insecure)
    );
  }

  if (p.alpn) {
    addOption(options, "alpn", p.alpn, true);
  }

  if (p.obfs) {
    addOption(options, "obfs", p.obfs);
  }

  if (p["obfs-password"]) {
    addOption(
      options,
      "salamander-password",
      p["obfs-password"],
      true
    );
  }

  options.push("udp=true");
  options.push("block-quic=true");

  return values.concat(options).join(",");
}

function convertNode(line) {
  line = trim(line);

  if (!line) {
    return "";
  }

  if (isExistingLoonNode(line)) {
    return processExistingLoonNode(line);
  }

  if (/^vmess:\/\//i.test(line)) {
    return convertVMess(line);
  }

  if (/^ss:\/\//i.test(line)) {
    return convertShadowsocks(line);
  }

  if (/^ssr:\/\//i.test(line)) {
    return convertSSR(line);
  }

  if (/^vless:\/\//i.test(line)) {
    return convertVLESS(line);
  }

  if (/^trojan:\/\//i.test(line)) {
    return convertTrojan(line);
  }

  if (/^anytls:\/\//i.test(line)) {
    return convertAnyTLS(line);
  }

  if (
    /^hysteria2:\/\//i.test(line) ||
    /^hy2:\/\//i.test(line)
  ) {
    return convertHysteria2(line);
  }

  return "";
}


/* =========================================================
 * GPT 测试
 * ========================================================= */

function splitLoonLine(line) {
  var index = line.indexOf("=");

  if (index === -1) {
    return null;
  }

  return {
    name: trim(line.substring(0, index)),
    description: trim(line.substring(index + 1))
  };
}

function extractGPTMessage(body) {
  var text = String(body || "");

  try {
    var json = JSON.parse(text);

    if (json && json.error) {
      return String(
        json.error.code ||
        json.error.error_type ||
        ""
      );
    }

    if (json && json.cf_details) {
      return String(json.cf_details);
    }
  } catch (e) {
    // 不是 JSON，保留原文本。
  }

  return text;
}

function isGPTSupportedResponse(status, message) {
  return status === 403 &&
    !/unsupported_country/i.test(
      String(message || "")
    );
}

function addGPTMark(line) {
  var parts = splitLoonLine(line);

  if (!parts) {
    return line;
  }

  var name = parts.name;

  if (name.indexOf("[GPT]") === -1) {
    name += "[GPT]";
  }

  return name + "=" + parts.description;
}

function maskAPIKey(value) {
  value = String(value || "");

  if (value.length <= 8) {
    return "***";
  }

  return value.substring(0, 4) +
    "****" +
    value.substring(value.length - 4);
}

function extractAPIError(body) {
  var text = String(body || "");

  try {
    var json = JSON.parse(text);

    if (json && json.error) {
      if (typeof json.error === "string") {
        return json.error;
      }

      return json.error.message ||
        json.error.code ||
        json.error.type ||
        "";
    }
  } catch (e) {
    // 非 JSON，返回原文。
  }

  return text;
}

function gptTestOne(line, callback) {
  var parts = splitLoonLine(line);

  if (!parts) {
    callback(line);
    return;
  }

  var processedName = parts.name;
  var nodeDescription = parts.description;

  if (!nodeDescription || !api) {
    callback(line);
    return;
  }

  var completed = false;

  function finishOnce(resultLine) {
    if (completed) {
      return;
    }

    completed = true;
    callback(resultLine);
  }

  gptLog("开始 API 测试: " + processedName);

  var request = {
    url: GPT_URL,
    node: nodeDescription,
    timeout: 8000,
    "auto-redirect": false,
    headers: {
      "Authorization": "Bearer " + String(api),
      "User-Agent": GPT_USER_AGENT,
      "Accept": "application/json"
    }
  };

  /* 单节点超时保护，防止没有回调时卡死。 */
  var guardTimer = setTimeout(function () {
    gptLog("API 超时，保留原节点: " + processedName);
    finishOnce(line);
  }, 11000);

  try {
    $httpClient.get(
      request,
      function (error, response, data) {
        if (completed) {
          return;
        }

        clearTimeout(guardTimer);

        if (error) {
          gptLog("请求失败，保留原节点: " + processedName);
          finishOnce(line);
          return;
        }

        var status = response && response.status
          ? parseInt(response.status)
          : 0;

        gptLog(
          "API 状态码: " +
          status +
          " | 节点: " +
          processedName
        );

        if (status === 200) {
          gptLog("支持 GPT，添加 [GPT]: " + processedName);
          finishOnce(addGPTMark(line));
        } else {
          gptLog("不支持 GPT，保留原节点: " + processedName);
          finishOnce(line);
        }
      }
    );
  } catch (e) {
    clearTimeout(guardTimer);
    gptLog("API 调用异常，保留原节点: " + processedName);
    finishOnce(line);
  }
}

function gptTestNodes(nodes, callback) {
  var result = new Array(nodes.length);
  var completedCount = 0;
  var finished = false;

  if (nodes.length === 0) {
    callback([]);
    return;
  }

  function finishAll() {
    if (finished) {
      return;
    }

    finished = true;

    for (var i = 0; i < nodes.length; i++) {
      if (result[i] === undefined) {
        result[i] = nodes[i];
      }
    }

    gptLog(
      "GPT 测试全部完成: " +
      completedCount +
      "/" +
      nodes.length
    );

    callback(result);
  }

  /* 并发测试，单个节点不会阻塞其他节点。 */
  for (var i = 0; i < nodes.length; i++) {
    (function (index) {
      try {
        gptTestOne(
          nodes[index],
          function (resultLine) {
            if (result[index] !== undefined) {
              return;
            }

            result[index] = resultLine;
            completedCount++;

            gptLog(
              "完成 " +
              completedCount +
              "/" +
              nodes.length
            );

            if (completedCount >= nodes.length) {
              finishAll();
            }
          }
        );
      } catch (e) {
        result[index] = nodes[index];
        completedCount++;

        if (completedCount >= nodes.length) {
          finishAll();
        }
      }
    })(i);
  }

  /* 总保护时间，确保最终一定调用 $done。 */
  setTimeout(function () {
    if (!finished) {
      gptLog(
        "达到 GPT 总保护时间，强制结束: " +
        completedCount +
        "/" +
        nodes.length
      );

      finishAll();
    }
  }, 15000);
}


/* =========================================================
 * 最终输出
 * ========================================================= */

function finish(nodes) {
  var output = nodes.join("\n");

  log("最终节点数量: " + nodes.length);
  log("最终输出长度: " + output.length);

  console.log("========== FINAL OUTPUT BEGIN ==========");
  console.log(output);
  console.log("========== FINAL OUTPUT END ==========");

  $done(output);
}


/* =========================================================
 * 处理资源
 * ========================================================= */

function processResource(input) {
  input = String(input || "");

  var lines = input
    .replace(/\r/g, "")
    .split("\n");

  var nodes = [];

  for (var i = 0; i < lines.length; i++) {
    var line = trim(lines[i]);

    if (!line) {
      continue;
    }

    var converted = "";

    try {
      converted = convertNode(line);
    } catch (e) {
      errorLog(
        "第 " +
        (i + 1) +
        " 行转换异常: " +
        e
      );
    }

    if (converted) {
      nodes.push(converted);
    }
  }

  log("普通转换完成，节点数量: " + nodes.length);

  /*
   * gpt 未开启：跳过 GPT。
   */
  if (!enabled(gpt)) {
    log("gpt 未开启，跳过 GPT 检测");
    finish(nodes);
    return;
  }

  /*
   * api 为空或格式错误：即使 gpt=true 也跳过 GPT。
   */
  if (!apiValid) {
    log("api 为空或格式无效，跳过 GPT 检测");
    finish(nodes);
    return;
  }

  if (nodes.length === 0) {
    finish(nodes);
    return;
  }

  gptLog(
    "gpt=true，开始测试已处理节点，共 " +
    nodes.length +
    " 个"
  );

  gptTestNodes(
    nodes,
    function (result) {
      gptLog("GPT 检测完成");
      finish(result);
    }
  );
}


/* =========================================================
 * 主程序
 * ========================================================= */

function retryWithUA(callback) {
  var attempt = 0;

  function requestNext() {
    attempt++;
    log(
      "UA 拉取订阅，第 " +
      attempt +
      "/" +
      MAX_RESOURCE_FETCH_ATTEMPTS +
      " 次"
    );

    var completed = false;
    var guardTimer;

    function fail(reason) {
      if (completed) {
        return;
      }

      completed = true;
      clearTimeout(guardTimer);
      errorLog(
        "UA 拉取失败（" +
        attempt +
        "/" +
        MAX_RESOURCE_FETCH_ATTEMPTS +
        "）: " +
        reason
      );

      if (attempt >= MAX_RESOURCE_FETCH_ATTEMPTS) {
        callback("");
        return;
      }

      requestNext();
    }

    guardTimer = setTimeout(function () {
      fail("请求超时");
    }, RESOURCE_FETCH_TIMEOUT + 1000);

    try {
      $httpClient.get(
        {
          url: resourceUrl,
          timeout: RESOURCE_FETCH_TIMEOUT,
          headers: {
            "User-Agent": String(ua),
            "Accept": "*/*"
          }
        },
        function (error, response, data) {
          if (completed) {
            return;
          }

          if (error) {
            fail(error);
            return;
          }

          var status = response && (
            response.statusCode !== undefined
              ? response.statusCode
              : response.status
          );

          if (status !== undefined && (status < 200 || status >= 300)) {
            fail("HTTP 状态码 " + status);
            return;
          }

          var body = data === undefined || data === null
            ? ""
            : String(data);
          var decoded = decodeWholeSubscription(body);

          if (!hasNodeInfo(decoded)) {
            fail("响应体为空或未发现节点");
            return;
          }

          completed = true;
          clearTimeout(guardTimer);
          log("UA 拉取成功");
          callback(decoded);
        }
      );
    } catch (e) {
      fail("请求调用异常: " + e);
    }
  }

  if (!trim(resourceUrl)) {
    errorLog("$resourceUrl 为空，无法发起 UA 重试");
    callback("");
    return;
  }

  if (!trim(ua)) {
    errorLog("ua 参数为空，无法发起 UA 重试");
    callback("");
    return;
  }

  requestNext();
}

function main() {
  log("========== 脚本开始 ==========");

  var input = trim(resource);
  var decoded = decodeWholeSubscription(input);

  if (!hasNodeInfo(decoded)) {
    var fallback = trim(nodeResource);

    if (fallback) {
      var decodedFallback = decodeWholeSubscription(fallback);

      if (hasNodeInfo(decodedFallback)) {
        log("$resource 未发现节点，使用 node 参数作为资源响应体");
        resource = nodeResource;
        decoded = decodedFallback;
      }
    }
  }

  if (!hasNodeInfo(decoded)) {
    log("$resource 和 node 均未发现节点，开始使用 ua 重试拉取");
    retryWithUA(function (retryData) {
      if (retryData) {
        processResource(retryData);
      } else {
        errorLog("UA 重试达到失败上限，结束脚本");
        $done("");
      }
    });

    return;
  }

  processResource(decoded);
}

main();