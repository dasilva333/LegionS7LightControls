/*      */ package com.lauriewired;
/*      */ import com.sun.net.httpserver.HttpExchange;
/*      */ import com.sun.net.httpserver.HttpServer;
/*      */ import ghidra.app.cmd.function.ApplyFunctionSignatureCmd;
/*      */ import ghidra.app.decompiler.DecompInterface;
/*      */ import ghidra.app.decompiler.DecompileResults;
/*      */ import ghidra.app.services.CodeViewerService;
/*      */ import ghidra.app.services.DataTypeManagerService;
/*      */ import ghidra.app.services.DataTypeQueryService;
/*      */ import ghidra.app.services.ProgramManager;
/*      */ import ghidra.app.util.parser.FunctionSignatureParser;
/*      */ import ghidra.framework.options.ToolOptions;
/*      */ import ghidra.framework.plugintool.PluginInfo;
/*      */ import ghidra.framework.plugintool.PluginTool;
/*      */ import ghidra.framework.plugintool.util.PluginStatus;
/*      */ import ghidra.program.model.address.Address;
/*      */ import ghidra.program.model.data.DataType;
/*      */ import ghidra.program.model.data.DataTypeManager;
/*      */ import ghidra.program.model.data.FunctionDefinitionDataType;
/*      */ import ghidra.program.model.data.PointerDataType;
/*      */ import ghidra.program.model.data.ProgramBasedDataTypeManager;
/*      */ import ghidra.program.model.listing.Data;
/*      */ import ghidra.program.model.listing.DataIterator;
/*      */ import ghidra.program.model.listing.Function;
/*      */ import ghidra.program.model.listing.FunctionManager;
/*      */ import ghidra.program.model.listing.FunctionSignature;
/*      */ import ghidra.program.model.listing.Instruction;
/*      */ import ghidra.program.model.listing.InstructionIterator;
/*      */ import ghidra.program.model.listing.Listing;
/*      */ import ghidra.program.model.listing.Parameter;
/*      */ import ghidra.program.model.listing.Program;
/*      */ import ghidra.program.model.listing.VariableStorage;
/*      */ import ghidra.program.model.mem.MemoryBlock;
/*      */ import ghidra.program.model.pcode.HighFunction;
/*      */ import ghidra.program.model.pcode.HighFunctionDBUtil;
/*      */ import ghidra.program.model.pcode.HighSymbol;
/*      */ import ghidra.program.model.pcode.HighVariable;
/*      */ import ghidra.program.model.pcode.LocalSymbolMap;
/*      */ import ghidra.program.model.symbol.Namespace;
/*      */ import ghidra.program.model.symbol.RefType;
/*      */ import ghidra.program.model.symbol.Reference;
/*      */ import ghidra.program.model.symbol.ReferenceIterator;
/*      */ import ghidra.program.model.symbol.ReferenceManager;
/*      */ import ghidra.program.model.symbol.SourceType;
/*      */ import ghidra.program.model.symbol.Symbol;
/*      */ import ghidra.program.model.symbol.SymbolIterator;
/*      */ import ghidra.program.model.symbol.SymbolTable;
/*      */ import ghidra.program.util.ProgramLocation;
/*      */ import ghidra.util.Msg;
/*      */ import ghidra.util.task.ConsoleTaskMonitor;
/*      */ import ghidra.util.task.TaskMonitor;
/*      */ import java.io.IOException;
/*      */ import java.io.OutputStream;
/*      */ import java.net.InetSocketAddress;
/*      */ import java.net.URLDecoder;
/*      */ import java.nio.charset.StandardCharsets;
/*      */ import java.util.ArrayList;
/*      */ import java.util.Collections;
/*      */ import java.util.HashMap;
/*      */ import java.util.HashSet;
/*      */ import java.util.Iterator;
/*      */ import java.util.List;
/*      */ import java.util.Map;
/*      */ import java.util.Set;
/*      */ import java.util.concurrent.atomic.AtomicBoolean;
/*      */ import javax.swing.SwingUtilities;
/*      */ 
/*      */ @PluginInfo(status = PluginStatus.RELEASED, packageName = "Developer", category = "Analysis", shortDescription = "HTTP server plugin", description = "Starts an embedded HTTP server to expose program data. Port configurable via Tool Options.")
/*      */ public class GhidraMCPPlugin extends Plugin {
/*      */   private HttpServer server;
/*      */   private static final String OPTION_CATEGORY_NAME = "GhidraMCP HTTP Server";
/*      */   private static final String PORT_OPTION_NAME = "Server Port";
/*      */   private static final int DEFAULT_PORT = 8080;
/*      */   
/*      */   public GhidraMCPPlugin(PluginTool tool) {
/*   76 */     super(tool);
/*   77 */     Msg.info(this, "GhidraMCPPlugin loading...");
/*      */ 
/*      */     
/*   80 */     ToolOptions toolOptions = tool.getOptions("GhidraMCP HTTP Server");
/*   81 */     toolOptions.registerOption("Server Port", Integer.valueOf(8080), null, "The network port number the embedded HTTP server will listen on. Requires Ghidra restart or plugin reload to take effect after changing.");
/*      */ 
/*      */ 
/*      */ 
/*      */     
/*      */     try {
/*   87 */       startServer();
/*      */     }
/*   89 */     catch (IOException e) {
/*   90 */       Msg.error(this, "Failed to start HTTP server", e);
/*      */     } 
/*   92 */     Msg.info(this, "GhidraMCPPlugin loaded!");
/*      */   }
/*      */ 
/*      */   
/*      */   private void startServer() throws IOException {
/*   97 */     ToolOptions toolOptions = this.tool.getOptions("GhidraMCP HTTP Server");
/*   98 */     int port = toolOptions.getInt("Server Port", 8080);
/*      */ 
/*      */     
/*  101 */     if (this.server != null) {
/*  102 */       Msg.info(this, "Stopping existing HTTP server before starting new one.");
/*  103 */       this.server.stop(0);
/*  104 */       this.server = null;
/*      */     } 
/*      */     
/*  107 */     this.server = HttpServer.create(new InetSocketAddress(port), 0);
/*      */ 
/*      */     
/*  110 */     this.server.createContext("/methods", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, getAllFunctionNames(offset, limit));
/*      */         });
/*  117 */     this.server.createContext("/classes", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, getAllClassNames(offset, limit));
/*      */         });
/*  124 */     this.server.createContext("/decompile", exchange -> {
/*      */           String name = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
/*      */           
/*      */           sendResponse(exchange, decompileFunctionByName(name));
/*      */         });
/*  129 */     this.server.createContext("/renameFunction", exchange -> {
/*      */           Map<String, String> params = parsePostParams(exchange);
/*      */           
/*      */           String response = renameFunction(params.get("oldName"), params.get("newName")) ? "Renamed successfully" : "Rename failed";
/*      */           
/*      */           sendResponse(exchange, response);
/*      */         });
/*  136 */     this.server.createContext("/renameData", exchange -> {
/*      */           Map<String, String> params = parsePostParams(exchange);
/*      */           
/*      */           renameDataAtAddress(params.get("address"), params.get("newName"));
/*      */           sendResponse(exchange, "Rename data attempted");
/*      */         });
/*  142 */     this.server.createContext("/renameVariable", exchange -> {
/*      */           Map<String, String> params = parsePostParams(exchange);
/*      */           
/*      */           String functionName = params.get("functionName");
/*      */           String oldName = params.get("oldName");
/*      */           String newName = params.get("newName");
/*      */           String result = renameVariableInFunction(functionName, oldName, newName);
/*      */           sendResponse(exchange, result);
/*      */         });
/*  151 */     this.server.createContext("/segments", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, listSegments(offset, limit));
/*      */         });
/*  158 */     this.server.createContext("/imports", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, listImports(offset, limit));
/*      */         });
/*  165 */     this.server.createContext("/exports", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, listExports(offset, limit));
/*      */         });
/*  172 */     this.server.createContext("/namespaces", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, listNamespaces(offset, limit));
/*      */         });
/*  179 */     this.server.createContext("/data", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, listDefinedData(offset, limit));
/*      */         });
/*  186 */     this.server.createContext("/searchFunctions", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           String searchTerm = qparams.get("query");
/*      */           
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, searchFunctionsByName(searchTerm, offset, limit));
/*      */         });
/*  196 */     this.server.createContext("/get_function_by_address", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           String address = qparams.get("address");
/*      */           sendResponse(exchange, getFunctionByAddress(address));
/*      */         });
/*  202 */     this.server.createContext("/get_current_address", exchange -> sendResponse(exchange, getCurrentAddress()));
/*      */ 
/*      */ 
/*      */     
/*  206 */     this.server.createContext("/get_current_function", exchange -> sendResponse(exchange, getCurrentFunction()));
/*      */ 
/*      */ 
/*      */     
/*  210 */     this.server.createContext("/list_functions", exchange -> sendResponse(exchange, listFunctions()));
/*      */ 
/*      */ 
/*      */     
/*  214 */     this.server.createContext("/decompile_function", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           String address = qparams.get("address");
/*      */           sendResponse(exchange, decompileFunctionByAddress(address));
/*      */         });
/*  220 */     this.server.createContext("/disassemble_function", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           String address = qparams.get("address");
/*      */           sendResponse(exchange, disassembleFunction(address));
/*      */         });
/*  226 */     this.server.createContext("/set_decompiler_comment", exchange -> {
/*      */           Map<String, String> params = parsePostParams(exchange);
/*      */           
/*      */           String address = params.get("address");
/*      */           String comment = params.get("comment");
/*      */           boolean success = setDecompilerComment(address, comment);
/*      */           sendResponse(exchange, success ? "Comment set successfully" : "Failed to set comment");
/*      */         });
/*  234 */     this.server.createContext("/set_disassembly_comment", exchange -> {
/*      */           Map<String, String> params = parsePostParams(exchange);
/*      */           
/*      */           String address = params.get("address");
/*      */           String comment = params.get("comment");
/*      */           boolean success = setDisassemblyComment(address, comment);
/*      */           sendResponse(exchange, success ? "Comment set successfully" : "Failed to set comment");
/*      */         });
/*  242 */     this.server.createContext("/rename_function_by_address", exchange -> {
/*      */           Map<String, String> params = parsePostParams(exchange);
/*      */           
/*      */           String functionAddress = params.get("function_address");
/*      */           String newName = params.get("new_name");
/*      */           boolean success = renameFunctionByAddress(functionAddress, newName);
/*      */           sendResponse(exchange, success ? "Function renamed successfully" : "Failed to rename function");
/*      */         });
/*  250 */     this.server.createContext("/set_function_prototype", exchange -> {
/*      */           Map<String, String> params = parsePostParams(exchange);
/*      */           
/*      */           String functionAddress = params.get("function_address");
/*      */           
/*      */           String prototype = params.get("prototype");
/*      */           
/*      */           PrototypeResult result = setFunctionPrototype(functionAddress, prototype);
/*      */           
/*      */           if (result.isSuccess()) {
/*      */             String successMsg = "Function prototype set successfully";
/*      */             
/*      */             if (!result.getErrorMessage().isEmpty()) {
/*      */               successMsg = successMsg + "\n\nWarnings/Debug Info:\n" + result.getErrorMessage();
/*      */             }
/*      */             
/*      */             sendResponse(exchange, successMsg);
/*      */           } else {
/*      */             sendResponse(exchange, "Failed to set function prototype: " + result.getErrorMessage());
/*      */           } 
/*      */         });
/*  271 */     this.server.createContext("/set_local_variable_type", exchange -> {
/*      */           Map<String, String> params = parsePostParams(exchange);
/*      */           
/*      */           String functionAddress = params.get("function_address");
/*      */           
/*      */           String variableName = params.get("variable_name");
/*      */           
/*      */           String newType = params.get("new_type");
/*      */           
/*      */           StringBuilder responseMsg = new StringBuilder();
/*      */           
/*      */           responseMsg.append("Setting variable type: ").append(variableName).append(" to ").append(newType).append(" in function at ").append(functionAddress).append("\n\n");
/*      */           
/*      */           Program program = getCurrentProgram();
/*      */           
/*      */           if (program != null) {
/*      */             ProgramBasedDataTypeManager programBasedDataTypeManager = program.getDataTypeManager();
/*      */             
/*      */             DataType directType = findDataTypeByNameInAllCategories((DataTypeManager)programBasedDataTypeManager, newType);
/*      */             
/*      */             if (directType != null) {
/*      */               responseMsg.append("Found type: ").append(directType.getPathName()).append("\n");
/*      */             } else if (newType.startsWith("P") && newType.length() > 1) {
/*      */               String baseTypeName = newType.substring(1);
/*      */               
/*      */               DataType baseType = findDataTypeByNameInAllCategories((DataTypeManager)programBasedDataTypeManager, baseTypeName);
/*      */               
/*      */               if (baseType != null) {
/*      */                 responseMsg.append("Found base type for pointer: ").append(baseType.getPathName()).append("\n");
/*      */               } else {
/*      */                 responseMsg.append("Base type not found for pointer: ").append(baseTypeName).append("\n");
/*      */               } 
/*      */             } else {
/*      */               responseMsg.append("Type not found directly: ").append(newType).append("\n");
/*      */             } 
/*      */           } 
/*      */           boolean success = setLocalVariableType(functionAddress, variableName, newType);
/*      */           String successMsg = success ? "Variable type set successfully" : "Failed to set variable type";
/*      */           responseMsg.append("\nResult: ").append(successMsg);
/*      */           sendResponse(exchange, responseMsg.toString());
/*      */         });
/*  312 */     this.server.createContext("/xrefs_to", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           String address = qparams.get("address");
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, getXrefsTo(address, offset, limit));
/*      */         });
/*  320 */     this.server.createContext("/xrefs_from", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           String address = qparams.get("address");
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, getXrefsFrom(address, offset, limit));
/*      */         });
/*  328 */     this.server.createContext("/function_xrefs", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           String name = qparams.get("name");
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           sendResponse(exchange, getFunctionXrefs(name, offset, limit));
/*      */         });
/*  336 */     this.server.createContext("/strings", exchange -> {
/*      */           Map<String, String> qparams = parseQueryParams(exchange);
/*      */           
/*      */           int offset = parseIntOrDefault(qparams.get("offset"), 0);
/*      */           int limit = parseIntOrDefault(qparams.get("limit"), 100);
/*      */           String filter = qparams.get("filter");
/*      */           sendResponse(exchange, listDefinedStrings(offset, limit, filter));
/*      */         });
/*  344 */             // v2 REST routes
        this.server.createContext("/function/", exchange -> handleV2Function(exchange));
        this.server.createContext("/patch/", exchange -> handleV2Patch(exchange));
        this.server.createContext("/types/", exchange -> handleV2Types(exchange));
        this.server.createContext("/data/", exchange -> handleV2Data(exchange));
        this.server.createContext("/search/", exchange -> handleV2Search(exchange));
        this.server.createContext("/tags", exchange -> handleV2Tags(exchange));
        this.server.createContext("/bookmarks", exchange -> handleV2Bookmarks(exchange));this.server.setExecutor(null);
/*  345 */     (new Thread(() -> {
/*      */           try {
/*      */             this.server.start();
/*      */             Msg.info(this, "GhidraMCP HTTP server started on port " + port);
/*  349 */           } catch (Exception e) {
/*      */             Msg.error(this, "Failed to start HTTP server on port " + port + ". Port might be in use.", e);
/*      */             this.server = null;
/*      */           } 
/*  353 */         }"GhidraMCP-HTTP-Server")).start();
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String getAllFunctionNames(int offset, int limit) {
/*  361 */     Program program = getCurrentProgram();
/*  362 */     if (program == null) return "No program loaded";
/*      */     
/*  364 */     List<String> names = new ArrayList<>();
/*  365 */     for (Function f : program.getFunctionManager().getFunctions(true)) {
/*  366 */       names.add(f.getName());
/*      */     }
/*  368 */     return paginateList(names, offset, limit);
/*      */   }
/*      */   
/*      */   private String getAllClassNames(int offset, int limit) {
/*  372 */     Program program = getCurrentProgram();
/*  373 */     if (program == null) return "No program loaded";
/*      */     
/*  375 */     Set<String> classNames = new HashSet<>();
/*  376 */     for (Symbol symbol : program.getSymbolTable().getAllSymbols(true)) {
/*  377 */       Namespace ns = symbol.getParentNamespace();
/*  378 */       if (ns != null && !ns.isGlobal()) {
/*  379 */         classNames.add(ns.getName());
/*      */       }
/*      */     } 
/*      */     
/*  383 */     List<String> sorted = new ArrayList<>(classNames);
/*  384 */     Collections.sort(sorted);
/*  385 */     return paginateList(sorted, offset, limit);
/*      */   }
/*      */   
/*      */   private String listSegments(int offset, int limit) {
/*  389 */     Program program = getCurrentProgram();
/*  390 */     if (program == null) return "No program loaded";
/*      */     
/*  392 */     List<String> lines = new ArrayList<>();
/*  393 */     for (MemoryBlock block : program.getMemory().getBlocks()) {
/*  394 */       lines.add(String.format("%s: %s - %s", new Object[] { block.getName(), block.getStart(), block.getEnd() }));
/*      */     } 
/*  396 */     return paginateList(lines, offset, limit);
/*      */   }
/*      */   
/*      */   private String listImports(int offset, int limit) {
/*  400 */     Program program = getCurrentProgram();
/*  401 */     if (program == null) return "No program loaded";
/*      */     
/*  403 */     List<String> lines = new ArrayList<>();
/*  404 */     for (Symbol symbol : program.getSymbolTable().getExternalSymbols()) {
/*  405 */       lines.add(symbol.getName() + " -> " + symbol.getAddress());
/*      */     }
/*  407 */     return paginateList(lines, offset, limit);
/*      */   }
/*      */   
/*      */   private String listExports(int offset, int limit) {
/*  411 */     Program program = getCurrentProgram();
/*  412 */     if (program == null) return "No program loaded";
/*      */     
/*  414 */     SymbolTable table = program.getSymbolTable();
/*  415 */     SymbolIterator it = table.getAllSymbols(true);
/*      */     
/*  417 */     List<String> lines = new ArrayList<>();
/*  418 */     while (it.hasNext()) {
/*  419 */       Symbol s = it.next();
/*      */       
/*  421 */       if (s.isExternalEntryPoint()) {
/*  422 */         lines.add(s.getName() + " -> " + s.getAddress());
/*      */       }
/*      */     } 
/*  425 */     return paginateList(lines, offset, limit);
/*      */   }
/*      */   
/*      */   private String listNamespaces(int offset, int limit) {
/*  429 */     Program program = getCurrentProgram();
/*  430 */     if (program == null) return "No program loaded";
/*      */     
/*  432 */     Set<String> namespaces = new HashSet<>();
/*  433 */     for (Symbol symbol : program.getSymbolTable().getAllSymbols(true)) {
/*  434 */       Namespace ns = symbol.getParentNamespace();
/*  435 */       if (ns != null && !(ns instanceof ghidra.program.model.address.GlobalNamespace)) {
/*  436 */         namespaces.add(ns.getName());
/*      */       }
/*      */     } 
/*  439 */     List<String> sorted = new ArrayList<>(namespaces);
/*  440 */     Collections.sort(sorted);
/*  441 */     return paginateList(sorted, offset, limit);
/*      */   }
/*      */   
/*      */   private String listDefinedData(int offset, int limit) {
/*  445 */     Program program = getCurrentProgram();
/*  446 */     if (program == null) return "No program loaded";
/*      */     
/*  448 */     List<String> lines = new ArrayList<>();
/*  449 */     for (MemoryBlock block : program.getMemory().getBlocks()) {
/*  450 */       DataIterator it = program.getListing().getDefinedData(block.getStart(), true);
/*  451 */       while (it.hasNext()) {
/*  452 */         Data data = it.next();
/*  453 */         if (block.contains(data.getAddress())) {
/*  454 */           String label = (data.getLabel() != null) ? data.getLabel() : "(unnamed)";
/*  455 */           String valRepr = data.getDefaultValueRepresentation();
/*  456 */           lines.add(String.format("%s: %s = %s", new Object[] { data
/*  457 */                   .getAddress(), 
/*  458 */                   escapeNonAscii(label), 
/*  459 */                   escapeNonAscii(valRepr) }));
/*      */         } 
/*      */       } 
/*      */     } 
/*      */     
/*  464 */     return paginateList(lines, offset, limit);
/*      */   }
/*      */   
/*      */   private String searchFunctionsByName(String searchTerm, int offset, int limit) {
/*  468 */     Program program = getCurrentProgram();
/*  469 */     if (program == null) return "No program loaded"; 
/*  470 */     if (searchTerm == null || searchTerm.isEmpty()) return "Search term is required";
/*      */     
/*  472 */     List<String> matches = new ArrayList<>();
/*  473 */     for (Function func : program.getFunctionManager().getFunctions(true)) {
/*  474 */       String name = func.getName();
/*      */       
/*  476 */       if (name.toLowerCase().contains(searchTerm.toLowerCase())) {
/*  477 */         matches.add(String.format("%s @ %s", new Object[] { name, func.getEntryPoint() }));
/*      */       }
/*      */     } 
/*      */     
/*  481 */     Collections.sort(matches);
/*      */     
/*  483 */     if (matches.isEmpty()) {
/*  484 */       return "No functions matching '" + searchTerm + "'";
/*      */     }
/*  486 */     return paginateList(matches, offset, limit);
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String decompileFunctionByName(String name) {
/*  494 */     Program program = getCurrentProgram();
/*  495 */     if (program == null) return "No program loaded"; 
/*  496 */     DecompInterface decomp = new DecompInterface();
/*  497 */     decomp.openProgram(program);
/*  498 */     for (Function func : program.getFunctionManager().getFunctions(true)) {
/*  499 */       if (func.getName().equals(name)) {
/*      */         
/*  501 */         DecompileResults result = decomp.decompileFunction(func, 30, (TaskMonitor)new ConsoleTaskMonitor());
/*  502 */         if (result != null && result.decompileCompleted()) {
/*  503 */           return result.getDecompiledFunction().getC();
/*      */         }
/*  505 */         return "Decompilation failed";
/*      */       } 
/*      */     } 
/*      */     
/*  509 */     return "Function not found";
/*      */   }
/*      */   
/*      */   private boolean renameFunction(String oldName, String newName) {
/*  513 */     Program program = getCurrentProgram();
/*  514 */     if (program == null) return false;
/*      */     
/*  516 */     AtomicBoolean successFlag = new AtomicBoolean(false);
/*      */     try {
/*  518 */       SwingUtilities.invokeAndWait(() -> {
/*      */             int tx = program.startTransaction("Rename function via HTTP");
/*      */             
/*      */             try {
/*      */               for (Function func : program.getFunctionManager().getFunctions(true)) {
/*      */                 if (func.getName().equals(oldName)) {
/*      */                   func.setName(newName, SourceType.USER_DEFINED);
/*      */                   successFlag.set(true);
/*      */                   break;
/*      */                 } 
/*      */               } 
/*  529 */             } catch (Exception e) {
/*      */               
/*      */               Msg.error(this, "Error renaming function", e);
/*      */             } finally {
/*      */               
/*      */               successFlag.set(program.endTransaction(tx, successFlag.get()));
/*      */             } 
/*      */           });
/*  537 */     } catch (InterruptedException|java.lang.reflect.InvocationTargetException e) {
/*  538 */       Msg.error(this, "Failed to execute rename on Swing thread", e);
/*      */     } 
/*  540 */     return successFlag.get();
/*      */   }
/*      */   
/*      */   private void renameDataAtAddress(String addressStr, String newName) {
/*  544 */     Program program = getCurrentProgram();
/*  545 */     if (program == null)
/*      */       return; 
/*      */     try {
/*  548 */       SwingUtilities.invokeAndWait(() -> {
/*      */             int tx = program.startTransaction("Rename data");
/*      */             
/*      */             try {
/*      */               Address addr = program.getAddressFactory().getAddress(addressStr);
/*      */               Listing listing = program.getListing();
/*      */               Data data = listing.getDefinedDataAt(addr);
/*      */               if (data != null) {
/*      */                 SymbolTable symTable = program.getSymbolTable();
/*      */                 Symbol symbol = symTable.getPrimarySymbol(addr);
/*      */                 if (symbol != null) {
/*      */                   symbol.setName(newName, SourceType.USER_DEFINED);
/*      */                 } else {
/*      */                   symTable.createLabel(addr, newName, SourceType.USER_DEFINED);
/*      */                 } 
/*      */               } 
/*  564 */             } catch (Exception e) {
/*      */               
/*      */               Msg.error(this, "Rename data error", e);
/*      */             } finally {
/*      */               
/*      */               program.endTransaction(tx, true);
/*      */             } 
/*      */           });
/*  572 */     } catch (InterruptedException|java.lang.reflect.InvocationTargetException e) {
/*  573 */       Msg.error(this, "Failed to execute rename data on Swing thread", e);
/*      */     } 
/*      */   }
/*      */   
/*      */   private String renameVariableInFunction(String functionName, String oldVarName, String newVarName) {
/*  578 */     Program program = getCurrentProgram();
/*  579 */     if (program == null) return "No program loaded";
/*      */     
/*  581 */     DecompInterface decomp = new DecompInterface();
/*  582 */     decomp.openProgram(program);
/*      */     
/*  584 */     Function func = null;
/*  585 */     for (Function f : program.getFunctionManager().getFunctions(true)) {
/*  586 */       if (f.getName().equals(functionName)) {
/*  587 */         func = f;
/*      */         
/*      */         break;
/*      */       } 
/*      */     } 
/*  592 */     if (func == null) {
/*  593 */       return "Function not found";
/*      */     }
/*      */     
/*  596 */     DecompileResults result = decomp.decompileFunction(func, 30, (TaskMonitor)new ConsoleTaskMonitor());
/*  597 */     if (result == null || !result.decompileCompleted()) {
/*  598 */       return "Decompilation failed";
/*      */     }
/*      */     
/*  601 */     HighFunction highFunction = result.getHighFunction();
/*  602 */     if (highFunction == null) {
/*  603 */       return "Decompilation failed (no high function)";
/*      */     }
/*      */     
/*  606 */     LocalSymbolMap localSymbolMap = highFunction.getLocalSymbolMap();
/*  607 */     if (localSymbolMap == null) {
/*  608 */       return "Decompilation failed (no local symbol map)";
/*      */     }
/*      */     
/*  611 */     HighSymbol highSymbol = null;
/*  612 */     Iterator<HighSymbol> symbols = localSymbolMap.getSymbols();
/*  613 */     while (symbols.hasNext()) {
/*  614 */       HighSymbol symbol = symbols.next();
/*  615 */       String symbolName = symbol.getName();
/*      */       
/*  617 */       if (symbolName.equals(oldVarName)) {
/*  618 */         highSymbol = symbol;
/*      */       }
/*  620 */       if (symbolName.equals(newVarName)) {
/*  621 */         return "Error: A variable with name '" + newVarName + "' already exists in this function";
/*      */       }
/*      */     } 
/*      */     
/*  625 */     if (highSymbol == null) {
/*  626 */       return "Variable not found";
/*      */     }
/*      */     
/*  629 */     boolean commitRequired = checkFullCommit(highSymbol, highFunction);
/*      */     
/*  631 */     HighSymbol finalHighSymbol = highSymbol;
/*  632 */     Function finalFunction = func;
/*  633 */     AtomicBoolean successFlag = new AtomicBoolean(false);
/*      */     
/*      */     try {
/*  636 */       SwingUtilities.invokeAndWait(() -> {
/*      */             int tx = program.startTransaction("Rename variable");
/*      */ 
/*      */ 
/*      */             
/*      */             try {
/*      */               if (commitRequired) {
/*      */                 HighFunctionDBUtil.commitParamsToDatabase(highFunction, false, HighFunctionDBUtil.ReturnCommitOption.NO_COMMIT, finalFunction.getSignatureSource());
/*      */               }
/*      */ 
/*      */               
/*      */               HighFunctionDBUtil.updateDBVariable(finalHighSymbol, newVarName, null, SourceType.USER_DEFINED);
/*      */ 
/*      */               
/*      */               successFlag.set(true);
/*  651 */             } catch (Exception e) {
/*      */               
/*      */               Msg.error(this, "Failed to rename variable", e);
/*      */             } finally {
/*      */               successFlag.set(program.endTransaction(tx, true));
/*      */             } 
/*      */           });
/*  658 */     } catch (InterruptedException|java.lang.reflect.InvocationTargetException e) {
/*  659 */       String errorMsg = "Failed to execute rename on Swing thread: " + e.getMessage();
/*  660 */       Msg.error(this, errorMsg, e);
/*  661 */       return errorMsg;
/*      */     } 
/*  663 */     return successFlag.get() ? "Variable renamed" : "Failed to rename variable";
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   protected static boolean checkFullCommit(HighSymbol highSymbol, HighFunction hfunction) {
/*  676 */     if (highSymbol != null && !highSymbol.isParameter()) {
/*  677 */       return false;
/*      */     }
/*  679 */     Function function = hfunction.getFunction();
/*  680 */     Parameter[] parameters = function.getParameters();
/*  681 */     LocalSymbolMap localSymbolMap = hfunction.getLocalSymbolMap();
/*  682 */     int numParams = localSymbolMap.getNumParams();
/*  683 */     if (numParams != parameters.length) {
/*  684 */       return true;
/*      */     }
/*      */     
/*  687 */     for (int i = 0; i < numParams; i++) {
/*  688 */       HighSymbol param = localSymbolMap.getParamSymbol(i);
/*  689 */       if (param.getCategoryIndex() != i) {
/*  690 */         return true;
/*      */       }
/*  692 */       VariableStorage storage = param.getStorage();
/*      */       
/*  694 */       if (0 != storage.compareTo(parameters[i].getVariableStorage())) {
/*  695 */         return true;
/*      */       }
/*      */     } 
/*      */     
/*  699 */     return false;
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String getFunctionByAddress(String addressStr) {
/*  710 */     Program program = getCurrentProgram();
/*  711 */     if (program == null) return "No program loaded"; 
/*  712 */     if (addressStr == null || addressStr.isEmpty()) return "Address is required";
/*      */     
/*      */     try {
/*  715 */       Address addr = program.getAddressFactory().getAddress(addressStr);
/*  716 */       Function func = program.getFunctionManager().getFunctionAt(addr);
/*      */       
/*  718 */       if (func == null) return "No function found at address " + addressStr;
/*      */       
/*  720 */       return String.format("Function: %s at %s\nSignature: %s\nEntry: %s\nBody: %s - %s", new Object[] { func
/*  721 */             .getName(), func
/*  722 */             .getEntryPoint(), func
/*  723 */             .getSignature(), func
/*  724 */             .getEntryPoint(), func
/*  725 */             .getBody().getMinAddress(), func
/*  726 */             .getBody().getMaxAddress() });
/*  727 */     } catch (Exception e) {
/*  728 */       return "Error getting function: " + e.getMessage();
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String getCurrentAddress() {
/*  736 */     CodeViewerService service = (CodeViewerService)this.tool.getService(CodeViewerService.class);
/*  737 */     if (service == null) return "Code viewer service not available";
/*      */     
/*  739 */     ProgramLocation location = service.getCurrentLocation();
/*  740 */     return (location != null) ? location.getAddress().toString() : "No current location";
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String getCurrentFunction() {
/*  747 */     CodeViewerService service = (CodeViewerService)this.tool.getService(CodeViewerService.class);
/*  748 */     if (service == null) return "Code viewer service not available";
/*      */     
/*  750 */     ProgramLocation location = service.getCurrentLocation();
/*  751 */     if (location == null) return "No current location";
/*      */     
/*  753 */     Program program = getCurrentProgram();
/*  754 */     if (program == null) return "No program loaded";
/*      */     
/*  756 */     Function func = program.getFunctionManager().getFunctionContaining(location.getAddress());
/*  757 */     if (func == null) return "No function at current location: " + location.getAddress();
/*      */     
/*  759 */     return String.format("Function: %s at %s\nSignature: %s", new Object[] { func
/*  760 */           .getName(), func
/*  761 */           .getEntryPoint(), func
/*  762 */           .getSignature() });
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String listFunctions() {
/*  769 */     Program program = getCurrentProgram();
/*  770 */     if (program == null) return "No program loaded";
/*      */     
/*  772 */     StringBuilder result = new StringBuilder();
/*  773 */     for (Function func : program.getFunctionManager().getFunctions(true)) {
/*  774 */       result.append(String.format("%s at %s\n", new Object[] { func
/*  775 */               .getName(), func
/*  776 */               .getEntryPoint() }));
/*      */     } 
/*      */     
/*  779 */     return result.toString();
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private Function getFunctionForAddress(Program program, Address addr) {
/*  787 */     Function func = program.getFunctionManager().getFunctionAt(addr);
/*  788 */     if (func == null) {
/*  789 */       func = program.getFunctionManager().getFunctionContaining(addr);
/*      */     }
/*  791 */     return func;
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String decompileFunctionByAddress(String addressStr) {
/*  798 */     Program program = getCurrentProgram();
/*  799 */     if (program == null) return "No program loaded"; 
/*  800 */     if (addressStr == null || addressStr.isEmpty()) return "Address is required";
/*      */     
/*      */     try {
/*  803 */       Address addr = program.getAddressFactory().getAddress(addressStr);
/*  804 */       Function func = getFunctionForAddress(program, addr);
/*  805 */       if (func == null) return "No function found at or containing address " + addressStr;
/*      */       
/*  807 */       DecompInterface decomp = new DecompInterface();
/*  808 */       decomp.openProgram(program);
/*  809 */       DecompileResults result = decomp.decompileFunction(func, 30, (TaskMonitor)new ConsoleTaskMonitor());
/*      */       
/*  811 */       return (result != null && result.decompileCompleted()) ? 
/*  812 */         result.getDecompiledFunction().getC() : 
/*  813 */         "Decompilation failed";
/*  814 */     } catch (Exception e) {
/*  815 */       return "Error decompiling function: " + e.getMessage();
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String disassembleFunction(String addressStr) {
/*  823 */     Program program = getCurrentProgram();
/*  824 */     if (program == null) return "No program loaded"; 
/*  825 */     if (addressStr == null || addressStr.isEmpty()) return "Address is required";
/*      */     
/*      */     try {
/*  828 */       Address addr = program.getAddressFactory().getAddress(addressStr);
/*  829 */       Function func = getFunctionForAddress(program, addr);
/*  830 */       if (func == null) return "No function found at or containing address " + addressStr;
/*      */       
/*  832 */       StringBuilder result = new StringBuilder();
/*  833 */       Listing listing = program.getListing();
/*  834 */       Address start = func.getEntryPoint();
/*  835 */       Address end = func.getBody().getMaxAddress();
/*      */       
/*  837 */       InstructionIterator instructions = listing.getInstructions(start, true);
/*  838 */       while (instructions.hasNext()) {
/*  839 */         Instruction instr = instructions.next();
/*  840 */         if (instr.getAddress().compareTo(end) > 0) {
/*      */           break;
/*      */         }
/*  843 */         String comment = listing.getComment(0, instr.getAddress());
/*  844 */         comment = (comment != null) ? ("; " + comment) : "";
/*      */         
/*  846 */         result.append(String.format("%s: %s %s\n", new Object[] { instr
/*  847 */                 .getAddress(), instr
/*  848 */                 .toString(), comment }));
/*      */       } 
/*      */ 
/*      */       
/*  852 */       return result.toString();
/*  853 */     } catch (Exception e) {
/*  854 */       return "Error disassembling function: " + e.getMessage();
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private boolean setCommentAtAddress(String addressStr, String comment, int commentType, String transactionName) {
/*  862 */     Program program = getCurrentProgram();
/*  863 */     if (program == null) return false; 
/*  864 */     if (addressStr == null || addressStr.isEmpty() || comment == null) return false;
/*      */     
/*  866 */     AtomicBoolean success = new AtomicBoolean(false);
/*      */     
/*      */     try {
/*  869 */       SwingUtilities.invokeAndWait(() -> {
/*      */             int tx = program.startTransaction(transactionName);
/*      */             try {
/*      */               Address addr = program.getAddressFactory().getAddress(addressStr);
/*      */               program.getListing().setComment(addr, commentType, comment);
/*      */               success.set(true);
/*  875 */             } catch (Exception e) {
/*      */               Msg.error(this, "Error setting " + transactionName.toLowerCase(), e);
/*      */             } finally {
/*      */               success.set(program.endTransaction(tx, success.get()));
/*      */             } 
/*      */           });
/*  881 */     } catch (InterruptedException|java.lang.reflect.InvocationTargetException e) {
/*  882 */       Msg.error(this, "Failed to execute " + transactionName.toLowerCase() + " on Swing thread", e);
/*      */     } 
/*      */     
/*  885 */     return success.get();
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private boolean setDecompilerComment(String addressStr, String comment) {
/*  892 */     return setCommentAtAddress(addressStr, comment, 1, "Set decompiler comment");
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private boolean setDisassemblyComment(String addressStr, String comment) {
/*  899 */     return setCommentAtAddress(addressStr, comment, 0, "Set disassembly comment");
/*      */   }
/*      */ 
/*      */   
/*      */   private static class PrototypeResult
/*      */   {
/*      */     private final boolean success;
/*      */     
/*      */     private final String errorMessage;
/*      */     
/*      */     public PrototypeResult(boolean success, String errorMessage) {
/*  910 */       this.success = success;
/*  911 */       this.errorMessage = errorMessage;
/*      */     }
/*      */     
/*      */     public boolean isSuccess() {
/*  915 */       return this.success;
/*      */     }
/*      */     
/*      */     public String getErrorMessage() {
/*  919 */       return this.errorMessage;
/*      */     }
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private boolean renameFunctionByAddress(String functionAddrStr, String newName) {
/*  927 */     Program program = getCurrentProgram();
/*  928 */     if (program == null) return false; 
/*  929 */     if (functionAddrStr == null || functionAddrStr.isEmpty() || newName == null || newName
/*  930 */       .isEmpty()) {
/*  931 */       return false;
/*      */     }
/*      */     
/*  934 */     AtomicBoolean success = new AtomicBoolean(false);
/*      */     
/*      */     try {
/*  937 */       SwingUtilities.invokeAndWait(() -> performFunctionRename(program, functionAddrStr, newName, success));
/*      */     
/*      */     }
/*  940 */     catch (InterruptedException|java.lang.reflect.InvocationTargetException e) {
/*  941 */       Msg.error(this, "Failed to execute rename function on Swing thread", e);
/*      */     } 
/*      */     
/*  944 */     return success.get();
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private void performFunctionRename(Program program, String functionAddrStr, String newName, AtomicBoolean success) {
/*  951 */     int tx = program.startTransaction("Rename function by address");
/*      */     try {
/*  953 */       Address addr = program.getAddressFactory().getAddress(functionAddrStr);
/*  954 */       Function func = getFunctionForAddress(program, addr);
/*      */       
/*  956 */       if (func == null) {
/*  957 */         Msg.error(this, "Could not find function at address: " + functionAddrStr);
/*      */         
/*      */         return;
/*      */       } 
/*  961 */       func.setName(newName, SourceType.USER_DEFINED);
/*  962 */       success.set(true);
/*  963 */     } catch (Exception e) {
/*  964 */       Msg.error(this, "Error renaming function by address", e);
/*      */     } finally {
/*  966 */       program.endTransaction(tx, success.get());
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private PrototypeResult setFunctionPrototype(String functionAddrStr, String prototype) {
/*  975 */     Program program = getCurrentProgram();
/*  976 */     if (program == null) return new PrototypeResult(false, "No program loaded"); 
/*  977 */     if (functionAddrStr == null || functionAddrStr.isEmpty()) {
/*  978 */       return new PrototypeResult(false, "Function address is required");
/*      */     }
/*  980 */     if (prototype == null || prototype.isEmpty()) {
/*  981 */       return new PrototypeResult(false, "Function prototype is required");
/*      */     }
/*      */     
/*  984 */     StringBuilder errorMessage = new StringBuilder();
/*  985 */     AtomicBoolean success = new AtomicBoolean(false);
/*      */     
/*      */     try {
/*  988 */       SwingUtilities.invokeAndWait(() -> applyFunctionPrototype(program, functionAddrStr, prototype, success, errorMessage));
/*      */     }
/*  990 */     catch (InterruptedException|java.lang.reflect.InvocationTargetException e) {
/*  991 */       String msg = "Failed to set function prototype on Swing thread: " + e.getMessage();
/*  992 */       errorMessage.append(msg);
/*  993 */       Msg.error(this, msg, e);
/*      */     } 
/*      */     
/*  996 */     return new PrototypeResult(success.get(), errorMessage.toString());
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private void applyFunctionPrototype(Program program, String functionAddrStr, String prototype, AtomicBoolean success, StringBuilder errorMessage) {
/*      */     try {
/* 1006 */       Address addr = program.getAddressFactory().getAddress(functionAddrStr);
/* 1007 */       Function func = getFunctionForAddress(program, addr);
/*      */       
/* 1009 */       if (func == null) {
/* 1010 */         String msg = "Could not find function at address: " + functionAddrStr;
/* 1011 */         errorMessage.append(msg);
/* 1012 */         Msg.error(this, msg);
/*      */         
/*      */         return;
/*      */       } 
/* 1016 */       Msg.info(this, "Setting prototype for function " + func.getName() + ": " + prototype);
/*      */ 
/*      */       
/* 1019 */       addPrototypeComment(program, func, prototype);
/*      */ 
/*      */       
/* 1022 */       parseFunctionSignatureAndApply(program, addr, prototype, success, errorMessage);
/*      */     }
/* 1024 */     catch (Exception e) {
/* 1025 */       String msg = "Error setting function prototype: " + e.getMessage();
/* 1026 */       errorMessage.append(msg);
/* 1027 */       Msg.error(this, msg, e);
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private void addPrototypeComment(Program program, Function func, String prototype) {
/* 1035 */     int txComment = program.startTransaction("Add prototype comment");
/*      */     try {
/* 1037 */       program.getListing().setComment(func
/* 1038 */           .getEntryPoint(), 3, "Setting prototype: " + prototype);
/*      */     
/*      */     }
/*      */     finally {
/*      */       
/* 1043 */       program.endTransaction(txComment, true);
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private void parseFunctionSignatureAndApply(Program program, Address addr, String prototype, AtomicBoolean success, StringBuilder errorMessage) {
/* 1053 */     int txProto = program.startTransaction("Set function prototype");
/*      */     
/*      */     try {
/* 1056 */       ProgramBasedDataTypeManager programBasedDataTypeManager = program.getDataTypeManager();
/*      */ 
/*      */ 
/*      */       
/* 1060 */       DataTypeManagerService dtms = (DataTypeManagerService)this.tool.getService(DataTypeManagerService.class);
/*      */ 
/*      */       
/* 1063 */       FunctionSignatureParser parser = new FunctionSignatureParser((DataTypeManager)programBasedDataTypeManager, (DataTypeQueryService)dtms);
/*      */ 
/*      */ 
/*      */       
/* 1067 */       FunctionDefinitionDataType sig = parser.parse(null, prototype);
/*      */       
/* 1069 */       if (sig == null) {
/* 1070 */         String msg = "Failed to parse function prototype";
/* 1071 */         errorMessage.append(msg);
/* 1072 */         Msg.error(this, msg);
/*      */         
/*      */         return;
/*      */       } 
/*      */       
/* 1077 */       ApplyFunctionSignatureCmd cmd = new ApplyFunctionSignatureCmd(addr, (FunctionSignature)sig, SourceType.USER_DEFINED);
/*      */ 
/*      */ 
/*      */ 
/*      */       
/* 1082 */       boolean cmdResult = cmd.applyTo(program, (TaskMonitor)new ConsoleTaskMonitor());
/*      */       
/* 1084 */       if (cmdResult) {
/* 1085 */         success.set(true);
/* 1086 */         Msg.info(this, "Successfully applied function signature");
/*      */       } else {
/* 1088 */         String msg = "Command failed: " + cmd.getStatusMsg();
/* 1089 */         errorMessage.append(msg);
/* 1090 */         Msg.error(this, msg);
/*      */       } 
/* 1092 */     } catch (Exception e) {
/* 1093 */       String msg = "Error applying function signature: " + e.getMessage();
/* 1094 */       errorMessage.append(msg);
/* 1095 */       Msg.error(this, msg, e);
/*      */     } finally {
/* 1097 */       program.endTransaction(txProto, success.get());
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private boolean setLocalVariableType(String functionAddrStr, String variableName, String newType) {
/* 1106 */     Program program = getCurrentProgram();
/* 1107 */     if (program == null) return false; 
/* 1108 */     if (functionAddrStr == null || functionAddrStr.isEmpty() || variableName == null || variableName
/* 1109 */       .isEmpty() || newType == null || newType
/* 1110 */       .isEmpty()) {
/* 1111 */       return false;
/*      */     }
/*      */     
/* 1114 */     AtomicBoolean success = new AtomicBoolean(false);
/*      */     
/*      */     try {
/* 1117 */       SwingUtilities.invokeAndWait(() -> applyVariableType(program, functionAddrStr, variableName, newType, success));
/*      */     }
/* 1119 */     catch (InterruptedException|java.lang.reflect.InvocationTargetException e) {
/* 1120 */       Msg.error(this, "Failed to execute set variable type on Swing thread", e);
/*      */     } 
/*      */     
/* 1123 */     return success.get();
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private void applyVariableType(Program program, String functionAddrStr, String variableName, String newType, AtomicBoolean success) {
/*      */     try {
/* 1133 */       Address addr = program.getAddressFactory().getAddress(functionAddrStr);
/* 1134 */       Function func = getFunctionForAddress(program, addr);
/*      */       
/* 1136 */       if (func == null) {
/* 1137 */         Msg.error(this, "Could not find function at address: " + functionAddrStr);
/*      */         
/*      */         return;
/*      */       } 
/* 1141 */       DecompileResults results = decompileFunction(func, program);
/* 1142 */       if (results == null || !results.decompileCompleted()) {
/*      */         return;
/*      */       }
/*      */       
/* 1146 */       HighFunction highFunction = results.getHighFunction();
/* 1147 */       if (highFunction == null) {
/* 1148 */         Msg.error(this, "No high function available");
/*      */         
/*      */         return;
/*      */       } 
/*      */       
/* 1153 */       HighSymbol symbol = findSymbolByName(highFunction, variableName);
/* 1154 */       if (symbol == null) {
/* 1155 */         Msg.error(this, "Could not find variable '" + variableName + "' in decompiled function");
/*      */         
/*      */         return;
/*      */       } 
/*      */       
/* 1160 */       HighVariable highVar = symbol.getHighVariable();
/* 1161 */       if (highVar == null) {
/* 1162 */         Msg.error(this, "No HighVariable found for symbol: " + variableName);
/*      */         
/*      */         return;
/*      */       } 
/* 1166 */       Msg.info(this, "Found high variable for: " + variableName + " with current type " + highVar
/* 1167 */           .getDataType().getName());
/*      */ 
/*      */       
/* 1170 */       ProgramBasedDataTypeManager programBasedDataTypeManager = program.getDataTypeManager();
/* 1171 */       DataType dataType = resolveDataType((DataTypeManager)programBasedDataTypeManager, newType);
/*      */       
/* 1173 */       if (dataType == null) {
/* 1174 */         Msg.error(this, "Could not resolve data type: " + newType);
/*      */         
/*      */         return;
/*      */       } 
/* 1178 */       Msg.info(this, "Using data type: " + dataType.getName() + " for variable " + variableName);
/*      */ 
/*      */       
/* 1181 */       updateVariableType(program, symbol, dataType, success);
/*      */     }
/* 1183 */     catch (Exception e) {
/* 1184 */       Msg.error(this, "Error setting variable type: " + e.getMessage());
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private HighSymbol findSymbolByName(HighFunction highFunction, String variableName) {
/* 1192 */     Iterator<HighSymbol> symbols = highFunction.getLocalSymbolMap().getSymbols();
/* 1193 */     while (symbols.hasNext()) {
/* 1194 */       HighSymbol s = symbols.next();
/* 1195 */       if (s.getName().equals(variableName)) {
/* 1196 */         return s;
/*      */       }
/*      */     } 
/* 1199 */     return null;
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private DecompileResults decompileFunction(Function func, Program program) {
/* 1207 */     DecompInterface decomp = new DecompInterface();
/* 1208 */     decomp.openProgram(program);
/* 1209 */     decomp.setSimplificationStyle("decompile");
/*      */ 
/*      */     
/* 1212 */     DecompileResults results = decomp.decompileFunction(func, 60, (TaskMonitor)new ConsoleTaskMonitor());
/*      */     
/* 1214 */     if (!results.decompileCompleted()) {
/* 1215 */       Msg.error(this, "Could not decompile function: " + results.getErrorMessage());
/* 1216 */       return null;
/*      */     } 
/*      */     
/* 1219 */     return results;
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private void updateVariableType(Program program, HighSymbol symbol, DataType dataType, AtomicBoolean success) {
/* 1226 */     int tx = program.startTransaction("Set variable type");
/*      */     
/*      */     try {
/* 1229 */       HighFunctionDBUtil.updateDBVariable(symbol, symbol
/*      */           
/* 1231 */           .getName(), dataType, SourceType.USER_DEFINED);
/*      */ 
/*      */ 
/*      */ 
/*      */       
/* 1236 */       success.set(true);
/* 1237 */       Msg.info(this, "Successfully set variable type using HighFunctionDBUtil");
/* 1238 */     } catch (Exception e) {
/* 1239 */       Msg.error(this, "Error setting variable type: " + e.getMessage());
/*      */     } finally {
/* 1241 */       program.endTransaction(tx, success.get());
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String getXrefsTo(String addressStr, int offset, int limit) {
/* 1249 */     Program program = getCurrentProgram();
/* 1250 */     if (program == null) return "No program loaded"; 
/* 1251 */     if (addressStr == null || addressStr.isEmpty()) return "Address is required";
/*      */     
/*      */     try {
/* 1254 */       Address addr = program.getAddressFactory().getAddress(addressStr);
/* 1255 */       ReferenceManager refManager = program.getReferenceManager();
/*      */       
/* 1257 */       ReferenceIterator refIter = refManager.getReferencesTo(addr);
/*      */       
/* 1259 */       List<String> refs = new ArrayList<>();
/* 1260 */       while (refIter.hasNext()) {
/* 1261 */         Reference ref = refIter.next();
/* 1262 */         Address fromAddr = ref.getFromAddress();
/* 1263 */         RefType refType = ref.getReferenceType();
/*      */         
/* 1265 */         Function fromFunc = program.getFunctionManager().getFunctionContaining(fromAddr);
/* 1266 */         String funcInfo = (fromFunc != null) ? (" in " + fromFunc.getName()) : "";
/*      */         
/* 1268 */         refs.add(String.format("From %s%s [%s]", new Object[] { fromAddr, funcInfo, refType.getName() }));
/*      */       } 
/*      */       
/* 1271 */       return paginateList(refs, offset, limit);
/* 1272 */     } catch (Exception e) {
/* 1273 */       return "Error getting references to address: " + e.getMessage();
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String getXrefsFrom(String addressStr, int offset, int limit) {
/* 1281 */     Program program = getCurrentProgram();
/* 1282 */     if (program == null) return "No program loaded"; 
/* 1283 */     if (addressStr == null || addressStr.isEmpty()) return "Address is required";
/*      */     
/*      */     try {
/* 1286 */       Address addr = program.getAddressFactory().getAddress(addressStr);
/* 1287 */       ReferenceManager refManager = program.getReferenceManager();
/*      */       
/* 1289 */       Reference[] references = refManager.getReferencesFrom(addr);
/*      */       
/* 1291 */       List<String> refs = new ArrayList<>();
/* 1292 */       for (Reference ref : references) {
/* 1293 */         Address toAddr = ref.getToAddress();
/* 1294 */         RefType refType = ref.getReferenceType();
/*      */         
/* 1296 */         String targetInfo = "";
/* 1297 */         Function toFunc = program.getFunctionManager().getFunctionAt(toAddr);
/* 1298 */         if (toFunc != null) {
/* 1299 */           targetInfo = " to function " + toFunc.getName();
/*      */         } else {
/* 1301 */           Data data = program.getListing().getDataAt(toAddr);
/* 1302 */           if (data != null) {
/* 1303 */             targetInfo = " to data " + ((data.getLabel() != null) ? data.getLabel() : data.getPathName());
/*      */           }
/*      */         } 
/*      */         
/* 1307 */         refs.add(String.format("To %s%s [%s]", new Object[] { toAddr, targetInfo, refType.getName() }));
/*      */       } 
/*      */       
/* 1310 */       return paginateList(refs, offset, limit);
/* 1311 */     } catch (Exception e) {
/* 1312 */       return "Error getting references from address: " + e.getMessage();
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String getFunctionXrefs(String functionName, int offset, int limit) {
/* 1320 */     Program program = getCurrentProgram();
/* 1321 */     if (program == null) return "No program loaded"; 
/* 1322 */     if (functionName == null || functionName.isEmpty()) return "Function name is required";
/*      */     
/*      */     try {
/* 1325 */       List<String> refs = new ArrayList<>();
/* 1326 */       FunctionManager funcManager = program.getFunctionManager();
/* 1327 */       for (Function function : funcManager.getFunctions(true)) {
/* 1328 */         if (function.getName().equals(functionName)) {
/* 1329 */           Address entryPoint = function.getEntryPoint();
/* 1330 */           ReferenceIterator refIter = program.getReferenceManager().getReferencesTo(entryPoint);
/*      */           
/* 1332 */           while (refIter.hasNext()) {
/* 1333 */             Reference ref = refIter.next();
/* 1334 */             Address fromAddr = ref.getFromAddress();
/* 1335 */             RefType refType = ref.getReferenceType();
/*      */             
/* 1337 */             Function fromFunc = funcManager.getFunctionContaining(fromAddr);
/* 1338 */             String funcInfo = (fromFunc != null) ? (" in " + fromFunc.getName()) : "";
/*      */             
/* 1340 */             refs.add(String.format("From %s%s [%s]", new Object[] { fromAddr, funcInfo, refType.getName() }));
/*      */           } 
/*      */         } 
/*      */       } 
/*      */       
/* 1345 */       if (refs.isEmpty()) {
/* 1346 */         return "No references found to function: " + functionName;
/*      */       }
/*      */       
/* 1349 */       return paginateList(refs, offset, limit);
/* 1350 */     } catch (Exception e) {
/* 1351 */       return "Error getting function references: " + e.getMessage();
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String listDefinedStrings(int offset, int limit, String filter) {
/* 1359 */     Program program = getCurrentProgram();
/* 1360 */     if (program == null) return "No program loaded";
/*      */     
/* 1362 */     List<String> lines = new ArrayList<>();
/* 1363 */     DataIterator dataIt = program.getListing().getDefinedData(true);
/*      */     
/* 1365 */     while (dataIt.hasNext()) {
/* 1366 */       Data data = dataIt.next();
/*      */       
/* 1368 */       if (data != null && isStringData(data)) {
/* 1369 */         String value = (data.getValue() != null) ? data.getValue().toString() : "";
/*      */         
/* 1371 */         if (filter == null || value.toLowerCase().contains(filter.toLowerCase())) {
/* 1372 */           String escapedValue = escapeString(value);
/* 1373 */           lines.add(String.format("%s: \"%s\"", new Object[] { data.getAddress(), escapedValue }));
/*      */         } 
/*      */       } 
/*      */     } 
/*      */     
/* 1378 */     return paginateList(lines, offset, limit);
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private boolean isStringData(Data data) {
/* 1385 */     if (data == null) return false;
/*      */     
/* 1387 */     DataType dt = data.getDataType();
/* 1388 */     String typeName = dt.getName().toLowerCase();
/* 1389 */     return (typeName.contains("string") || typeName.contains("char") || typeName.equals("unicode"));
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String escapeString(String input) {
/* 1396 */     if (input == null) return "";
/*      */     
/* 1398 */     StringBuilder sb = new StringBuilder();
/* 1399 */     for (int i = 0; i < input.length(); i++) {
/* 1400 */       char c = input.charAt(i);
/* 1401 */       if (c >= ' ' && c < '') {
/* 1402 */         sb.append(c);
/* 1403 */       } else if (c == '\n') {
/* 1404 */         sb.append("\\n");
/* 1405 */       } else if (c == '\r') {
/* 1406 */         sb.append("\\r");
/* 1407 */       } else if (c == '\t') {
/* 1408 */         sb.append("\\t");
/*      */       } else {
/* 1410 */         sb.append(String.format("\\x%02x", new Object[] { Integer.valueOf(c & 0xFF) }));
/*      */       } 
/*      */     } 
/* 1413 */     return sb.toString();
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private DataType resolveDataType(DataTypeManager dtm, String typeName) {
/* 1424 */     DataType dataType = findDataTypeByNameInAllCategories(dtm, typeName);
/* 1425 */     if (dataType != null) {
/* 1426 */       Msg.info(this, "Found exact data type match: " + dataType.getPathName());
/* 1427 */       return dataType;
/*      */     } 
/*      */ 
/*      */     
/* 1431 */     if (typeName.startsWith("P") && typeName.length() > 1) {
/* 1432 */       String baseTypeName = typeName.substring(1);
/*      */ 
/*      */       
/* 1435 */       if (baseTypeName.equals("VOID")) {
/* 1436 */         return (DataType)new PointerDataType(dtm.getDataType("/void"));
/*      */       }
/*      */ 
/*      */       
/* 1440 */       DataType baseType = findDataTypeByNameInAllCategories(dtm, baseTypeName);
/* 1441 */       if (baseType != null) {
/* 1442 */         return (DataType)new PointerDataType(baseType);
/*      */       }
/*      */       
/* 1445 */       Msg.warn(this, "Base type not found for " + typeName + ", defaulting to void*");
/* 1446 */       return (DataType)new PointerDataType(dtm.getDataType("/void"));
/*      */     } 
/*      */ 
/*      */     
/* 1450 */     switch (typeName.toLowerCase()) {
/*      */       case "int":
/*      */       case "long":
/* 1453 */         return dtm.getDataType("/int");
/*      */       case "uint":
/*      */       case "unsigned int":
/*      */       case "unsigned long":
/*      */       case "dword":
/* 1458 */         return dtm.getDataType("/uint");
/*      */       case "short":
/* 1460 */         return dtm.getDataType("/short");
/*      */       case "ushort":
/*      */       case "unsigned short":
/*      */       case "word":
/* 1464 */         return dtm.getDataType("/ushort");
/*      */       case "char":
/*      */       case "byte":
/* 1467 */         return dtm.getDataType("/char");
/*      */       case "uchar":
/*      */       case "unsigned char":
/* 1470 */         return dtm.getDataType("/uchar");
/*      */       case "longlong":
/*      */       case "__int64":
/* 1473 */         return dtm.getDataType("/longlong");
/*      */       case "ulonglong":
/*      */       case "unsigned __int64":
/* 1476 */         return dtm.getDataType("/ulonglong");
/*      */       case "bool":
/*      */       case "boolean":
/* 1479 */         return dtm.getDataType("/bool");
/*      */       case "void":
/* 1481 */         return dtm.getDataType("/void");
/*      */     } 
/*      */     
/* 1484 */     DataType directType = dtm.getDataType("/" + typeName);
/* 1485 */     if (directType != null) {
/* 1486 */       return directType;
/*      */     }
/*      */ 
/*      */     
/* 1490 */     Msg.warn(this, "Unknown type: " + typeName + ", defaulting to int");
/* 1491 */     return dtm.getDataType("/int");
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private DataType findDataTypeByNameInAllCategories(DataTypeManager dtm, String typeName) {
/* 1501 */     DataType result = searchByNameInAllCategories(dtm, typeName);
/* 1502 */     if (result != null) {
/* 1503 */       return result;
/*      */     }
/*      */ 
/*      */     
/* 1507 */     return searchByNameInAllCategories(dtm, typeName.toLowerCase());
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private DataType searchByNameInAllCategories(DataTypeManager dtm, String name) {
/* 1515 */     Iterator<DataType> allTypes = dtm.getAllDataTypes();
/* 1516 */     while (allTypes.hasNext()) {
/* 1517 */       DataType dt = allTypes.next();
/*      */       
/* 1519 */       if (dt.getName().equals(name)) {
/* 1520 */         return dt;
/*      */       }
/*      */       
/* 1523 */       if (dt.getName().equalsIgnoreCase(name)) {
/* 1524 */         return dt;
/*      */       }
/*      */     } 
/* 1527 */     return null;
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private Map<String, String> parseQueryParams(HttpExchange exchange) {
/* 1538 */     Map<String, String> result = new HashMap<>();
/* 1539 */     String query = exchange.getRequestURI().getQuery();
/* 1540 */     if (query != null) {
/* 1541 */       String[] pairs = query.split("&");
/* 1542 */       for (String p : pairs) {
/* 1543 */         String[] kv = p.split("=");
/* 1544 */         if (kv.length == 2) {
/*      */           
/*      */           try {
/* 1547 */             String key = URLDecoder.decode(kv[0], StandardCharsets.UTF_8);
/* 1548 */             String value = URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
/* 1549 */             result.put(key, value);
/* 1550 */           } catch (Exception e) {
/* 1551 */             Msg.error(this, "Error decoding URL parameter", e);
/*      */           } 
/*      */         }
/*      */       } 
/*      */     } 
/* 1556 */     return result;
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private Map<String, String> parsePostParams(HttpExchange exchange) throws IOException {
/* 1563 */     byte[] body = exchange.getRequestBody().readAllBytes();
/* 1564 */     String bodyStr = new String(body, StandardCharsets.UTF_8);
/* 1565 */     Map<String, String> params = new HashMap<>();
/* 1566 */     for (String pair : bodyStr.split("&")) {
/* 1567 */       String[] kv = pair.split("=");
/* 1568 */       if (kv.length == 2) {
/*      */         
/*      */         try {
/* 1571 */           String key = URLDecoder.decode(kv[0], StandardCharsets.UTF_8);
/* 1572 */           String value = URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
/* 1573 */           params.put(key, value);
/* 1574 */         } catch (Exception e) {
/* 1575 */           Msg.error(this, "Error decoding URL parameter", e);
/*      */         } 
/*      */       }
/*      */     } 
/* 1579 */     return params;
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String paginateList(List<String> items, int offset, int limit) {
/* 1586 */     int start = Math.max(0, offset);
/* 1587 */     int end = Math.min(items.size(), offset + limit);
/*      */     
/* 1589 */     if (start >= items.size()) {
/* 1590 */       return "";
/*      */     }
/* 1592 */     List<String> sub = items.subList(start, end);
/* 1593 */     return String.join("\n", (Iterable)sub);
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private int parseIntOrDefault(String val, int defaultValue) {
/* 1600 */     if (val == null) return defaultValue; 
/*      */     try {
/* 1602 */       return Integer.parseInt(val);
/*      */     }
/* 1604 */     catch (NumberFormatException e) {
/* 1605 */       return defaultValue;
/*      */     } 
/*      */   }
/*      */ 
/*      */ 
/*      */ 
/*      */   
/*      */   private String escapeNonAscii(String input) {
/* 1613 */     if (input == null) return ""; 
/* 1614 */     StringBuilder sb = new StringBuilder();
/* 1615 */     for (char c : input.toCharArray()) {
/* 1616 */       if (c >= ' ' && c < '') {
/* 1617 */         sb.append(c);
/*      */       } else {
/*      */         
/* 1620 */         sb.append("\\x");
/* 1621 */         sb.append(Integer.toHexString(c & 0xFF));
/*      */       } 
/*      */     } 
/* 1624 */     return sb.toString();
/*      */   }
/*      */   
/*      */   public Program getCurrentProgram() {
/* 1628 */     ProgramManager pm = (ProgramManager)this.tool.getService(ProgramManager.class);
/* 1629 */     return (pm != null) ? pm.getCurrentProgram() : null;
/*      */   }
/*      */   
/*      */   private void sendResponse(HttpExchange exchange, String response) throws IOException {
/* 1633 */     byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
/* 1634 */     exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
/* 1635 */     exchange.sendResponseHeaders(200, bytes.length);
/* 1636 */     OutputStream os = exchange.getResponseBody(); 
/* 1637 */     try { os.write(bytes);
/* 1638 */       if (os != null) os.close();  }
/*      */     catch (Throwable throwable) { if (os != null)
/*      */         try { os.close(); }
/*      */         catch (Throwable throwable1) { throwable.addSuppressed(throwable1); }
/*      */           throw throwable; }
/* 1643 */      } public void dispose() { if (this.server != null) {
/* 1644 */       Msg.info(this, "Stopping GhidraMCP HTTP server...");
/* 1645 */       this.server.stop(1);
/* 1646 */       this.server = null;
/* 1647 */       Msg.info(this, "GhidraMCP HTTP server stopped.");
/*      */     } 
/* 1649 */     super.dispose(); }
/*      */ 
/*      */ }


/* Location:              C:\Users\h4rdc\keyboard-led-project\GhidraMCP-release-1-4\GhidraMCP-1-4\GhidraMCP\lib\GhidraMCP\!\com\lauriewired\GhidraMCPPlugin.class
 * Java compiler version: 8 (52.0)
 * JD-Core Version:       1.1.3
 */