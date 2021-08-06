const XLSX = require('xlsx');
const { utils } = XLSX;

module.exports = class Excel {
  constructor(data = [], fileName = '') {
    this.fileName = fileName;
    this.wb = utils.book_new();
    const ws = utils.aoa_to_sheet(data);
    utils.book_append_sheet(this.wb, ws, this.fileName);
  }

  writeExcel() {
    return XLSX.writeFile(this.wb, `./export-files/${this.fileName}.xlsx`);
  }
}
