const puppeteer = require('puppeteer');
const getSearchResult = require('./get-search-result');
const hackVerificationCode = require('./hack-verification-code');
const area = require('./area');
const pageFormat = require('./puppeteer-page-format');

const MAX_RT = 3;

const JUMP_SPEED = 0;

async function getBrowser() {
	let tempbrowser;
	let i = MAX_RT;

	function luanch() {
		return puppeteer.launch({
			headless: true,
			ignoreDefaultArgs: ["--enable-automation"],
			headers: {
				'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36',
			},
			args: [
				'--window-size="1679,859"',
			//   '--start-fullscreen',
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-blink-features=AutomationControlled',
				/**
				 * 破解7
				 */
			  // '--proxy-server=http://118.163.13.200:8080'
			],
			dumpio: false,
			}).catch(async ex => {
				console.log(ex);
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

async function loadWebsite(pageTag, url, model) {
	let i = MAX_RT;
	function load() {
		console.log(`${model} load url: ${url}`);
		return pageTag.goto(url, {
			'waitUntil':'domcontentloaded',
			'timeout':60000
		}).catch(async ex=>{
			console.log(ex);
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

async function getPageType(pageTag) {
	// const a = await pageTag.evaluate('console.log(navigator)',()=>navigator);
  await pageTag.waitForSelector('.footer');
	let tmpType = 0;
	const searchCode = await pageTag.$('#searchCode');
	const icCount = await pageTag.$('#icCount');

	if (icCount) {
		// 数据页
		tmpType = 0;
	} else if (searchCode) {
		// 验证码页
		tmpType = 2;
	} else {
		// 其他页
		tmpType = 3;
	}
	return tmpType;
}

function makeUrl({ baseUrl, pageNum, areaIdx, marketIdx }) {
	let url = `${baseUrl}?`;
	if (areaIdx > -1) {
		url += `searchAreaCode=${area[areaIdx].city}&`;
	}
	if (marketIdx > -1) {
		url += `searchMarket=${area[areaIdx].children[marketIdx]}&`;
	}
	url += `page=${pageNum}`
	return url;
}

class Page {
	constructor(browser, pageTag, model, onModelFinish) {
		this.browser = browser;
		this.pageTag = pageTag;
		this.model = model;
		this.pageNum = 1;
		/**
		 * mfg 厂商，但是无效
		 * searchAreaCode=1
		 * searchMarket=华强电子世界
		 * qty=1000
		 * sort=down
		 */
		// this.baseUrl = `https://www.ic.net.cn/searchPnCode.php`;
		this.baseUrl = `https://www.ic.net.cn/search/${model}.html`;
		// this.baseUrl = `https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&rsv_idx=1&tn=baidu&wd=ip&fenlei=256&rsv_pq=83712eb400090f8a&rsv_t=0420vuTwjRZdkbt7VruIBx0sR8eoByrxR%2BeJpeJo3Oo21GQYmuTpktCG6Z4&rqlang=cn&rsv_enter=1&rsv_dl=ib&rsv_sug3=2&rsv_sug1=2&rsv_sug7=100&rsv_sug2=0&rsv_btype=i&inputT=746&rsv_sug4=746`;
		this.search = { areaIdx: -1, marketIdx: -1 };
		this.onModelFinish = onModelFinish;
		this.list = [];

		this.action(this.pageNum, this.baseUrl);
	}

	async action(pageNum, baseUrl) {
		// 保存最后一次请求的网页
		this.history = { baseUrl, pageNum, ...this.search };
		// 加载网页
		await loadWebsite(this.pageTag, makeUrl(this.history), this.model);
		await this.pageTag.screenshot({ path: './see_the_page.jpg' })
		// 检测该网页最终类型，走相应逻辑
		await this.goWithType();
		// 是列表页才往下走
		// 判断该列表页是啥类型，走相应逻辑
		/**
		 * 如：
		 * 空页则跳下一页；
		 * 检测数据量是否需要分开地域搜索;
		 * 正常获取则往下走;
		 */
		await this.doInList();
		// 顺利通过，开始获取数据
		const { chapterTitle, chapterList } = await getSearchResult(this.pageTag);
		const { areaIdx, marketIdx } = this.history;

		this.list = this.list.concat(chapterList);
		console.log('\x1B[32m%s\x1B[0m', `
		search: ${this.model};
		cityName: ${areaIdx > -1 ? area[areaIdx].cityName : ''};
		marketName: ${(areaIdx > -1 && marketIdx > -1) ? area[areaIdx].children[marketIdx] : ''};
		page: ${pageNum};
		length: ${chapterList.length};
		status: success`);

		// 是否需要下一页，或者下一页是啥
		this.checkStatus(chapterList.length);
	}

	async goWithType() {
		const type = await getPageType(this.pageTag, this.history);
		const { pageNum, baseUrl } = this.history;
		return new Promise(async (resolve, reject) => {
			if (type === 2) {
				/**
				 * 破解4
				 */
				// 验证码页
				await hackVerificationCode(this.pageTag, () => {
					// 验证码完成
					// 重刷页面
					this.action(pageNum, baseUrl);
					reject('break js hack code');
				});
				return;
			} else if (type === 3) {
				/**
				 * 破解5
				 */
				// 其他页
				// 重刷页面
				this.action(pageNum, baseUrl);
				reject(`break js other page ${this.pageTag.url()}`);
				return;
			}
			resolve('continue js');
		});
	}

	async doInList() {
		await this.pageTag.waitForSelector('.footer');
		const icCount = await this.pageTag.$('#icCount');
		const pagepicker = await this.pageTag.$('.pagepicker');
		const return_empty = await this.pageTag.$('.return_empty');
		const searchAreaCode = this.search.areaIdx > -1;
		const searchMarket = this.search.marketIdx > -1;

		const count = await icCount.evaluate(node => node.textContent);
		if (count == 0 || return_empty) {
			// 地域搜索为空，跳下一地域 || 页码去尽，空搜索页
			console.log('\x1B[31m%s\x1B[0m', 'get page data empty ', this.pageTag.url());
			this.nextStep();
			return Promise.reject('break js empty page');
		}
		const pageLen = await pagepicker.$$('li');
		if (pageLen.length === 10) {
			if (!searchAreaCode) {
				// 搜索页，需分地域搜索
				this.startArea();
				return Promise.reject('break js start area');
			} else if (!searchMarket) {
				// 某城市内也满了，需要分区域
				this.startMarket();
				return Promise.reject('break js start market');
			}
			// 指定某城市内的某区域都能满，那只能直接取，最多取10页
			/**
			 * 破解6
			 */
		}
		// 有数据，并普通总页数，正常取
	}

	checkStatus(curListLen) {
		if (curListLen < 49) {
			// 最后一页，下一步
			this.nextStep();
			return;
		}
		// 下一页
		this.nextPage();
	}

	nextPage() {
		if (this.pageNum >= 10) {
			console.log('\x1B[34m%s\x1B[0m', 'data over 10 pages, all repeat ', this.pageTag.url());
			this.nextStep();
			return;
		}
		this.pageNum++;
		this.delayLoadPage();
	}

	nextStep() {
		const searchAreaCode = this.search.areaIdx > -1;
		const searchMarket = this.search.marketIdx > -1;
		if (!searchAreaCode) {
			// 下一个型号
			this.nextModel();
		} else if (!searchMarket) {
			// 下一个城市
			this.nextArea();
		} else {
			// 下一个区域
			this.nextMarket();
		}
	}

	nextModel() {
		console.log('\x1B[33m%s\x1B[0m', `${this.model} finished: ${this.list.length}`);
		this.onModelFinish();
	}

	nextArea(only = false) {
		if (this.search.areaIdx >= area.length - 1) {
			// 已经是最后一个城市
			this.nextModel();
			return;
		}
		this.search.areaIdx++;
		// only 表示只搜城市，不带区域
		!only && (this.search.marketIdx = 0);
		this.pageNum = 1;
		this.delayLoadPage();
	}

	startArea() {
		this.nextArea(true);
	}

	nextMarket() {
		const { areaIdx, marketIdx } = this.search;
		if (marketIdx >= area[areaIdx].children.length - 1) {
			// 已经是最后一个区域
			this.nextArea();
			return;
		}
		this.search.marketIdx++;
		this.pageNum = 1;
		this.delayLoadPage();
	}

	startMarket() {
		this.nextMarket();
	}

	delayLoadPage() {
		// 延迟加载下一页的时间，对抗反爬虫
		setTimeout(() => {
			this.action(this.pageNum, this.baseUrl);
		}, JUMP_SPEED);
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
		/**
		 * 破解1
		 */
		// 不行就用代理
		console.log('start to expose function "window.stop()"');
		await page.exposeFunction('stop', () => { return Promise.resolve('already stop') })


		/**
		 * 破解3
		 */
		// webdriver 重置页面初始化window对象属性
		await page.evaluateOnNewDocument(pageFormat);

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
