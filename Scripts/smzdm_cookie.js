// Quantumult X 持久化抓smzdm_cookie脚本
// author: yangchong99
// update-time: 2026-01-09

const url = $request.url;

if (url.match(/^https?:\/\/user-api\.smzdm\.com\/checkin$/)) {
  const cookie = $request.headers.Cookie || $request.headers.cookie;
  if (cookie) {
    $prefs.setValueForKey(cookie, 'smzdm_cookie');
    $notify('什么值得买', '🍪 Cookie 获取成功', '已保存 Cookie');
  }
}

$done({});
