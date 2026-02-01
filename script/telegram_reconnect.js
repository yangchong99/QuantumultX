// 检查上次打开时间，超过2分钟才执行重连
const appName = $prefs.valueForKey("tg_last_open_app") || "";
const lastOpenTime = parseInt($prefs.valueForKey("tg_last_open_time") || "0");
const currentTime = Date.now();
const timeDiff = (currentTime - lastOpenTime) / 1000 / 60; // 转换为分钟

console.log(`上次打开: ${appName}, 距今: ${timeDiff.toFixed(1)} 分钟`);

// 更新本次打开时间
$prefs.setValueForKey(currentTime.toString(), "tg_last_open_time");
$prefs.setValueForKey($environment.params, "tg_last_open_app");

// 如果距离上次打开超过2分钟，则执行重连
if (timeDiff > 2 || lastOpenTime === 0) {
    console.log("距离上次打开超过2分钟，开始执行重连...");
    
    // 切换到全局代理
    const dict1 = { "running_mode": "all_proxy" };
    const message1 = {
        action: "set_running_mode",
        content: dict1
    };
    
    $configuration.sendMessage(message1).then(resolve => {
        if (resolve.error) {
            console.log("切换到全局代理失败: " + resolve.error);
            $done();
            return;
        }
        console.log("已切换到全局代理，3秒后恢复...");
        
        // 3秒后切回规则分流
        setTimeout(() => {
            const dict2 = { "running_mode": "filter" };
            const message2 = {
                action: "set_running_mode",
                content: dict2
            };
            
            $configuration.sendMessage(message2).then(resolve => {
                if (resolve.error) {
                    console.log("切换回规则分流失败: " + resolve.error);
                } else {
                    console.log("已自动切回规则分流模式");
                }
                $done();
            }, reject => {
                $done();
            });
        }, 3000);
    }, reject => {
        $done();
    });
} else {
    console.log("距离上次打开不足2分钟，跳过重连");
    $done();
}
