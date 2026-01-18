/*
------------------------------------------
@Author: yangchongUncle
@Date: 2026-01-18 20:02:58
@Description:今日金价获取

⚠️【免责声明】
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
*/
const $ = new Env("今日黄金报价");
const query_addr = "https://www.ip138.com/gold/";

// 时间格式转换为 2025-09-23-224546，用于显示
function toFormattedDate(timeStr) {
  try {
    let d = new Date(timeStr);
    if (isNaN(d.getTime())) return "";
    let yyyy = d.getFullYear();
    let MM = (d.getMonth() + 1).toString().padStart(2, "0");
    let dd = d.getDate().toString().padStart(2, "0");
    let hh = d.getHours().toString().padStart(2, "0");
    let mm = d.getMinutes().toString().padStart(2, "0");
    let ss = d.getSeconds().toString().padStart(2, "0");
    return `${yyyy}-${MM}-${dd}-${hh}${mm}${ss}`;
  } catch {
    return "";
  }
}

(async () => {
  try {
    let data = await httpGet(query_addr);
    log("网页抓取成功，开始解析...");

    // 解析金店报价表，改进更新时间解析，支持无 span 标签情况
    let shop_prices = [];
    const shop_table_regex = /<table>[\s\S]*?<thead>[\s\S]*?金店名称[\s\S]*?<\/thead>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/;
    const shop_table_match = data.match(shop_table_regex);
    if (shop_table_match) {
      const row_regex = /<tr>([\s\S]*?)<\/tr>/g;
      let row_match;
      while ((row_match = row_regex.exec(shop_table_match[1])) !== null) {
        const td_regex = /<td(?:[^>]*)>([\s\S]*?)<\/td>/g;
        let tds = [];
        let td_match;
        while ((td_match = td_regex.exec(row_match[1])) !== null) {
          let raw = td_match[1].replace(/\n/g, " ").trim();
          let parts = [];
          const spanReg = /<span[^>]*>(.*?)<\/span>/g;
          let m;
          while ((m = spanReg.exec(raw))) {
            parts.push(m[1]);
          }
          // 有 span 的取第一个，否则取裸文本
          if (parts.length > 0) {
            tds.push(parts.join(""));
          } else {
            let plain = raw.replace(/<[^>]+>/g, "").trim().replace(/-/g, "—");
            tds.push(plain);
          }
        }
        if (tds.length === 4 && tds[0] !== "金店名称") {
          shop_prices.push({
            shop: tds[0],
            price: tds[1],
            buy_price: tds[2],
            time: toFormattedDate(tds[3]),
          });
        }
      }
      log(`解析到金店报价 ${shop_prices.length} 条`);
    } else {
      log("未匹配到金店报价表");
    }

    // 解析主流交易品种表
    let types = [];
    const type_table_regex = /<table>[\s\S]*?<thead>[\s\S]*?交易品种[\s\S]*?<\/thead>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/;
    const type_table_match = data.match(type_table_regex);
    if (type_table_match) {
      const row_regex = /<tr>([\s\S]*?)<\/tr>/g;
      let row_match;
      while ((row_match = row_regex.exec(type_table_match[1])) !== null) {
        const td_regex = /<td(?:[^>]*)>([\s\S]*?)<\/td>/g;
        let tds = [];
        let td_match;
        while ((td_match = td_regex.exec(row_match[1])) !== null) {
          let val = td_match[1].replace(/<[^>]+>/g, "").trim();
          tds.push(val);
        }
        if (tds.length === 4 && tds[0] !== "交易品种") {
          types.push({
            breed: tds[0],
            price: tds[1],
            convert: tds[2],
            time: toFormattedDate(tds[3]),
          });
        }
      }
      log(`解析到交易品种 ${types.length} 条`);
    } else {
      log("未匹配到交易品种表");
    }

    // 美化排版辅助
    function pad(str, len, align = "left") {
      str = str ? str.toString() : "";
      let wideLen = str.replace(/[^\x00-\xff]/g, "xx").length;
      let padLen = len - wideLen;
      if (padLen <= 0) return str;
      if (align === "right") return " ".repeat(padLen) + str;
      if (align === "center") {
        let left = Math.floor(padLen / 2);
        let right = padLen - left;
        return " ".repeat(left) + str + " ".repeat(right);
      }
      return str + " ".repeat(padLen);
    }

    // 字段宽度设置
    const w1 = 8,
      w2 = 8,
      w3 = 8,
      w4 = 18; // 充足显示时间

    let message =
      "【今日黄金报价】\n\n金店报价:\n" +
      pad("名称", w1) +
      pad("零售价", w2) +
      pad("换购价", w3) +
      pad("更新时间", w4) +
      "\n";
    shop_prices.forEach((i) => {
      message +=
        pad(i.shop, w1) +
        pad(i.price, w2) +
        pad(i.buy_price, w3) +
        pad(i.time, w4, "right") +
        "\n";
    });

    message += "\n主流交易品种:\n";
    message += "品种  交易价格  换算价  更新时间\n";
    types.forEach((i) => {
      message += [i.breed, i.price, i.convert, i.time].join(" | ") + "\n";
    });

    notify("今日黄金报价", "", message, query_addr);
    log("脚本执行完成，推送内容如下：\n" + message);
  } catch (e) {
    log("请求或解析异常: " + e.message);
    notify("今日黄金报价", "执行失败", e.message);
  } finally {
    $.done();
  }
})();

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      url: url,
      headers: {
        Referer: query_addr,
        "User-Agent": "Mozilla/5.0"
      }
    };
    $task.fetch(options).then(
      (response) => resolve(response.body),
      (error) => reject(error)
    );
  });
}

function notify(title, subTitle, content, url) {
  if (url) {
    $notify(title, subTitle, content, { "open-url": url });
  } else {
    $notify(title, subTitle, content);
  }
}

function log(message) {
  console.log(message);
}

function Env(name) {
  this.name = name;
  this.done = () => {
    $done();
  };
}
