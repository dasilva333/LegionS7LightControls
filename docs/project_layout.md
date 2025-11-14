# Project Layout

This file records the current directory organization so you know where each feature lives.

```
BrightnessController/
FinalHarness/
ProfileBridgeProject/
  ├── ProfileBridge/
  └── GetProfileTest/
ProfileReaderProject/
  ├── ProfileReader/
  └── FinalHarness_cli/
SetProfileDetailsController/
SetProfileProject/
docs/
.vscode/
.output/
```

The `ProfileReaderProject` grouping keeps the legacy CLI harness next to the reader bridge, while `ProfileBridgeProject` groups the reader harness and bridge together. The `LedControllerTest` experiment has been removed, and `Build & Run` instructions now live in `docs/build_and_run_details.md`.
