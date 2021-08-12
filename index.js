const hackImg = require('./src/hack-img')
const Search = require('./src/search')
const fs = require('fs');
const path = require('path');

new Search(['ADXL1002BCPZ', 'ATMEGA32A-PU'])

function all() {
  const dir = path.join(__dirname, './hack-images/');
  const list = fs.readdirSync(dir)
  list.slice(0, 2).forEach(async fileName => {
    if (fileName.match(/\.jpg$/)) {
      await hackImg(`${dir}${fileName}`)
    }
  });
}

// all()
// hackImg('/Volumes/Work/project/ic-spider2/code_000000.jpg')
// hackImg('/Users/Hedgehog/Downloads/training-code/code_832390.jpg')
