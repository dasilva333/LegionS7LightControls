const { uIOhook, UiohookKey } = require('uiohook-napi');
const { sendCommand } = require('../frida/proxy');
const { getGodModeState } = require('../services/godmodeConfigStore');

// Standard mapping for common keys
// You can expand this map later for Numpad/Special keys
const KEY_MAPPING = {
    [UiohookKey.Escape]: 'Esc',
    [UiohookKey.F1]: 'F1', [UiohookKey.F2]: 'F2', [UiohookKey.F3]: 'F3', [UiohookKey.F4]: 'F4',
    [UiohookKey.F5]: 'F5', [UiohookKey.F6]: 'F6', [UiohookKey.F7]: 'F7', [UiohookKey.F8]: 'F8',
    [UiohookKey.F9]: 'F9', [UiohookKey.F10]: 'F10', [UiohookKey.F11]: 'F11', [UiohookKey.F12]: 'F12',
    [UiohookKey.Grave]: '~ (Tilde)', [UiohookKey['1']]: '1', [UiohookKey['2']]: '2', [UiohookKey['3']]: '3',
    [UiohookKey['4']]: '4', [UiohookKey['5']]: '5', [UiohookKey['6']]: '6', [UiohookKey['7']]: '7',
    [UiohookKey['8']]: '8', [UiohookKey['9']]: '9', [UiohookKey['0']]: '0', [UiohookKey.Minus]: '- (Minus)',
    [UiohookKey.Equal]: '= (Equals)', [UiohookKey.Backspace]: 'Backspace',
    [UiohookKey.Tab]: 'Tab', [UiohookKey.Q]: 'Q', [UiohookKey.W]: 'W', [UiohookKey.E]: 'E', [UiohookKey.R]: 'R',
    [UiohookKey.T]: 'T', [UiohookKey.Y]: 'Y', [UiohookKey.U]: 'U', [UiohookKey.I]: 'I', [UiohookKey.O]: 'O',
    [UiohookKey.P]: 'P', [UiohookKey.BracketLeft]: '[', [UiohookKey.BracketRight]: ']', [UiohookKey.Backslash]: '\\ (Backslash)',
    [UiohookKey.CapsLock]: 'Caps Lock', [UiohookKey.A]: 'A', [UiohookKey.S]: 'S', [UiohookKey.D]: 'D',
    [UiohookKey.F]: 'F', [UiohookKey.G]: 'G', [UiohookKey.H]: 'H', [UiohookKey.J]: 'J', [UiohookKey.K]: 'K',
    [UiohookKey.L]: 'L', [UiohookKey.Semicolon]: '; (Semicolon)', [UiohookKey.Quote]: "' (Quote)", [UiohookKey.Enter]: 'Enter',
    [UiohookKey.ShiftLeft]: 'Left Shift', [UiohookKey.Z]: 'Z', [UiohookKey.X]: 'X', [UiohookKey.C]: 'C',
    [UiohookKey.V]: 'V', [UiohookKey.B]: 'B', [UiohookKey.N]: 'N', [UiohookKey.M]: 'M', [UiohookKey.Comma]: ', (Comma)',
    [UiohookKey.Period]: '. (Period)', [UiohookKey.Slash]: '/ (Slash)', [UiohookKey.ShiftRight]: 'Right Shift',
    [UiohookKey.CtrlLeft]: 'Left Ctrl', [UiohookKey.MetaLeft]: 'Left Win', [UiohookKey.AltLeft]: 'Left Alt',
    [UiohookKey.Space]: 'Space', [UiohookKey.AltRight]: 'Right Alt', [UiohookKey.CtrlRight]: 'Menu / R-Ctrl',
    [UiohookKey.ArrowUp]: 'Up Arrow', [UiohookKey.ArrowLeft]: 'Left Arrow', [UiohookKey.ArrowDown]: 'Down Arrow', [UiohookKey.ArrowRight]: 'Right Arrow',
    [UiohookKey.Insert]: 'Insert', [UiohookKey.Delete]: 'Delete', [UiohookKey.Home]: 'Home', [UiohookKey.End]: 'End',
    [UiohookKey.PageUp]: 'PgUp', [UiohookKey.PageDown]: 'PgDn', [UiohookKey.PrintScreen]: 'PrtSc'
};

let currentState = { enabled: false };

async function refreshState() {
    const dbState = await getGodModeState();
    // Ensure we access the widget/fx config correctly based on your schema
    // Assuming: widgets.fx_typing.enabled or similar?
    // Or maybe stored under `effectSettings` if you simplified it?

    // For now, let's assume it's under widgets.typingFx based on the frontend card name
    const fxConfig = dbState.widgets?.typingFx || {};
    currentState.enabled = fxConfig.enabled || false;

    // Dynamic refresh rate
    const refreshRate = fxConfig.refreshRate || 2000;
    setTimeout(refreshState, refreshRate);
}

// Start the loop
refreshState();

uIOhook.on('keydown', (e) => {
    if (!currentState.enabled) return;

    const lenovoName = KEY_MAPPING[e.keycode];
    if (lenovoName) {
        // Fire and forget
        // console.log('[TypingDaemon] Flashing key:', lenovoName);
        sendCommand('flashKey', lenovoName).catch(() => { });
    }
});

uIOhook.start();
console.log('[TypingDaemon] Started. Listening for input...');