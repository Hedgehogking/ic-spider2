module.exports = function () {
  // webdriver
  const newProto = navigator.__proto__;
  delete newProto.webdriver; //删除 navigator.webdriver字段
  navigator.__proto__ = newProto;

  // 添加 window.chrome 字段，向内部填充一些值
  window.chrome = {};
  window.chrome.app = {
    InstallState: 'hehe',
    RunningState: 'haha',
    getDetails: 'xixi',
    getIsInstalled: 'ohno',
  };
  window.chrome.csi = function () { };
  window.chrome.loadTimes = function () { };
  window.chrome.runtime = function () { };

  //userAgent设置
  window.randomUA().then(ua => {
    Object.defineProperty(navigator, 'userAgent', {
      //userAgent在无头模式下有headless字样，所以需覆盖
      get: () => ua });
  });

  // languages设置
  Object.defineProperty(navigator, 'languages', {
    //添加语言
    get: () => ['zh-CN', 'zh', 'en'],
  });

  // permissions设置
  const originalQuery = window.navigator.permissions.query; //notification伪装
  window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters);

  // WebGL设置
  const getParameter = WebGLRenderingContext.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (parameter) {
    // UNMASKED_VENDOR_WEBGL
    if (parameter === 37445) {
      return 'Intel Inc.';
    }
    // UNMASKED_RENDERER_WEBGL
    if (parameter === 37446) {
      return 'Intel(R) Iris(TM) Graphics 6100';
    }
    return getParameter(parameter);
  };

  // plugins
  Object.defineProperty(navigator, 'plugins', {
    //伪装真实的插件信息
    get: () => [
      {
        0: {
          type: 'application/x-google-chrome-pdf',
          suffixes: 'pdf',
          description: 'Portable Document Format',
          enabledPlugin: Plugin,
        },
        description: 'Portable Document Format',
        filename: 'internal-pdf-viewer',
        length: 1,
        name: 'Chrome PDF Plugin',
      },
      {
        0: {
          type: 'application/pdf',
          suffixes: 'pdf',
          description: '',
          enabledPlugin: Plugin,
        },
        description: '',
        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
        length: 1,
        name: 'Chrome PDF Viewer',
      },
      {
        0: {
          type: 'application/x-nacl',
          suffixes: '',
          description: 'Native Client Executable',
          enabledPlugin: Plugin,
        },
        1: {
          type: 'application/x-pnacl',
          suffixes: '',
          description: 'Portable Native Client Executable',
          enabledPlugin: Plugin,
        },
        description: '',
        filename: 'internal-nacl-plugin',
        length: 2,
        name: 'Native Client',
      },
    ],
  });
}
