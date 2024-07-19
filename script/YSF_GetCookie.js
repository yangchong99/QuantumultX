const YSF_TOKEN = $request.headers['Authorization'];
const YSF_COOKIE = $request.headers['Cookie'];

if (YSF_TOKEN && YSF_COOKIE) {
    $prefs.setValueForKey(YSF_TOKEN, "YSF_TOKEN");
    $prefs.setValueForKey(YSF_COOKIE, "YSF_COOKIE");
    $notify("云闪付Cookie获取成功", "", "YSF_TOKEN 和 YSF_COOKIE 已保存！");
} else {
    $notify("云闪付Cookie获取失败", "", "未能获取 YSF_TOKEN 或 YSF_COOKIE");
}

$done({});
