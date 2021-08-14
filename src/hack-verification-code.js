const hackImg = require('./hack-img');
const fs = require('fs');
const path = require('path');

const HACK_CODE_IMAGES_PATH = path.join(__dirname, '../hack-images');
const VERIFICATION_CODE = '#searchCode';

function createDir(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}

async function findAndhackCode(page, callback) {
  await page.waitForSelector(VERIFICATION_CODE);
  await page.evaluate(async (HACK_CODE_IMAGES_PATH, VERIFICATION_CODE) => {
    const codeFileName = `code_${Math.floor(Math.random() * 1000000)}.jpg`;

    const searchCode = document.querySelector(VERIFICATION_CODE);
    if (!searchCode) {
      console.log('end, no searchCode');
      return;
    }
    searchCode.width = 120;
    searchCode.height = 50;
    // 创建验证码存放处
    createDir(HACK_CODE_IMAGES_PATH)
    await screenshot({
      clip: searchCode.getBoundingClientRect(),
      path: `${HACK_CODE_IMAGES_PATH}/${codeFileName}`,
      quality: 100,
    })
    const code = await hackImg(`${HACK_CODE_IMAGES_PATH}/${codeFileName}`);
    searchCode.previousElementSibling.value = code;
    return code;
  }, HACK_CODE_IMAGES_PATH, VERIFICATION_CODE).catch(err => {
    console.log(err);
  });
  await page.click('[name="btn_submit"]');
  const result = await checkType(page);
  if (!result) {
    callback();
  }
}

async function checkType(page) {
  await page.waitForSelector('.footer');
  const searchCode = page.$(VERIFICATION_CODE);
  return searchCode;
}

module.exports = async function hackVerificationCode(page, callback) {
  function screenshot(options) {
    return page.screenshot(options);
  }
  try {
    await page.exposeFunction('createDir', createDir);
    await page.exposeFunction('screenshot', screenshot);
    await page.exposeFunction('hackImg', hackImg);
  } catch (error) {
    console.log('this error jump: ', error);
  }
  page.on('dialog', async (dialog) => {
    // 没通过
    console.log(dialog.message());
    try {
      await dialog.accept();
    } catch (error) {
      console.log(error);
    }
    // 再刷
    setTimeout(async () => {
      await findAndhackCode(page, callback);
    }, 0);
  })
  await findAndhackCode(page, callback);
}
