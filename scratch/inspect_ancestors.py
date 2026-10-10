import asyncio, websockets, json, subprocess, urllib.request, time

async def inspect():
    port = 9339
    proc = subprocess.Popen([
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "--headless=new", f"--remote-debugging-port={port}",
        "--window-size=360,645", "http://127.0.0.1:5500/upload-prescription.html"
    ])
    await asyncio.sleep(2)
    try:
        resp = urllib.request.urlopen(f"http://127.0.0.1:{port}/json")
        target = json.loads(resp.read().decode())[0]
        async with websockets.connect(target['webSocketDebuggerUrl']) as ws:
            await ws.send(json.dumps({'id': 1, 'method': 'Emulation.setDeviceMetricsOverride', 'params': {'width': 360, 'height': 645, 'deviceScaleFactor': 1, 'mobile': True}}))
            await ws.recv()
            await asyncio.sleep(1)
            
            js = """
            (() => {
                let el = document.querySelector('.upload-form-card');
                const chain = [];
                while (el) {
                    const style = window.getComputedStyle(el);
                    chain.push({
                        tag: el.tagName,
                        cls: el.className,
                        id: el.id,
                        rectW: el.getBoundingClientRect().width,
                        scrollW: el.scrollWidth,
                        clientW: el.clientWidth,
                        cssWidth: style.width,
                        cssMaxW: style.maxWidth,
                        cssMinW: style.minWidth,
                        padding: `${style.paddingLeft} ${style.paddingRight}`,
                        margin: `${style.marginLeft} ${style.marginRight}`
                    });
                    el = el.parentElement;
                }
                return chain;
            })()
            """
            await ws.send(json.dumps({'id': 2, 'method': 'Runtime.evaluate', 'params': {'expression': js, 'returnByValue': True}}))
            res = await ws.recv()
            print("Ancestor chain:")
            for c in json.loads(res)['result']['result']['value']:
                print(" ", c)
    finally:
        proc.terminate()

asyncio.run(inspect())
