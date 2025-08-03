#!/usr/bin/env python3

"""
Simple Undetected Chrome MCP Server
Handles container environment gracefully
"""

import json
import sys
import traceback

def send_response(response):
    """Send JSON-RPC response"""
    print(json.dumps(response), flush=True)

def main():
    """Main MCP server loop"""
    
    # Send initial capabilities
    send_response({
        "jsonrpc": "2.0",
        "result": {
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "undetected-chrome-mcp",
                "version": "1.0.0"
            }
        }
    })
    
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            try:
                request = json.loads(line)
                method = request.get("method")
                params = request.get("params", {})
                request_id = request.get("id")
                
                if method == "tools/list":
                    response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "tools": [
                                {
                                    "name": "undetected_navigate",
                                    "description": "Navigate to URL with maximum stealth (requires display)",
                                    "inputSchema": {
                                        "type": "object",
                                        "properties": {
                                            "url": {"type": "string", "description": "URL to navigate to"},
                                            "headless": {"type": "boolean", "default": True, "description": "Run in headless mode"}
                                        },
                                        "required": ["url"]
                                    }
                                },
                                {
                                    "name": "undetected_status",
                                    "description": "Check undetected Chrome driver status",
                                    "inputSchema": {"type": "object", "properties": {}}
                                }
                            ]
                        }
                    }
                    
                elif method == "tools/call":
                    tool_name = params.get("name")
                    args = params.get("arguments", {})
                    
                    if tool_name == "undetected_status":
                        try:
                            import undetected_chromedriver as uc
                            status_text = f"✅ Undetected Chrome v{uc.__version__} available\\n⚠️ Chrome binary not configured for container environment\\n💡 Best used in environments with display/GUI support"
                        except ImportError:
                            status_text = "❌ Undetected Chrome driver not installed"
                        
                        response = {
                            "jsonrpc": "2.0",
                            "id": request_id,
                            "result": {
                                "content": [{"type": "text", "text": status_text}]
                            }
                        }
                    
                    elif tool_name == "undetected_navigate":
                        # This would fail in container but provide helpful message
                        response = {
                            "jsonrpc": "2.0", 
                            "id": request_id,
                            "result": {
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "⚠️ Undetected Chrome requires a display environment.\\nIn this container, use the 'selenium' MCP server instead which has manual stealth features.\\nFor maximum stealth, use undetected Chrome in a desktop environment."
                                    }
                                ]
                            }
                        }
                    
                    else:
                        response = {
                            "jsonrpc": "2.0",
                            "id": request_id,
                            "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
                        }
                
                else:
                    response = {
                        "jsonrpc": "2.0", 
                        "id": request_id,
                        "error": {"code": -32601, "message": f"Unknown method: {method}"}
                    }
                    
                send_response(response)
                
            except json.JSONDecodeError:
                continue
            except Exception as e:
                error_response = {
                    "jsonrpc": "2.0",
                    "id": request.get("id") if 'request' in locals() else None,
                    "error": {"code": -32603, "message": f"Internal error: {str(e)}"}  
                }
                send_response(error_response)
                
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)

if __name__ == "__main__":
    main()