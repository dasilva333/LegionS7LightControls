# Ghidra HTTP API – v1 vs v2 Mapping (implemented)

This maps the original endpoints to the new REST-style v2 routes added additively to the clean source and notes what was verified live via MCP.

## Functions

- v2: `GET /function/{id}/callers` → Implemented, OK
  - Returns newline list of caller names.
- v2: `GET /function/{id}/callees` → Implemented, OK
  - Returns newline list of callee names.
- v2: `GET /function/{id}/cfg` → Implemented, OK
  - Returns small JSON string `{nodes:[{id,start,end}...],edges:[{from,to}...]}`.
- v2: `GET /function/{id}/pcode` → Implemented, OK
  - Returns newline list of raw pcode ops; may be empty for tiny stubs.
- v2: `GET /function/{id}/high_pcode` → Implemented, OK
  - Returns newline list of high pcode ops.

Notes
- `{id}` can be a function name (e.g., `FUN_...`) or an address `0x...`.
- Non-empty pcode is easier to see on non-trivial functions (e.g., `FUN_180002610`, `FUN_180003480`).

## Types

- v2: `GET /types` → Implemented, OK
  - Returns a newline list of type path names; paging supported via `offset`/`limit`.
- v2: `GET /type/{name}` → Implemented, OK
  - For struct types: returns manual JSON with `name`, `path`, `length`, and `fields` (name, type, offset, length).
  - For non-structs: may return a minimal JSON object `{}`.
  - Tip: Use bare names (e.g., `IMAGE_NT_HEADERS64`) not full path (`/PE/...`).
- v2: `POST /data/{address}/type` → Implemented (write), not exercised here.
- v2: `POST /types/struct` → Implemented (write), not exercised here.

## Patching

- v2: `POST /patch/instruction/{address}` with body `{bytes:"HEX"}` → Implemented (write), not exercised here.

## Search

- v2: `GET /search/constant/{value}?offset=&limit=` → Implemented, OK
  - Returns newline list of instructions containing the constant.
- v2: `GET /search/string_xrefs?content=&case_sensitive=&offset=&limit=` → Implemented, OK
  - Returns newline pairs of `from -> string_address`.

## Legacy v1 (unchanged)

- All original v1 endpoints (methods, classes, imports/exports, namespaces, data, strings, decompile, xrefs_to/from/function_xrefs, disassemble_function, comments, rename, prototypes) remain intact.

## Response Shapes

- Text-first: callers/callees, pcode/high_pcode, search, list types return newline lists for robustness.
- JSON (manual): cfg, type definition; minimal by design to avoid dependencies.
- HTTP errors are surfaced as simple text messages where applicable.

## Not Implemented Yet

- Tags and bookmarks (`/tags`, `/function/{id}/tags`, `/bookmarks`) are out-of-scope in this pass and can be added later, additively.
