const puppeteer = require('puppeteer');
const getSearchResult = require('./get-search-result');
const hackVerificationCode = require('./hack-verification-code');

const MAX_RT = 3;

async function getBrowser() {
	let tempbrowser;
	for (let i = MAX_RT; i > 0; i--) {

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
		console.log('fail to launch browser');
		return null;
	}
	return tempbrowser;
}
async function loadWebsite(page, url) {
	let respond;
	for (let i = MAX_RT; i > 0; i--) {
		if (respond) {
			break;
		}
		console.log('start to expose function "window.stop()"');
		console.log('start to goto page...');
		respond = await page.goto(url, {
			'waitUntil':'domcontentloaded',
			'timeout':6000000
		}).catch(ex=>{
			if(i-1 > 0) {
				console.log('fail to goto website. now retry...');
			} else {
				console.log('fail to goto website!');
			}
		});
	}
	return respond;
}

async function getPageType(page) {
	const { type } = await page.evaluate(() => {
    const data = {
      type: 0,
    }
		const searchCode = document.querySelector('#searchCode');
			if (searchCode) {
				// 验证码页
				data.type = 1;
			}
		return data;
	});
	return type;
}

module.exports = class Search {
	constructor(models) {
		this.models = models;
		this.init();
	}

	async init() {
		this.browser = await getBrowser();
		this.models.forEach(async model => {
			const page = await this.browser.newPage().catch(err=>{
				console.log(err);
			});
			if (!page) {
				console.log('fail to open page!');
				return;
			}
			let pageNum = 1;
			// let CHAPTERS_URL = `https://www.ic.net.cn/searchPnCode.php`;
			let CHAPTERS_URL = `https://www.ic.net.cn/search/${model}.html`;
			// 不行就用代理
			await page.exposeFunction('stop', () => { return Promise.resolve('already stop') })
			this.run(page, model, pageNum, CHAPTERS_URL);
		})
	}

	async run(page, model, pageNum, CHAPTERS_URL) {
		await loadWebsite(page, `${CHAPTERS_URL}?page=${pageNum}`);
		// const type = await getPageType(page);
		// if (type === 1) {
		// 	await hackVerificationCode(page);
		// }
		const { chapterTitle, chapterList } = await getSearchResult(page);
		if (chapterList.length) {
			console.log('\x1B[32m%s\x1B[0m', `
			search: ${model};
			page: ${pageNum};
			length: ${chapterList.length};
			status: success`);
			setTimeout(() => {
				this.run(page, model, ++pageNum, CHAPTERS_URL);
			}, 3000);
			return;
		}
		console.log('\x1B[31m%s\x1B[0m', 'get page data empty');
		page.close();
		if(!this.browser.pages.length) {
			this.closeBrowser();
		};
	}

	async closeBrowser() {
		console.log('close browser');
		await this.browser.close().catch(ex=>{
			console.log('fail to close the browser!');
		});
	}
}
/*
module.exports = async function search(model) {
	const CHAPTERS_URL = `https://www.ic.net.cn/search/${model}.html?page=${pageNum}`;		//目录地址

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
 */
