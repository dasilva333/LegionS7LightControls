./activate_frida_env.bat

frida -n "LenovoVantage-(LenovoGamingUserAddin).exe" -l C:\Users\h4rdc\keyboard-led-project\frida\hook_lighting.js

and this works too:

frida -n "LenovoVantage-(LenovoGamingUserAddin).exe" -l C:\Users\h4rdc\keyboard-led-project\frida\frida_agent.js


# Dispatcher Replay Notes

This note captures the minimum data we must collect (and subsequently replay) to drive Lenovo's `Gaming.AdvancedLighting.dll` safely outside Lenovo Vantage.

## Capture Artifacts

The Frida hook (`hook_lighting.js`) writes one JSON file per argument passed to the dispatcher:

| File Pattern | Contents | Notes |
|--------------|----------|-------|
| `inbound_command_<ts>.binary` | Raw bytes of the Lenovo command string (preferred). | Bridge falls back to `.json`’s `string_content` if this is missing. |
| `inbound_command_<ts>.json` | UTF‑8 copy of the contract JSON. | Only used when `.binary` isn’t present. |
| `inbound_payload_<ts>.binary` | Raw bytes for the `payloadTag`/aux string. | Needed for non-printable tags. |
| `inbound_payload_<ts>.json` | UTF‑8 `string_content` copy of the payload tag. | Fallback when `.binary` is absent. |
| `inbound_context_<ts>.binary` | Raw bytes for the optional context blob. | Handed to dispatcher as-is. |
| `inbound_context_<ts>.json` | UTF‑8 serialization of the context (if printable). | Only parsed when `.binary` data is missing. |
| `outbound_result_<ts>.json` | Lenovo’s reply | Useful for verifying success. |

Each `<ts>` is a unique timestamp (milliseconds) and becomes the identifier we pass into the bridge.

## Replay Order

The SetProfileDetails controller now expects **all** timestamps required to rebuild the sequence. The typical flow for a manual edit is:

1. (Optional) `Get-ProfileEditState` / `Get-LightingProfileDetails` / `Set-LightingProfileIndex`
2. `Set-ProfileEditState` *(open edit mode for the active profile)*
3. `Set-LightingProfileDetails` *(send the new layer definition)*
4. `Set-ProfileEditState` *(close / apply)*

If Lenovo emitted extra commands (for example, to select a zone or toggle effects), include those timestamps as well. The harness simply replays them in the order supplied on the command line.

## Running the Harness

```powershell
cd C:\Users\h4rdc\keyboard-led-project\SetProfileDetailsController\SetDetailsTest
"C:\Program Files\dotnet\dotnet.exe" run -- 1763158850008 1763158855461 1763158857167
```

The worker joins the arguments into a comma-delimited string and hands it to the bridge. The bridge loads each `<ts>` from `%LOCALAPPDATA%\Temp\traffic`, forwards the captured payload/context pointers, and logs progress to `%LOCALAPPDATA%\ProfileBridge\details_setter.log`.

## Troubleshooting Tips

* If the bridge logs `dispatcher slot3 null`, verify that `Gaming.AdvancedLighting.dll` is still accessible at `C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34`.
* A crash near `rbx+0x38` usually means we skipped a preparatory command. Re-run the capture and include the `Get-*` commands leading into the edit.
* Every replay writes the most recent dispatcher response to `%LOCALAPPDATA%\ProfileBridge\last_set_result.json`. Compare this JSON to the outbound result captured by Frida to confirm parity.
