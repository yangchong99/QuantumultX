/*
[task_local]
# 云闪付签到
59 15 8 * * * script-path=https://你存放脚本的地址/YSF_SignIn.js, tag=云闪付签到
*/

const $task = env.isNode ? require('axios') : $task;
const $notify = env.isNode ? require('./sendNotify') : $notify;

const YSF_TOKEN = $prefs.valueForKey("YSF_TOKEN");
const YSF_COOKIE = $prefs.valueForKey("YSF_COOKIE");

const header = {
    "Host": "youhui.95516.com",
    "Accept": "application/json, text/plain, */*",
    "Authorization": YSF_TOKEN,
    "Sec-Fetch-Site": "same-origin",
    "Accept-Language": "zh-CN,zh-Hans;q=0.9",
    "x-city": "360900",
    "Sec-Fetch-Mode": "cors",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": "https://youhui.95516.com",
    "Content-Length": "2",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/sa-sdk-ios (com.unionpay.chsp) (cordova 4.5.4) (updebug 0) (version 938) (UnionPay/1.0 CloudPay) (clientVersion 198) (language zh_CN) (upHtml) (walletMode 00)",
    "Referer": "https://youhui.95516.com/newsign/public/app/index.html",
    "Connection": "keep-alive",
    "Content-Type": "application/json",
    "Sec-Fetch-Dest": "empty",
    "Cookie": YSF_COOKIE
};

const payload = {};

const request = {
    url: 'https://youhui.95516.com/newsign/api/daily_sign_in',
    headers: header,
    body: JSON.stringify(payload)
};

$task.fetch(request).then(response => {
    const result = JSON.parse(response.body);
    const message = `签到结果: ${result.signedIn}, 签到天数: ${result.days}`;
    $notify("云闪付签到结果", message);
    console.log(message);
}, reason => {
    $notify("云闪付签到失败", reason.error);
    console.error(reason.error);
});
