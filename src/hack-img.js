var fs = require('fs');
var tesseract = require('node-tesseract-ocr');
var gm = require('gm');

/**
 * 处理图片为阈值图片
 * @param imgPath
 * @param newPath
 * @param [thresholdVal=55] 默认阈值
 * @returns {Promise}
 */
function processImg(imgPath, newPath, thresholdVal) {
  return new Promise((resolve, reject) => {
    gm(imgPath)
      .threshold(thresholdVal || 45, true)
      .write(newPath, (err) => {
        if (err) return reject(err);
        resolve(newPath);
      });
  });
}

/**
 * 识别图片
 * @param imgPath
 * @param options tesseract options
 * @returns {Promise}
 */
async function recognizer(imgPath, options) {
  options = Object.assign({ oem: 0, psm: 3, dpi: 100 }, options);
  const text = await tesseract.recognize(imgPath, options);
  return text.replace(/[^0-9a-zA-Z]/gm, '');
}

module.exports = async function hackImg(path) {
  const pathArr = path.split(/(\.)/);
  pathArr.splice(-2, 0, '_hack');
  const newPath = pathArr.join('');

  return processImg(path, newPath)
    .then(recognizer)
    .then(text => {
      console.log(`识别结果:${text}`);
      return text;
    })
    .catch((err) => {
      console.error(`识别失败:${err}`);
    });
}
