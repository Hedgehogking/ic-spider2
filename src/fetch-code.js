const path = require('path');
const fs = require('fs');
const request = require('request');
const gm = require('gm');
const hackImg = require('./hack-img');

const url = 'https://www.ic.net.cn/global/verficationCode.php?VcodeName=SearchCode&int=4&a=0.779168846734396';
const dir = path.join(__dirname, '../hack-images/');

let num = 1;
function get() {
  console.log('start');
  request({
    url,
    method: 'get',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
      // 这里巨坑！这里开启了gzip的话http返回来的是Buffer。
      // 'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'zh-CN,zh;q=0.9', // 优化成gzip
      'Cache-Control': 'no-cache',
    },
    // 想请求回来的html不是乱码的话必须开启encoding为null
    encoding: null
  }, async (err, res, body) => {
    console.log('end');
    fs.writeFile(`./hack-images/code_${Math.floor(Math.random() * 1000000)}.jpg`, body, (err, res) => {
      console.log(num);
      if (num < 50) {
        num++;
        setTimeout(() => {
          get()
        }, 1000);
      } else {
        handle()
      }
    });
  })
}

function handle() {
  const list = fs.readdirSync(dir);
  console.log(list.length);
  list.forEach(fileName => {
    if (fileName.match(/^code_\d+\.jpg$/)) {
      gm(`${dir}${fileName}`)
      .threshold(46, true)
      .write(`${dir}hack_${fileName}`, (err) => {
        console.log(err);
      });
    }
  })
}


function recognize() {
  const list = fs.readdirSync(dir)
  let len = 150;
  list.forEach(async (fileName, index) => {
    if (fileName.match(/^hack_.*\.jpg$/)) {
      len--;
      if (len < 0) return;
      const code = await hackImg(`${dir}${fileName}`);
    }
  });
}


// get()
// handle()
// recognize()
