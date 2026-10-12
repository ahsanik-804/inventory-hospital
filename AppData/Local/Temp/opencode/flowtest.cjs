const { app, BrowserWindow } = require('electron');

const APP_FILE = 'C:\\Users\\ITW\\Documents\\Clinic inventory-hospital\\electron-app\\app\\main.html';

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1300, height: 800, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: false }
  });
  win.webContents.on('console-message', (e, level, message) => {
    console.log('[CONSOLE lvl=' + level + ']', String(message).slice(0, 200));
  });
  await win.loadFile(APP_FILE);
  await new Promise(r => setTimeout(r, 1500));

  const result = await win.webContents.executeJavaScript(`(function () {
    var out = {};
    try {
      DATA = [{Category:'Allopathic',Company:'GSK',Disease:'infection',MedicineName:'Augmentin 625mg',Salt:'Amoxicillin',Weight:'',Price:100,Stock:50}];
      state.medicine = DATA[0];
      renderMedicines();
      showDetail(DATA[0]);
      out.detailButtons = document.getElementById('detailButtons').innerText;
      var btns = Array.prototype.slice.call(document.querySelectorAll('#detailButtons button'));
      out.buttonTexts = btns.map(function(b){ return b.innerText; });
      var btn = btns.find(function(b){ return b.innerText.indexOf('Add to Cart') >= 0; });
      out.foundBtn = !!btn;
      if (btn) { btn.click(); }
      var els = document.getElementById('cartList').children;
      out.cartLen = CART.length;
      out.count = document.getElementById('cartCount').textContent;
      out.cartItems = Array.prototype.slice.call(els).map(function(d){ return d.innerText; });
      out.cartChildren = els.length;
      out.emptyDisplay = document.getElementById('cartEmpty').style.display;
      out.printBtnDisplay = document.getElementById('printCartBtn').style.display;
    } catch (e) {
      out.thrown = String(e);
      out.stack = e.stack;
    }
    return out;
  })()`).catch(e => ({ execError: String(e) }));

  console.log('RESULT:', JSON.stringify(result, null, 2));
  app.quit();
});

app.on('window-all-closed', () => app.quit());