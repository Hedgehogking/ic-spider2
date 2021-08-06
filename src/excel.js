const fs = require('fs');
const XLSX = require('xlsx');
const { utils } = XLSX;

const exportFileDir = './export-files';

module.exports = class Excel {
  constructor(data = [], fileName = '') {
    this.fileName = fileName;
    this.wb = utils.book_new();
    const ws = utils.aoa_to_sheet(data);
    utils.book_append_sheet(this.wb, ws, this.fileName);
  }

  writeExcel() {
    if (!fs.existsSync(exportFileDir)) {
      fs.mkdirSync(exportFileDir);
    }
    return XLSX.writeFile(this.wb, `${exportFileDir}/${this.fileName}.xlsx`);
  }
}
