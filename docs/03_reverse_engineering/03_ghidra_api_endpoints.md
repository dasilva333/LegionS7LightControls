# Ghidra HTTP API — Original vs New Routing

This document summarizes the original HTTP endpoints exposed by the Ghidra MCP server and the new REST‑style routes recently added. It also outlines what new functionality the updated routes aim to provide and how they relate to the existing operations.

## Original API (stable)

- `GET /methods`
  - Lists function names (paginated via common handler).
- `GET /classes`
  - Lists class/type names (paginated).
- `GET /segments`
  - Lists memory segments.
- `GET /imports`
  - Lists imported symbols.
- `GET /exports`
  - Lists exported symbols.
- `GET /namespaces`
  - Lists non‑global namespaces.
- `GET /data`
  - Lists defined data labels/values.
- `POST /strings`
  - Lists strings (original handler supports optional filtering; pagination handled by server‑side logic).
- `POST /decompile`
  - Body: function name (UTF‑8 string)
  - Returns: decompiled C for that function.
- `GET /searchFunctions`
  - Query: substring to match function names.
- `POST /xrefs_to`
  - Body: address payload
  - Returns: xrefs pointing to the address.
- `POST /xrefs_from`
  - Body: address payload
  - Returns: xrefs originating from the address.
- `POST /function_xrefs`
  - Body: function name
  - Returns: callers/callees/xref info for the function.

Notes
- Pagination is implemented via a shared “paginated request” handler on most list endpoints.
- Function identification is primarily by name; address‑based variants exist via xref endpoints.

## New API (advanced RESTful routing)

- `ANY /function/`
  - Entry point for function‑scoped operations (address or name addressing). Typical sub‑operations include:
    - `GET /function/{id}/decompile` → decompile by name or address
    - `GET /function/{id}/pcode` or `/high_pcode` → low‑level and high‑level p‑code
    - `GET /function/{id}/cfg` → control‑flow graph
    - `GET /function/{id}/callers` and `/callees` → cross‑references at call edges
    - `GET /function/{id}/xrefs_to` and `/xrefs_from` → address/function xrefs
    - `POST /function/{id}/comment` → add decompiler/disassembly comments
    - `POST /function/{id}/tag` and `DELETE /function/{id}/tag` → tagging

- `ANY /types/`
  - Type system operations. Typical sub‑operations include:
    - `GET /types` → list defined/user types
    - `GET /types/{name}` → detailed definition (fields, sizes)
    - `POST /types/struct` → create a new struct (JSON definition)
    - `POST /types/apply` → apply a type at an address

- `ANY /patch/`
  - Binary patching utilities. Typical capabilities:
    - `POST /patch/instruction` → patch instruction bytes at an address
    - `POST /patch/string` → (if implemented) update a string literal region

- `ANY /search/`
  - Unified search surface. Typical capabilities:
    - `GET /search/functions?q=...` → function name search
    - `GET /search/strings?q=...` → substring search over strings
    - `GET /search/constants?v=...` → find references to constants

- `ANY /tags`
  - Project‑level tag operations:
    - `GET /tags` → list tags and associated functions
    - `POST /tags` → create/apply tag(s)
    - `DELETE /tags/{tag}` → remove tag from a function

- `ANY /bookmarks`
  - Bookmark operations:
    - `GET /bookmarks` → list bookmarks (address, category, comment)
    - `POST /bookmarks` → create bookmark at an address

Notes
- The new routing centralizes feature families (functions, types, patching, search, tags, bookmarks) under coherent namespaces.
- Address‑based addressing is a first‑class citizen (e.g., `/function/0x1800014630/decompile`).
- Many of these operations align with the MCP function set we already use (e.g., decompile, pcode, cfg, callers/callees, type creation, patch instruction, tagging, bookmarks).

## What the New API Offers (at a glance)

- Clear, hierarchical resource model vs many one‑off endpoints.
- Both name‑ and address‑based function addressing in a single place.
- Richer function introspection in one namespace: decompile, p‑code, CFG, callers/callees, xrefs, comments.
- First‑class type operations: list, inspect, create struct, apply type.
- Built‑in patching surface for editing instructions without leaving the API.
- Unified search with consistent query semantics across functions/strings/constants.
- Project organization features: tags and bookmarks as API resources.

## Current Status (our environment)

- Original endpoints continue to work and back our current MCP integration.
- New endpoints (`/function/`, `/types/`, `/patch/`, `/search/`, `/tags`, `/bookmarks`) currently return 404 in this setup, which indicates the server has not yet wired those routes live for our session.
- When activated, these routes should mirror or supersede capabilities we already exercise via the MCP tools, but with cleaner routing and expanded surface area.

## Migration Guidance

- Short‑term: keep using the original endpoints/MCP functions for reliability.
- When the new routes are live:
  - Prefer `/function/{id}` operations for decompile/CFG/p‑code/xrefs/callers/callees.
  - Use `/types/` for type creation/application rather than ad‑hoc actions.
  - Adopt `/patch/` for instruction patching to centralize edits.
  - Leverage `/search/` to consolidate discovery across symbols, strings, and constants.
  - Use `/tags` and `/bookmarks` to annotate analysis and build navigable context.
