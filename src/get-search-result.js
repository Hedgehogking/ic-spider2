const RESULT_ID = '#resultList > li';
const RESULT_TITLE_ID = '#resultList_title > div';

module.exports = async function getSearchResult(browser, page) {
  let data = {
    chapterTitle: [],
    chapterList: [],
  }

  console.log('start to find result element in page...');
  const resultEl = await page.waitForSelector(RESULT_ID).catch(ex=>{
    console.log("oh....no...!!!, i can not see anything!!!");
  });
  const titleEl = await page.waitForSelector(RESULT_TITLE_ID).catch(ex => {
    console.log('no result title');
  })
  if (!resultEl || !titleEl) {
    console.log('maybe empty');
    return data;
  }
  console.log('yes! result is visible');

  console.log('start to get info from result element...');

  data = await page.evaluate((RESULT_ID, RESULT_TITLE_ID) => {

    let ship = document.querySelector('.membership_iconExplain');
    if (ship) {
      ship.parentElement.removeChild(ship);
      ship = null;
    }

    let preCompany = {};
    // 资料在title的元素
    const valueFromTitleArr = ['result_id', 'result_factory', 'result_batchNumber', 'result_totalNumber', 'result_pakaging', 'result_explain', 'result_kwplace', 'result_date'];
    // 获取元素列表做处理
    function getDataFromEleArr(arr = [], handler = () => {}) {
      return arr.filter(child => !!child.textContent.trim()).slice(0, -1).map(handler);
    }
    // 获取title
    function getTitle(className, title, tmpObj) {
      if (valueFromTitleArr.includes(className)) {
        tmpObj[className.slice(7)] = title;
      }
    }
    // 获取公司详情
    function companyHandler(company, tmpObj) {
      let curCompany = {};
      const companyName = company.querySelector('.result_goCompany');
      if (!companyName) {
        curCompany = preCompany;
      } else {
        curCompany.company = companyName.textContent.trim();
        curCompany.goCompany = companyName.href;
        // 公司资质
        curCompany.icons = Array.from(company.querySelectorAll('.result_icons a')).map(a => ({
          type: a.className,
          link: a.href,
          title: a.title
        }));
        curCompany.detail = company.querySelector('.detailLayer').textContent;
        preCompany = curCompany;
      }
      Object.assign(tmpObj, curCompany);
    }
    // 商品标签
    function idHandler(child, tmpObj) {
      tmpObj.tags = [];
      Array.from(child.children).slice(1).forEach(el => {
        let sub = el;
        if (el.href) {
          sub = el.firstElementChild;
        }
        tmpObj.tags.push({
          type: sub.className.slice(5),
          title: sub.title,
          href: el.href
        })
      })
    }

    // 表头
    let chapterTitle = getDataFromEleArr(Array.from(document.querySelectorAll(RESULT_TITLE_ID)), child => child.textContent.trim());

    // 列表
    let chapterList = [];
    let liArr = Array.from(document.querySelectorAll(RESULT_ID)).slice(3);
    liArr.forEach(li => {
      const tmpObj = {};
      Array.from(li.children).forEach(child => {
        const { className, title } = child;
        switch (className) {
          case 'result_supply':
            // 公司详情
            companyHandler(child, tmpObj);
            break;
          case 'result_id':
            // 货物标签
            idHandler(child, tmpObj);
            getTitle(className, title, tmpObj)
            break;
          case 'result_prompt':
            // 库存位置
            Array.from(child.children).forEach(el => {
              getTitle(el.className, el.title, tmpObj)
            })
            break;
            // 获取完整日期
          case 'result_date':
            if (child.lastElementChild) {
              getTitle(className, child.lastElementChild.value, tmpObj)
            } else {
              getTitle(className, title, tmpObj)
            }
            break;
          default:
            getTitle(className, title, tmpObj)
            break;
        }
      });
      chapterList.push(tmpObj);
    })

    return {
      chapterTitle,
      chapterList,
    };
  }, RESULT_ID, RESULT_TITLE_ID).catch(ex=>{
    console.log('fail to query chapter list!' + ex);
  });
  return data;
}
