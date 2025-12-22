/**
 * Loon http-request
 * 功能：
 * 1. 仅当 UA 为浏览器时才执行
 * 2. 访问 GitHub 链接时提取 owner/repo
 * 3. 弹出通知，点击跳转仓库
 * 4. 不影响原始请求（避免 404）


# > GitHub仓库提取

hostname=github.com,raw.githubusercontent.com,api.github.com

http-request ^https?:\/\/(github|raw\.githubusercontent|api\.github)\.com script-path=https://raw.githubusercontent.com/fishdown/Ggsddu/master/Js/url-github.js, requires-body=true, timeout=60 ,img-url=https://raw.githubusercontent.com/fishdown/Icon/master/app/github.png, enable={open},tag=GitHub仓库




 */

let req = $request;
let url = req.url;

// ================= 浏览器 UA 判断 =================
let ua = (req.headers && (req.headers["User-Agent"] || req.headers["user-agent"])) || "";

let isBrowserUA = /Safari|Chrome|Firefox|Edg|OPR|Mobile|CriOS|FxiOS/i.test(ua);

// 非浏览器 UA：直接放行
if (!isBrowserUA) {
  $done(req);
  return;
}

// ================= URL 解码 =================
try {
  url = decodeURIComponent(url);
} catch (e) {}

// ================= 仓库提取 =================
let repoMatch = null;

// github.com/owner/repo
if (url.includes("github.com/")) {
  repoMatch = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
}

// raw.githubusercontent.com/owner/repo/branch/...
if (!repoMatch && url.includes("raw.githubusercontent.com")) {
  repoMatch = url.match(/raw\.githubusercontent\.com\/([^\/]+\/[^\/]+)/);
}

// api.github.com/repos/owner/repo/...
if (!repoMatch && url.includes("api.github.com/repos")) {
  repoMatch = url.match(/api\.github\.com\/repos\/([^\/]+\/[^\/]+)/);
}

// ================= 通知 =================
if (repoMatch) {
  let repo = repoMatch[1];
  let repoUrl = `https://github.com/${repo}`;

  let attach = {
    openUrl: repoUrl,
    clipboard: repoUrl
  };

  $notification.post(
    "GitHub 仓库识别",
    repo,
    "点击跳转仓库",
    attach
  );
}

// ================= 放行原请求 =================
$done(req);