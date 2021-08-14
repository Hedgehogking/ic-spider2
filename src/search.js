const puppeteer = require('puppeteer');
const getSearchResult = require('./get-search-result');
const hackVerificationCode = require('./hack-verification-code');

const MAX_RT = 3;

async function getBrowser() {
	let tempbrowser;
	let i = MAX_RT;

	function luanch() {
		return puppeteer.launch({
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
			}).catch(async ex => {
				if (--i > 0) {
					console.log('browser launch failed. now retry...');
					const browser = await luanch();
					return browser;
				} else {
					console.log('browser launch failed!');
				}
				return null;
			});
	}
	console.log('start to init browser...');
	tempbrowser = await luanch();
	if (!tempbrowser) {
		console.log('fail to launch browser');
		return null;
	}
	return tempbrowser;
}

async function loadWebsite(page, url, model) {
	let i = MAX_RT;
	function load() {
		console.log(`${model} load url: ${url}`);
		return page.goto(url, {
			'waitUntil':'domcontentloaded',
			'timeout':60000
		}).catch(async ex=>{
			if(--i > 0) {
				console.log('fail to goto website. now retry...');
				await load();
			} else {
				console.log('fail to goto website!');
			}
		});
	}
	console.log('start to goto page...');
	await load();
}

async function getPageType(page) {
  await page.waitForSelector('.footer');
	let tmpType = 0;
	let resultList = await page.$('#resultList');
	let return_empty = await page.$('.return_empty');
	let searchCode = await page.$('#searchCode');
	console.log(!!resultList, !!return_empty, !!searchCode);
	if (resultList) {
		// 搜索页
		tmpType = 0
	} else if (return_empty) {
		// 空搜索页
		tmpType = 1;
	} else if (searchCode) {
		// 验证码页
		tmpType = 2;
	} else {
		// 其他页
		tmpType = 3;
	}
	return tmpType;
}

class Page {
	constructor(browser, page, model, pageNum, CHAPTERS_URL) {
		this.browser = browser;
		this.page = page;
		this.model = model;
		this.pageNum = pageNum;
		this.CHAPTERS_URL = CHAPTERS_URL;

		this.run(page, model, pageNum, CHAPTERS_URL);
	}

	async run(page, model, pageNum, CHAPTERS_URL){
		this.history = { CHAPTERS_URL, pageNum };
		await loadWebsite(page, `${CHAPTERS_URL}?page=${pageNum}`, model);
		const type = await getPageType(page);
		if (type === 1) {
			// 空搜索页
			// return;
		} else if (type === 2) {
			// 验证码页
			await hackVerificationCode(page);
			// 验证码完成
			// TODO：
			return;
		} else if (type === 3) {
			// 其他页
			await this.run(page, model, this.history.pageNum, this.history.CHAPTERS_URL);
			return;
		}
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
			console.log('start to expose function "window.stop()"');
			await page.exposeFunction('stop', () => { return Promise.resolve('already stop') })
			new Page(this.browser, page, model, pageNum, CHAPTERS_URL);
		})
	}
}
