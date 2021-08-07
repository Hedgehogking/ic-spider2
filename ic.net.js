const GetListByCheerio = require('./src/cheerio');
const XLSX = require('xlsx');

// 传入公司的二级域名
const domain = process.argv[2];

if (!domain) {
  console.log('\x1B[33m%s\x1B[0m', 'no domain');
  return;
}

const ic = new GetListByCheerio({
  pageLen: 8,
  url(page) {
    return `https://${domain}.ic.net.cn/userHomePage/hotStock.php?Page=${page}`;
  },
  getListAfterLoadPage(ic, $) {
    function getTextArrFromEl(elArr = []) {
      return Array.from(elArr).slice(0, -1).map(el => $(el).text().trim())
    }
    // 设置文件名
    if (!ic.companyName) {
      ic.setCompanyName($('#company_name').text());
    }

    // 设置表头
    if (!ic.tableTitle.length) {
      ic.setTableTitle(getTextArrFromEl($('.hs_caption div')));
    }

    const list = [];
    // 获取指定元素
    let hs_content = $('#hot_stock .hs_content');
    // 循环得到元素的跳转地址和名称
    hs_content.map((i, item) => {
      // 这里的map跟jq一样，跟js原生的参数是互换的
      list.push(getTextArrFromEl($(item).find('div')));
    });
    return list;
  }
})

ic.run()
