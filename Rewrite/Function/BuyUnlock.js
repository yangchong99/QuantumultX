/******************************

脚本功能：Buy域自动解锁(持久化+多APP支持)
脚本作者：Baby & yangchongUncle
更新时间：2026-02-06
使用说明：
1. 请确保在使用前已启用 MitM 并信任证书。
2. 此脚本设计用于 buy.itunes.apple.com 域名的 verifyReceipt 接口。
3. 首次拦截时会记录 BundleID，需在 BoxJS 或持久化数据中补充 productId 才能生效。
3.1 eg: ProKnockOut
    [{"bundleId": "com.loveyouchenapps.knockout", "appName": "ProKnockOut", "productId": "com.knockout.AISVIP.yearly.upgrade"}]

[rewrite_local]

^https?:\/\/buy\.itunes\.apple\.com\/verifyReceipt url script-response-body https://raw.githubusercontent.com/yangchong99/QuantumultX/main/Rewrite/Function/BuyUnlock.js

[mitm] 

hostname = buy.itunes.apple.com

*******************************/

const STORAGE_KEY = "notifiedApps"; // 持久化 KEY

(function () {
  try {
    const url = $request && $request.url ? $request.url : "";
    if (url.indexOf("/verifyReceipt") === -1) {
      $done({ body: $response.body });
      return;
    }

    let originalData;
    try {
      originalData = JSON.parse($response.body);
    } catch (e) {
      console.log("解析响应失败:", e);
      $done({ body: $response.body });
      return;
    }

    if (
      !originalData ||
      !originalData.receipt ||
      !originalData.receipt.bundle_id
    ) {
      console.log("无 bundle_id，直接放行");
      $done({ body: JSON.stringify(originalData) });
      return;
    }

    const bundleId = originalData.receipt.bundle_id;
    console.log("拦截到 verifyReceipt, bundleId:", bundleId);

    const notifiedApps = getNotifiedApps();
    var record = notifiedApps.find(function (r) {
      return r.bundleId === bundleId;
    });
    var appNameUA = getAppNameFromUA() || "未知";

    if (!record) {
      record = {
        bundleId: bundleId,
        appName: appNameUA,
        productId: "",
      };
      notifiedApps.push(record);
      saveNotifiedApps(notifiedApps);

      notify(
        "首次拦截到 APP",
        appNameUA,
        "BundleID: " + bundleId + "\n未填写 ProductID",
      );
    } else {
      if (
        (record.appName === "未知" || !record.appName) &&
        appNameUA !== "未知"
      ) {
        record.appName = appNameUA;
        saveNotifiedApps(notifiedApps);
        //console.log("从 UA 自动更新 appName:", appNameUA);
      }

      console.log(
        "重复拦截: " +
          bundleId +
          " | appName=" +
          record.appName +
          " | productId=" +
          (record.productId || "未填写"),
      );
    }

    if (!record.productId) {
      notify(
        "⚠ ProductID 未填写",
        record.appName,
        "BundleId: " + bundleId + "\n请设置 productId 才能解锁",
      );
      $done({ body: JSON.stringify(originalData) });
      return;
    }

    const template = createReceiptTemplate(record.productId);

    originalData.receipt.in_app = [template];
    originalData.latest_receipt_info = [template];

    //console.log("✔ 已为 " + bundleId + " 注入 ProductID: " + record.productId);
    $done({ body: JSON.stringify(originalData) });
  } catch (e) {
    console.log("全局异常:", e);
    $done({ body: $response.body });
  }
})();

function getAppNameFromUA() {
  try {
    const headers = $request.headers || {};
    var ua = headers["User-Agent"] || headers["user-agent"] || "";
    if (!ua) return "";

    if (ua.indexOf("%") !== -1) {
      try {
        ua = decodeURIComponent(ua);
      } catch (e) {
        console.log("UA 解码失败:", e);
      }
    }

    var match = ua.match(/^(.+?)\/[\d\.]+/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (e) {
    console.log("UA 解析失败:", e);
  }
  return "";
}

function getNotifiedApps() {
  // 使用兼容方法读取
  let raw = getStorage(STORAGE_KEY);
  if (!raw) return [];

  // 清理用户可能误复制的垃圾字符 (如 "notified " 前缀或末尾逗号)
  raw = raw.trim();
  if (raw.indexOf("notified") === 0) {
    raw = raw.replace(/^notified[\s:：]*/, ""); // 去除 notified 前缀
  }
  if (raw.endsWith(",")) {
    raw = raw.substring(0, raw.length - 1); // 去除末尾逗号
  }

  try {
    let list = JSON.parse(raw);

    // 如果解析出的是单个对象而不是数组，自动包裹
    if (!Array.isArray(list)) {
      if (typeof list === "object" && list !== null) {
        list = [list];
      } else {
        return [];
      }
    }

    list = list
      .map(function (item) {
        if (!item) return null;
        // 兼容用户数据中可能存在的键名空格 " appName"
        const safeAppName = item.appName || item[" appName"] || "未知";
        return {
          bundleId: item.bundleId,
          appName: safeAppName,
          productId: item.productId || "",
        };
      })
      .filter((item) => item !== null);

    return list;
  } catch (e) {
    console.log("持久化解析失败 (已重置): " + e.message);
    // 解析失败返回空数组，脚本会自动重建数据
    return [];
  }
}

function saveNotifiedApps(apps) {
  const json = JSON.stringify(apps);
  const ok = setStorage(json, STORAGE_KEY);

  if (ok) {
    console.log("✨ 已保存持久化 (" + apps.length + " 条):");
    apps.forEach(function (r, i) {
      console.log(
        i +
          1 +
          ". " +
          r.bundleId +
          " | " +
          r.appName +
          " | productId=" +
          (r.productId || "未填写"),
      );
    });
  } else {
    console.log("❌ 保存持久化失败");
  }
}

// --- 兼容性工具函数 ---
function getStorage(key) {
  if (typeof $persistentStore !== "undefined") {
    return $persistentStore.read(key);
  }
  if (typeof $prefs !== "undefined") {
    return $prefs.valueForKey(key);
  }
  return null;
}

function setStorage(val, key) {
  if (typeof $persistentStore !== "undefined") {
    return $persistentStore.write(val, key);
  }
  if (typeof $prefs !== "undefined") {
    return $prefs.setValueForKey(val, key);
  }
  return false;
}

function createReceiptTemplate(productId) {
  return {
    quantity: "1",
    purchase_date_ms: "1690103349000",
    expires_date: "2222-12-22 22:22:22 Etc/GMT",
    expires_date_pst: "2222-12-22 22:22:22 America/Los_Angeles",
    is_in_intro_offer_period: "false",
    transaction_id: "tg:@Jsforbaby",
    is_trial_period: "false",
    original_transaction_id: "798306614211111",
    purchase_date: "2023-07-22 06:43:22 Etc/GMT",
    product_id: productId,
    original_purchase_date_pst: "2023-07-22 06:43:22 America/Los_Angeles",
    in_app_ownership_type: "PURCHASED",
    original_purchase_date_ms: "1694250550000",
    web_order_line_item_id: "798306614211111",
    expires_date_ms: "7983066142000",
    purchase_date_pst: "2023-07-22 06:43:22 America/Los_Angeles",
    original_purchase_date: "2023-07-22 06:43:22 Etc/GMT",
  };
}

function notify(title, subtitle, body) {
  if (typeof $notification !== "undefined" && $notification.post) {
    $notification.post(title, subtitle, body);
  } else {
    console.log("通知:", title, subtitle, body);
  }
}
