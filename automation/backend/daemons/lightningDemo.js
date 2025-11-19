const { uIOhook, UiohookKey } = require('uiohook-napi');
const { sendCommand } = require('../frida/proxy');

// Map uIOhook key names to your Lenovo JSON names
// This is a partial list for the demo
const KEY_MAPPING = {
    [UiohookKey.Q]: 'Q', [UiohookKey.W]: 'W', [UiohookKey.E]: 'E', [UiohookKey.R]: 'R',
    [UiohookKey.T]: 'T', [UiohookKey.Y]: 'Y', [UiohookKey.U]: 'U', [UiohookKey.I]: 'I',
    [UiohookKey.O]: 'O', [UiohookKey.P]: 'P', [UiohookKey.A]: 'A', [UiohookKey.S]: 'S',
    [UiohookKey.D]: 'D', [UiohookKey.F]: 'F', [UiohookKey.G]: 'G', [UiohookKey.H]: 'H',
    [UiohookKey.J]: 'J', [UiohookKey.K]: 'K', [UiohookKey.L]: 'L', [UiohookKey.Z]: 'Z',
    [UiohookKey.X]: 'X', [UiohookKey.C]: 'C', [UiohookKey.V]: 'V', [UiohookKey.B]: 'B',
    [UiohookKey.N]: 'N', [UiohookKey.M]: 'M', [UiohookKey.Space]: 'Space',
    [UiohookKey.Enter]: 'Enter', [UiohookKey.Backspace]: 'Backspace',
    [UiohookKey['1']]: '1', [UiohookKey['2']]: '2', [UiohookKey['3']]: '3',
    [UiohookKey['4']]: '4', [UiohookKey['5']]: '5', [UiohookKey['6']]: '6',
    [UiohookKey['7']]: '7', [UiohookKey['8']]: '8', [UiohookKey['9']]: '9', [UiohookKey['0']]: '0'
};

async function startLightning() {
    console.log('[Lightning] Waiting for Frida...');
    
    setTimeout(async () => {
        try {
            await sendCommand('enable');
            console.log('[Lightning] Listening for Global Keypresses...');

            uIOhook.on('keydown', (e) => {
                const lenovoName = KEY_MAPPING[e.keycode];
                if (lenovoName) {
                    // Fire and forget - low latency needed
                    sendCommand('flashKey', lenovoName).catch(() => {});
                }
            });

            uIOhook.start();

        } catch (e) {
            console.error('[Lightning] Error:', e);
        }
    }, 5000);
}

startLightning();