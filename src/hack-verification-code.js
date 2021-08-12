const hackImg = require('./hack-img');
const fs = require('fs');
const path = require('path');

const HACK_CODE_IMAGES_PATH = path.join(__dirname, '../hack-images');

function createDir(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}

module.exports = async function hackVerificationCode(page) {
  function screenshot(options) {
    return page.screenshot(options);
  }

  await page.exposeFunction('createDir', createDir);
  await page.exposeFunction('screenshot', screenshot);
  await page.exposeFunction('hackImg', hackImg);
  await page.evaluate(async (HACK_CODE_IMAGES_PATH) => {
    const VERIFICATION_CODE = '#searchCode';
    const codeFileName = `code_${Math.floor(Math.random() * 1000000)}.jpg`;

    const searchCode = document.querySelector(VERIFICATION_CODE);
    searchCode.width = searchCode.width * 5;
    searchCode.height = searchCode.height * 5;
    // 创建验证码存放处
    createDir(HACK_CODE_IMAGES_PATH)
    await screenshot({
      clip: searchCode.getBoundingClientRect(),
      path: `${HACK_CODE_IMAGES_PATH}/${codeFileName}`,
      quality: 100,
    })
    const code = await hackImg(`${HACK_CODE_IMAGES_PATH}/${codeFileName}`);
    // console.log(code);
  }, HACK_CODE_IMAGES_PATH).catch(err => {
    console.log(err);
  });
}
