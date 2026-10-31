const http = require('http');
const fs = require('fs');

http.get('http://127.0.0.1:9222/json', (res) => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', async () => {
    const list = JSON.parse(raw);
    const pageObj = list.find(p => p.url && p.url.includes('5500'));
    const WebSocket = require('ws');
    const ws = new WebSocket(pageObj.webSocketDebuggerUrl);

    let id = 400;
    const send = (method, params = {}) => new Promise((resolve) => {
      const msgId = ++id;
      const handler = (m) => {
        const data = JSON.parse(m);
        if (data.id === msgId) {
          ws.removeListener('message', handler);
          resolve(data.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    ws.on('open', async () => {
      await send('Emulation.setDeviceMetricsOverride', {
        width: 360,
        height: 645,
        deviceScaleFactor: 2,
        mobile: true
      });
      await send('Page.navigate', { url: 'http://127.0.0.1:5500/user-dashboard.html' });
      await new Promise(r => setTimeout(r, 600));

      // Click sidebar toggle
      await send('Runtime.evaluate', {
        expression: 'toggleSidebar()'
      });
      await new Promise(r => setTimeout(r, 400));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/dines/.gemini/antigravity-ide/brain/3041d39f-211b-4f1c-9e84-18772b62318f/scratch/mobile_sidebar_before.png', Buffer.from(screenshot.data, 'base64'));
      console.log('Mobile sidebar screenshot saved!');
      process.exit(0);
    });
  });
});
