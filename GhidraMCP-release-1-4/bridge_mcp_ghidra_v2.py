# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests>=2,<3",
#     "mcp>=1.2.0,<2",
# ]
# ///

import sys
import requests
import argparse
import logging
import json
from urllib.parse import urljoin

from mcp.server.fastmcp import FastMCP

DEFAULT_GHIDRA_SERVER = "http://127.0.0.1:8080/"

logger = logging.getLogger(__name__)

mcp = FastMCP("ghidra-mcp")

# Initialize ghidra_server_url with default value
ghidra_server_url = DEFAULT_GHIDRA_SERVER

def safe_request(method: str, endpoint: str, params: dict = None, data: dict | str = None) -> list | str | dict:
    """
    Perform a robust request (GET, POST, DELETE) to the Ghidra server.
    Handles JSON and text data, with improved error handling.
    """
    url = urljoin(ghidra_server_url, endpoint)
    try:
        headers = {}
        request_data = None
        
        if data is not None:
            if isinstance(data, dict):
                headers['Content-Type'] = 'application/json'
                request_data = json.dumps(data)
            else:
                headers['Content-Type'] = 'text/plain'
                request_data = data.encode("utf-8")

        response = requests.request(method.upper(), url, params=params, data=request_data, headers=headers, timeout=15)
        response.encoding = 'utf-8'
        
        if response.ok:
            try:
                # Prioritize JSON for structured data
                return response.json()
            except json.JSONDecodeError:
                # Fallback for simple text or line-based responses
                text_response = response.text.strip()
                if not text_response:
                    return ["Success (No content returned)"]
                return text_response.splitlines()
        else:
            return [f"Error {response.status_code}: {response.text.strip()}"]
    except requests.exceptions.RequestException as e:
        return [f"Request failed: {str(e)}"]

def safe_get(endpoint: str, params: dict = None) -> list | str | dict:
    return safe_request('GET', endpoint, params=params)

def safe_post(endpoint: str, data: dict | str) -> list | str | dict:
    return safe_request('POST', endpoint, data=data)
    
def safe_delete(endpoint: str, data: dict) -> list | str | dict:
    return safe_request('DELETE', endpoint, data=data)

# =============================================================================
# Original Core Functionality (Preserved)
# =============================================================================

@mcp.tool()
def list_methods(offset: int = 0, limit: int = 100) -> list:
    """
    List all function names in the program with pagination.
    """
    return safe_get("methods", {"offset": offset, "limit": limit})

@mcp.tool()
def list_classes(offset: int = 0, limit: int = 100) -> list:
    """
    List all namespace/class names in the program with pagination.
    """
    return safe_get("classes", {"offset": offset, "limit": limit})

@mcp.tool()
def decompile_function(name: str) -> str:
    """
    Decompile a specific function by name and return the decompiled C code.
    """
    return "\n".join(safe_post("decompile", name))

@mcp.tool()
def rename_function(old_name: str, new_name: str) -> str:
    """
    Rename a function by its current name to a new user-defined name.
    """
    return "\n".join(safe_post("renameFunction", {"oldName": old_name, "newName": new_name}))

@mcp.tool()
def rename_data(address: str, new_name: str) -> str:
    """
    Rename a data label at the specified address.
    """
    return "\n".join(safe_post("renameData", {"address": address, "newName": new_name}))

@mcp.tool()
def list_segments(offset: int = 0, limit: int = 100) -> list:
    """
    List all memory segments in the program with pagination.
    """
    return safe_get("segments", {"offset": offset, "limit": limit})

@mcp.tool()
def list_imports(offset: int = 0, limit: int = 100) -> list:
    """
    List imported symbols in the program with pagination.
    """
    return safe_get("imports", {"offset": offset, "limit": limit})

@mcp.tool()
def list_exports(offset: int = 0, limit: int = 100) -> list:
    """
    List exported functions/symbols with pagination.
    """
    return safe_get("exports", {"offset": offset, "limit": limit})

@mcp.tool()
def list_namespaces(offset: int = 0, limit: int = 100) -> list:
    """
    List all non-global namespaces in the program with pagination.
    """
    return safe_get("namespaces", {"offset": offset, "limit": limit})

@mcp.tool()
def list_data_items(offset: int = 0, limit: int = 100) -> list:
    """
    List defined data labels and their values with pagination.
    """
    return safe_get("data", {"offset": offset, "limit": limit})

@mcp.tool()
def search_functions_by_name(query: str, offset: int = 0, limit: int = 100) -> list:
    """
    Search for functions whose name contains the given substring.
    """
    if not query:
        return ["Error: query string is required"]
    return safe_get("searchFunctions", {"query": query, "offset": offset, "limit": limit})

@mcp.tool()
def rename_variable(function_name: str, old_name: str, new_name: str) -> str:
    """
    Rename a local variable within a function.
    """
    return "\n".join(safe_post("renameVariable", {
        "functionName": function_name,
        "oldName": old_name,
        "newName": new_name
    }))

@mcp.tool()
def get_function_by_address(address: str) -> str:
    """
    Get a function by its address.
    """
    return "\n".join(safe_get("get_function_by_address", {"address": address}))

@mcp.tool()
def get_current_address() -> str:
    """
    Get the address currently selected by the user.
    """
    return "\n".join(safe_get("get_current_address"))

@mcp.tool()
def get_current_function() -> str:
    """
    Get the function currently selected by the user.
    """
    return "\n".join(safe_get("get_current_function"))

@mcp.tool()
def list_functions() -> list:
    """
    List all functions in the database.
    """
    return safe_get("list_functions")

@mcp.tool()
def decompile_function_by_address(address: str) -> str:
    """
    Decompile a function at the given address.
    """
    return "\n".join(safe_get("decompile_function", {"address": address}))

@mcp.tool()
def disassemble_function(address: str) -> list:
    """
    Get assembly code (address: instruction; comment) for a function.
    """
    return safe_get("disassemble_function", {"address": address})

@mcp.tool()
def set_decompiler_comment(address: str, comment: str) -> str:
    """
    Set a comment for a given address in the function pseudocode.
    """
    return "\n".join(safe_post("set_decompiler_comment", {"address": address, "comment": comment}))

@mcp.tool()
def set_disassembly_comment(address: str, comment: str) -> str:
    """
    Set a comment for a given address in the function disassembly.
    """
    return "\n".join(safe_post("set_disassembly_comment", {"address": address, "comment": comment}))

@mcp.tool()
def rename_function_by_address(function_address: str, new_name: str) -> str:
    """
    Rename a function by its address.
    """
    return "\n".join(safe_post("rename_function_by_address", {"function_address": function_address, "new_name": new_name}))

@mcp.tool()
def set_function_prototype(function_address: str, prototype: str) -> str:
    """
    Set a function's prototype.
    """
    return "\n".join(safe_post("set_function_prototype", {"function_address": function_address, "prototype": prototype}))

@mcp.tool()
def set_local_variable_type(function_address: str, variable_name: str, new_type: str) -> str:
    """
    Set a local variable's type.
    """
    return "\n".join(safe_post("set_local_variable_type", {"function_address": function_address, "variable_name": variable_name, "new_type": new_type}))

@mcp.tool()
def get_xrefs_to(address: str, offset: int = 0, limit: int = 100) -> list:
    """
    Get all references to the specified address (xref to).
    
    Args:
        address: Target address in hex format (e.g. "0x1400010a0")
        offset: Pagination offset (default: 0)
        limit: Maximum number of references to return (default: 100)
        
    Returns:
        List of references to the specified address
    """
    return safe_get("xrefs_to", {"address": address, "offset": offset, "limit": limit})

@mcp.tool()
def get_xrefs_from(address: str, offset: int = 0, limit: int = 100) -> list:
    """
    Get all references from the specified address (xref from).
    
    Args:
        address: Source address in hex format (e.g. "0x1400010a0")
        offset: Pagination offset (default: 0)
        limit: Maximum number of references to return (default: 100)
        
    Returns:
        List of references from the specified address
    """
    return safe_get("xrefs_from", {"address": address, "offset": offset, "limit": limit})

@mcp.tool()
def get_function_xrefs(name: str, offset: int = 0, limit: int = 100) -> list:
    """
    Get all references to the specified function by name.
    
    Args:
        name: Function name to search for
        offset: Pagination offset (default: 0)
        limit: Maximum number of references to return (default: 100)
        
    Returns:
        List of references to the specified function
    """
    return safe_get("function_xrefs", {"name": name, "offset": offset, "limit": limit})

@mcp.tool()
def list_strings(offset: int = 0, limit: int = 2000, filter: str = None) -> list:
    """
    List all defined strings in the program with their addresses.
    
    Args:
        offset: Pagination offset (default: 0)
        limit: Maximum number of strings to return (default: 2000)
        filter: Optional filter to match within string content
        
    Returns:
        List of strings with their addresses
    """
    params = {"offset": offset, "limit": limit}
    if filter:
        params["filter"] = filter
    return safe_get("strings", params)

# =============================================================================
# NEW: Deeper Code and Data Relationships
# =============================================================================

@mcp.tool()
def get_function_callers(function_identifier: str) -> list:
    """
    Get a list of functions that call the specified function (callers).
    The identifier can be a function name or an address (e.g., 'main' or '0x1400010a0').
    """
    return safe_get(f"function/{function_identifier}/callers")

@mcp.tool()
def get_function_callees(function_identifier: str) -> list:
    """
    Get a list of functions called by the specified function (callees).
    The identifier can be a function name or an address (e.g., 'main' or '0x1400010a0').
    """
    return safe_get(f"function/{function_identifier}/callees")

@mcp.tool()
def list_types(offset: int = 0, limit: int = 100) -> list:
    """
    List all user-defined data types (structs, enums, etc.) in the program.
    """
    return safe_get("types", {"offset": offset, "limit": limit})

@mcp.tool()
def get_type_definition(type_name: str) -> dict:
    """
    Get the definition of a specific data type (e.g., fields, sizes, offsets).
    Returns a JSON object describing the struct or type.
    Note: pass the bare type name (e.g., 'IMAGE_NT_HEADERS64'), not the full path like '/PE/...'.
    """
    return safe_get(f"type/{type_name}")

@mcp.tool()
def find_constant_references(value: int, offset: int = 0, limit: int = 100) -> list:
    """
    Find all instructions that reference a specific constant scalar value.
    """
    return safe_get(f"search/constant/{value}", {"offset": offset, "limit": limit})

@mcp.tool()
def find_string_references(content: str, case_sensitive: bool = False, offset: int = 0, limit: int = 100) -> list:
    """
    Find all code references to a specific string literal.
    """
    params = {"content": content, "case_sensitive": case_sensitive, "offset": offset, "limit": limit}
    return safe_get("search/string_xrefs", params)

# =============================================================================
# NEW: Advanced Program Flow Analysis
# =============================================================================

@mcp.tool()
def get_function_cfg(function_identifier: str) -> dict:
    """
    Get the Control Flow Graph (CFG) for a function.
    Returns a JSON object with 'nodes' (basic blocks with addresses) and 'edges' (connections between nodes).
    """
    return safe_get(f"function/{function_identifier}/cfg")
@mcp.tool()
def disassemble_range(function_identifier: str, start: str, end: str) -> list:
    """
    Get disassembly slice for a function between absolute addresses [start, end].
    - function_identifier: name or address (e.g., 'main' or '0x1400010a0')
    - start/end: absolute addresses (e.g., '0x18003cf7e')
    Returns newline-delimited lines: 'address: instruction'.
    """
    params = {"start": start, "end": end}
    return safe_get(f"function/{function_identifier}/disasm", params)

# Disabled (server does not implement tags/bookmarks yet). Leaving these commented out to avoid exposing
# tools that will return 404/Not Implemented. Re-enable when server routes are added.
# @mcp.tool()
# def tag_function(function_identifier: str, tag: str) -> list | str | dict:
#     """
#     Apply a descriptive tag to a function for organization (e.g., "VULNERABLE", "CRYPTO").
#     Server route not implemented yet.
#     """
#     return ["Not implemented on server"]
#
# @mcp.tool()
# def untag_function(function_identifier: str, tag: str) -> list | str | dict:
#     """
#     Remove a tag from a specified function.
#     Server route not implemented yet.
#     """
#     return ["Not implemented on server"]
#
# @mcp.tool()
# def list_tags() -> dict:
#     """
#     List all tags and the functions associated with them.
#     Server route not implemented yet.
#     """
#     return {"error": "Not implemented on server"}
#
# @mcp.tool()
# def create_bookmark(address: str, comment: str, category: str = "Analysis") -> list | str | dict:
#     """
#     Create a bookmark at a specific address with a comment and category.
#     Server route not implemented yet.
#     """
#     return ["Not implemented on server"]

# =============================================================================
# NEW: Program Modification and Patching
# =============================================================================

@mcp.tool()
def patch_instruction(address: str, instruction_bytes: str) -> list | str | dict:
    """
    Patch the instruction at a given address with new bytes.
    Provide bytes as a hex string (e.g., "909090" for three NOPs).
    IMPORTANT: Destructive operation. Always get explicit user permission before calling.
    The server applies changes to the open program; this does not touch the on-disk DLL unless saved/exported,
    but still requires caution.
    """
    return safe_post(f"patch/instruction/{address}", {"bytes": instruction_bytes})

# Disabled (server route not implemented in this iteration). Re-enable when available.
# @mcp.tool()
# def create_struct(name: str, definition_json: str) -> list | str | dict:
#     """
#     Create a new struct data type.
#     The definition should be a JSON string describing the struct fields,
#     e.g., '[{"name": "field1", "type": "dword"}, {"name": "field2", "type": "pointer"}]'
#     """
#     try:
#         # Validate that the definition is valid JSON before sending
#         definition = json.loads(definition_json)
#         return safe_post("types/struct", {"name": name, "definition": definition})
#     except json.JSONDecodeError as e:
#         return [f"Invalid JSON for struct definition: {e}"]

@mcp.tool()
def apply_data_type(address: str, type_name: str) -> list | str | dict:
    """
    Apply a data type (like a struct or primitive, e.g., 'MyStruct', 'dword') to a memory address.
    IMPORTANT: Write operation. Always get explicit user permission before calling.
    """
    return safe_post(f"data/{address}/type", {"type_name": type_name})

# =============================================================================
# NEW: Decompiler and P-Code Analysis
# =============================================================================

@mcp.tool()
def get_function_pcode(function_identifier: str) -> list:
    """
    Get the raw P-Code operations for a function.
    P-Code is Ghidra's architecture-agnostic intermediate representation.
    Note: very small/thunk functions may return empty pcode; try high_pcode or a different function.
    """
    return safe_get(f"function/{function_identifier}/pcode")

@mcp.tool()
def get_function_high_pcode(function_identifier: str) -> list:
    """
    Get the 'High P-Code' for a function.
    This is a more structured, C-like version of P-Code, ideal for automated analysis.
    """
    return safe_get(f"function/{function_identifier}/high_pcode")
@mcp.tool()
def read_bytes(address: str, length: int = 64) -> str | list:
    """
    Read raw bytes at an absolute address.
    Args:
      address: '0x...' absolute address
      length: number of bytes to read (default 64, max 4096)
    Returns: hex string (lowercase, no spaces).
    """
    return "\n".join(safe_get(f"bytes/{address}", {"len": length}))

# =============================================================================
# Main Execution Block
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="MCP server for Ghidra")
    parser.add_argument("--ghidra-server", type=str, default=DEFAULT_GHIDRA_SERVER,
                        help=f"Ghidra server URL, default: {DEFAULT_GHIDRA_SERVER}")
    parser.add_argument("--mcp-host", type=str, default="127.0.0.1",
                        help="Host to run MCP server on (only used for sse), default: 127.0.0.1")
    parser.add_argument("--mcp-port", type=int,
                        help="Port to run MCP server on (only used for sse), default: 8081")
    parser.add_argument("--transport", type=str, default="stdio", choices=["stdio", "sse"],
                        help="Transport protocol for MCP, default: stdio")
    args = parser.parse_args()
    
    # Use the global variable to ensure it's properly updated
    global ghidra_server_url
    if args.ghidra_server:
        ghidra_server_url = args.ghidra_server
    
    if args.transport == "sse":
        try:
            # Set up logging
            log_level = logging.INFO
            logging.basicConfig(level=log_level)
            logging.getLogger().setLevel(log_level)

            # Configure MCP settings
            mcp.settings.log_level = "INFO"
            if args.mcp_host:
                mcp.settings.host = args.mcp_host
            else:
                mcp.settings.host = "127.0.0.1"

            if args.mcp_port:
                mcp.settings.port = args.mcp_port
            else:
                mcp.settings.port = 8081

            logger.info(f"Connecting to Ghidra server at {ghidra_server_url}")
            logger.info(f"Starting MCP server on http://{mcp.settings.host}:{mcp.settings.port}/sse")
            logger.info(f"Using transport: {args.transport}")

            mcp.run(transport="sse")
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
    else:
        mcp.run()
        
if __name__ == "__main__":
    main()

