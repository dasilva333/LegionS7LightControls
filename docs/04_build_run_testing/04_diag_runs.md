# Diagnostic Runs and Expected Outputs

## Commands

- Brightness: --BrightnessLevel
- ProfileIndex: --LightingProfileIndex
- ProfileInfo: --LightingProfileInfo 4

## Expected JSON (working)

- Brightness
  - {"errorcode":0,"payload":{"brightness":2}}

- ProfileIndex
  - {"errorcode":0,"payload":{"profileId":4}}

- ProfileInfo (ideal)
  - errorcode: 0
  - payload: {"profileId":N,"layers":[{"layerId":...,"animationId":...},...]}
  - debug: present with afterInitProfile, afterParseProfile

## Failure / Debug Cases

- {"error":"timeout","command":"Get-LightingProfileInfo"}
  - Native call blocked; parent killed child.

- {"error":"unhandled-exception"}
  - SEH caught an internal native exception.

- ProfileInfo debug shows actualId=0 and count=0 after both init/parse
  - Indicates memory not persisted; call internal JSON builder function to obtain full profile JSON.

