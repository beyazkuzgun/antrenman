/* Test aracı: Chrome'u uzaktan açar, sayfayı yükler, bekler, #o metnini ve hataları yazar. node tools/cdp.mjs URL [bekleme_ms] [ekran.png] */
import { spawn } from 'child_process';
const url = process.argv[2], wait = +process.argv[3] || 15000;
import { existsSync } from 'fs';
const CH = process.env.CHROME || ['google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => !p.startsWith('/') || existsSync(p));
const ch = spawn(CH, ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9333', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws; for (let k = 0; k < 40; k++) { try { const j = await (await fetch('http://127.0.0.1:9333/json')).json(); const p = j.find(x => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break } } catch (e) {} await sleep(250) }
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const logs = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d.result); delete pend[d.id] } if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text)); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') logs.push('ERR ' + d.params.args.map(a => a.value || a.description).join(' ')) };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })) });
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url });
await sleep(wait);
const r = await send('Runtime.evaluate', { expression: "document.getElementById('o') ? document.getElementById('o').textContent : document.title" });
console.log(r.result.value); console.log(logs.join('\n'));
if (process.argv[4]) { const s = await send('Page.captureScreenshot', { format: 'png' }); (await import('fs')).writeFileSync(process.argv[4], Buffer.from(s.data, 'base64')) }
ch.kill(); process.exit(0);
