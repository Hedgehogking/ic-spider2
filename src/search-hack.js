const puppeteer = require('puppeteer');
const getSearchResult = require('./get-search-result');

const model = 'ADXL1002BCPZ';
const page = 1;

const MAX_RT = 3;
const CHAPTERS_URL = `https://www.ic.net.cn/search/${model}.html?page=${page}`;		//目录地址


module.exports = async function search(model) {
	var tempbrowser;
	for (var i = MAX_RT; i > 0; i--) {

		if (tempbrowser) {
			break;
		}

		console.log('start to init browser...');
		tempbrowser = await puppeteer.launch({
		headless:false,
    ignoreDefaultArgs: ["--enable-automation"],
		headers: {
			'User-Agent':'Baiduspider',
		},
		args: [
			'--window-size="1200,1000"',
		//   '--start-fullscreen',
		//   '--proxy-server=socks5://127.0.0.1:1080'
		]
		}).catch(ex => {
			if (i-1 > 0) {
				console.log('browser launch failed. now retry...');
			} else {
				console.log('browser launch failed!');
			}

		});
	}

	if (!tempbrowser) {
		reject('fail to launch browser');
		return;
	}
	var browser = tempbrowser;

	console.log('start to new page...');
	var page = await browser.newPage().catch(ex=>{
		console.log(ex);
	});
	if (!page) {
		await browser.close().catch();
		reject('fail to open page!');
		return;
	}

	page.on("load", async () => {
		console.log(`load page success => ${page.url()}`);

		if (page.url() === CHAPTERS_URL) {

			// puppeteer 方式
			console.log('load the page');
			const { chapterTitle, chapterList } = await getSearchResult(browser, page);
			console.log('list length: ', chapterList.length);
			// TODO: 翻页


			if (chapterList.length) {
				console.log('get page data success !!!!!!!!!!');
				// const excel = new Excel(chapterTitle, chapterList, companyName);
				// await excel.writeExcel();
				console.log('\x1B[32m%s\x1B[0m', `${model} search success`);
				console.log('close the browser');
			} else {
				console.log('get page data empty');
			}

			await browser.close().catch(ex=>{
				console.log('fail to close the browser!');
			});



		}
	})

	var respond;
	for (var i = MAX_RT; i > 0; i--) {

		if (respond) {
			break;
		}
    console.log('start to expose function "window.stop()"');
    // 不行就用代理
    await page.exposeFunction('stop', () => { return Promise.resolve('already stop') })
		console.log('start to goto page...');
		respond = await page.goto(CHAPTERS_URL, {
			'waitUntil':'domcontentloaded',
			'timeout':120000
		}).catch(ex=>{
			if(i-1 > 0) {
				console.log('fail to goto website. now retry...');
			} else {
				console.log('fail to goto website!');
			}

		});
	}
  await page.evaluate((num) => {
  }, 1).catch(() => {
  })
	if (!respond) {
		await browser.close().catch();
		reject('fail to go to website!');
		return;
	}
}
