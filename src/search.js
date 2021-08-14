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
	constructor(browser, page, model, onModelFinish) {
		// let CHAPTERS_URL = `https://www.ic.net.cn/searchPnCode.php`;
		this.browser = browser;
		this.page = page;
		this.model = model;
		this.pageNum = 1;
		/**
		 * mfg 厂商，但是无效
		 * searchAreaCode=1&searchMarket=华强电子世界
		 */
		this.CHAPTERS_URL = `https://www.ic.net.cn/search/${model}.html`;
		this.onModelFinish = onModelFinish;
		this.list = [];

		this.run(page, model, this.pageNum, this.CHAPTERS_URL);
	}

	async run(page, model, pageNum, CHAPTERS_URL){
		// 保存最后一次请求的网页
		this.history = { CHAPTERS_URL, pageNum };
		// WARNING: 超过10页后的所有都是重复的……
		if (pageNum <= 10) {
			// 加载网页
			await loadWebsite(page, `${CHAPTERS_URL}?page=${pageNum}`, model);
			// 检测该网页最终类型，走相应逻辑
			await this.goWithType(page, model);
			// 顺利通过，开始获取数据
			const { chapterTitle, chapterList } = await getSearchResult(page);
			if (chapterList.length) {
				this.list = this.list.concat(chapterList);
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
		} else {
			// console.log('\x1B[31m%s\x1B[0m', 'data over 10 pages, all repeat');
		}
		console.log('\x1B[33m%s\x1B[0m', `${model} finished: ${this.list.length}`);
		this.onModelFinish();
	}

	async goWithType(page, model) {
		const type = await getPageType(page);
		return new Promise(async (resolve, reject) => {
			if (type === 1) {
				// 空搜索页
				// return;
			} else if (type === 2) {
				// 验证码页
				await hackVerificationCode(page, () => {
					// 验证码完成
					this.run(page, model, this.history.pageNum, this.history.CHAPTERS_URL);
					reject('break js');
				});
				return;
			} else if (type === 3) {
				// 其他页
				this.run(page, model, this.history.pageNum, this.history.CHAPTERS_URL);
				reject('break js');
				return;
			}
			resolve('continue js');
		});
	}
}

module.exports = class Search {
	constructor(models) {
		this.models = models;
		this.curModelIdx = 0;
		this.init();
	}

	async init() {
		this.browser = await getBrowser();
		const page = await this.browser.newPage().catch(err=>{
			console.log(err);
		});
		if (!page) {
			console.log('fail to open page!');
			return;
		}
		// 不行就用代理
		console.log('start to expose function "window.stop()"');
		await page.exposeFunction('stop', () => { return Promise.resolve('already stop') })

		const onModelFinish = () => {
			if (this.curModelIdx < this.models.length) {
				new Page(this.browser, page, this.models[this.curModelIdx], onModelFinish);
				this.curModelIdx++;
			} else {
				console.log('all finished');
				page.close();
				if(!this.browser.pages.length) {
					console.log('close browser');
					this.browser.close().catch(ex=>{
						console.log('fail to close the browser!');
					});
				};
			}
		}
		onModelFinish();
	}
}
