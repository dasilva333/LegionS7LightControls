# h4rdc Goals

This document captures the high‑level goals for keyboard LED control and what “success” looks like. It intentionally stays non‑technical and focuses on outcomes and approach, not implementation details.

## Vision

- Full, reliable control of the keyboard lighting system from user space, with the flexibility to use either the device’s built‑in effects or custom, software‑driven behaviors.

## Goals (what and why)

- Ambilight‑style “Screen → Keyboard”
  - Mirror on‑screen colors to the keyboard in real time for media, games, and visualizers.

- Custom, real‑time per‑key animations
  - Drive smooth, software‑defined animations that adapt to context (apps, status, user actions) beyond built‑in firmware effects.

- Read, edit, and write profiles
  - Treat lighting profiles as structured data (JSON). Read the active profile, modify layers/regions/colors, and write them back predictably.

- Toggle control modes (firmware ↔ software)
  - Choose between letting the keyboard’s own firmware run animations or taking host control to render frames from software. Switch cleanly without side effects.

- Brightness and profile selection
  - Programmatically get/set brightness and switch profiles quickly and safely.

- Event‑driven effects (notifications, alerts)
  - Flash or overlay effects on new messages, errors, or app‑defined events. Support different colors/patterns per type or source.

- Time‑of‑day and contextual themes
  - Automatically shift palettes by time, and dedicate regions (e.g., function row, numpad) to external context like weather or system status.

- Observability hooks (optional)
  - Subscribe to a live stream of current key colors for diagnostics, visualizers, or remote control.

## Approach (conceptual)

- Build on the vendor add‑in already controlling lighting, using its existing commands and data shapes.
- Favor reversible, low‑risk calls: start with reads and simple setters; layer in custom behaviors over time.
- Keep the control path user‑space and predictable; avoid kernel‑level components.

## Context (why not LED.dll)

- The legacy LED.dll path depends on a missing service/driver on this system and isn’t responsible for current lighting. The Lenovo AdvancedLighting path is active and feature‑rich, so our work anchors there.

