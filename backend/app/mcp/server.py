"""
MCP Server for Altitude Recall Monitor
======================================
Model Context Protocol server providing tools for AI agents
to interact with the recall monitoring system.
"""

import json
import asyncio
from typing import Any
from datetime import datetime
import sys

# MCP server implementation using stdio transport
# This can be run standalone or imported by an MCP host


class MCPServer:
    """MCP Server implementing the Model Context Protocol."""
    
    def __init__(self):
        self.tools = self._define_tools()
        self.resources = self._define_resources()
    
    def _define_tools(self) -> list:
        """Define available MCP tools."""
        return [
            {
                "name": "search_recalls",
                "description": "Search the recall database by text query. Returns matching recalls with risk classification.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query (product name, model number, or keyword)"
                        },
                        "risk_level": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"],
                            "description": "Optional filter by risk level"
                        },
                        "limit": {
                            "type": "integer",
                            "default": 10,
                            "description": "Maximum number of results to return"
                        }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "get_recall_details",
                "description": "Get full details of a specific recall including products, hazards, and images.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to look up"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "classify_risk",
                "description": "Classify the risk level of a product recall based on severity factors.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "units_sold": {
                            "type": "integer",
                            "description": "Number of units sold/distributed"
                        },
                        "injuries": {
                            "type": "integer",
                            "description": "Number of reported injuries"
                        },
                        "deaths": {
                            "type": "integer",
                            "description": "Number of reported deaths"
                        },
                        "incidents": {
                            "type": "integer",
                            "description": "Number of reported incidents"
                        },
                        "hazard_descriptions": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of hazard descriptions"
                        }
                    }
                }
            },
            {
                "name": "search_marketplaces",
                "description": "Search enabled marketplaces for products matching a recall. Returns listings with match scores.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to search for"
                        },
                        "marketplace_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of specific marketplaces to search (empty = search all enabled)"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "get_marketplace_listings",
                "description": "Get listings found for a recall on marketplaces.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID"
                        },
                        "min_match_score": {
                            "type": "number",
                            "description": "Minimum match score filter (0-1)"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "list_marketplaces",
                "description": "List all configured marketplaces and their status.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "enabled_only": {
                            "type": "boolean",
                            "default": False,
                            "description": "Only return enabled marketplaces"
                        }
                    }
                }
            },
            {
                "name": "toggle_marketplace",
                "description": "Enable or disable a marketplace for monitoring.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "marketplace_id": {
                            "type": "string",
                            "description": "The marketplace ID to toggle"
                        },
                        "enabled": {
                            "type": "boolean",
                            "description": "Whether to enable or disable"
                        }
                    },
                    "required": ["marketplace_id", "enabled"]
                }
            },
            {
                "name": "get_risk_summary",
                "description": "Get summary counts of recalls by risk level.",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_latest_recalls",
                "description": "Get the most recent recalls, optionally filtered by risk level.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "default": 10,
                            "description": "Number of recalls to return"
                        },
                        "risk_level": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"],
                            "description": "Optional filter by risk level"
                        }
                    }
                }
            },
            {
                "name": "build_search_query",
                "description": "Generate optimized search queries from recall data for marketplace searches.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to build query for"
                        }
                    },
                    "required": ["recall_id"]
                }
            }
        ]
    
    def _define_resources(self) -> list:
        """Define available MCP resources."""
        return [
            {
                "uri": "altitude://recalls/all",
                "name": "All Recalls",
                "description": "Access to all recalls in the database",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://recalls/high-risk",
                "name": "High Risk Recalls",
                "description": "Access to high-risk recalls only",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://marketplaces/enabled",
                "name": "Enabled Marketplaces",
                "description": "List of currently enabled marketplaces",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://config/agent",
                "name": "Agent Configuration",
                "description": "Current agent settings and tool configurations",
                "mimeType": "application/json"
            }
        ]
    
    async def handle_initialize(self, params: dict) -> dict:
        """Handle MCP initialize request."""
        return {
            "protocolVersion": "2024-11-05",
            "serverInfo": {
                "name": "altitude-recall-monitor",
                "version": "1.0.0"
            },
            "capabilities": {
                "tools": {"listChanged": True},
                "resources": {"subscribe": True, "listChanged": True}
            }
        }
    
    async def handle_tools_list(self) -> dict:
        """Handle tools/list request."""
        return {"tools": self.tools}
    
    async def handle_resources_list(self) -> dict:
        """Handle resources/list request."""
        return {"resources": self.resources}
    
    async def handle_tool_call(self, name: str, arguments: dict) -> dict:
        """Handle a tool call request."""
        # Import here to avoid circular imports
        from app.services import database as db
        from app.skills.risk_classifier import classify_risk as do_classify_risk
        from app.skills.query_builder import build_search_query, build_search_variants
        
        try:
            if name == "search_recalls":
                recalls = await db.search_recalls(
                    arguments.get("query", ""),
                    arguments.get("risk_level")
                )
                limit = arguments.get("limit", 10)
                results = [
                    {
                        "recall_id": r.recall_id,
                        "recall_number": r.recall_number,
                        "title": r.title,
                        "risk_level": r.risk_level.value,
                        "risk_score": r.risk_score,
                        "injuries": r.injuries,
                        "deaths": r.deaths
                    }
                    for r in recalls[:limit]
                ]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "get_recall_details":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                return {"content": [{"type": "text", "text": recall.model_dump_json(indent=2)}]}
            
            elif name == "classify_risk":
                level, score = await do_classify_risk(
                    units_sold=arguments.get("units_sold", 0),
                    injuries=arguments.get("injuries", 0),
                    deaths=arguments.get("deaths", 0),
                    incidents=arguments.get("incidents", 0),
                    hazard_descriptions=arguments.get("hazard_descriptions", [])
                )
                result = {"risk_level": level.value, "risk_score": score}
                return {"content": [{"type": "text", "text": json.dumps(result)}]}
            
            elif name == "search_marketplaces":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                
                # Simplified mock search for MCP
                from app.routers.search import mock_marketplace_search
                
                marketplace_ids = arguments.get("marketplace_ids", [])
                if marketplace_ids:
                    marketplaces = [await db.get_marketplace(mid) for mid in marketplace_ids]
                else:
                    marketplaces = await db.get_all_marketplaces()
                
                marketplaces = [m for m in marketplaces if m and m.enabled]
                
                all_listings = []
                for mp in marketplaces:
                    listings = await mock_marketplace_search(
                        mp.id, mp.name, "", arguments["recall_id"], recall
                    )
                    all_listings.extend([l.model_dump() for l in listings])
                
                return {"content": [{"type": "text", "text": json.dumps(all_listings, indent=2, default=str)}]}
            
            elif name == "get_marketplace_listings":
                listings = await db.get_listings_for_recall(arguments["recall_id"])
                min_score = arguments.get("min_match_score", 0)
                filtered = [l for l in listings if l.match_score >= min_score]
                results = [l.model_dump() for l in filtered]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2, default=str)}]}
            
            elif name == "list_marketplaces":
                marketplaces = await db.get_all_marketplaces()
                if arguments.get("enabled_only"):
                    marketplaces = [m for m in marketplaces if m.enabled]
                results = [{"id": m.id, "name": m.name, "enabled": m.enabled, "url": m.url} for m in marketplaces]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "toggle_marketplace":
                await db.update_marketplace(
                    arguments["marketplace_id"],
                    {"enabled": arguments["enabled"]}
                )
                return {"content": [{"type": "text", "text": f"Marketplace {arguments['marketplace_id']} enabled: {arguments['enabled']}"}]}
            
            elif name == "get_risk_summary":
                summary = await db.get_risk_summary()
                return {"content": [{"type": "text", "text": json.dumps(summary)}]}
            
            elif name == "get_latest_recalls":
                recalls = await db.get_all_recalls()
                recalls.sort(key=lambda r: r.recall_date, reverse=True)
                
                risk_level = arguments.get("risk_level")
                if risk_level:
                    from app.models.recall import RiskLevel
                    recalls = [r for r in recalls if r.risk_level.value == risk_level]
                
                limit = arguments.get("limit", 10)
                results = [
                    {
                        "recall_id": r.recall_id,
                        "title": r.title,
                        "risk_level": r.risk_level.value,
                        "recall_date": r.recall_date.isoformat()
                    }
                    for r in recalls[:limit]
                ]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "build_search_query":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                
                primary = build_search_query(recall)
                variants = build_search_variants(recall)
                result = {"primary_query": primary, "variants": variants}
                return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}
            
            else:
                return {"content": [{"type": "text", "text": f"Unknown tool: {name}"}], "isError": True}
        
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Error: {str(e)}"}], "isError": True}
    
    async def handle_resource_read(self, uri: str) -> dict:
        """Handle a resource read request."""
        from app.services import database as db
        
        try:
            if uri == "altitude://recalls/all":
                recalls = await db.get_all_recalls()
                data = [{"id": r.recall_id, "title": r.title, "risk": r.risk_level.value} for r in recalls]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(data)}]}
            
            elif uri == "altitude://recalls/high-risk":
                from app.models.recall import RiskLevel
                recalls = await db.get_recalls_by_risk(RiskLevel.HIGH)
                data = [{"id": r.recall_id, "title": r.title, "score": r.risk_score} for r in recalls]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(data)}]}
            
            elif uri == "altitude://marketplaces/enabled":
                marketplaces = await db.get_all_marketplaces()
                enabled = [{"id": m.id, "name": m.name} for m in marketplaces if m.enabled]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(enabled)}]}
            
            elif uri == "altitude://config/agent":
                config = await db.get_agent_config()
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": config.model_dump_json()}]}
            
            else:
                return {"contents": [], "isError": True}
        
        except Exception as e:
            return {"contents": [{"uri": uri, "text": f"Error: {str(e)}"}], "isError": True}


# Standalone MCP server runner using stdio
async def run_stdio_server():
    """Run the MCP server using stdio transport."""
    server = MCPServer()
    
    # Initialize database
    from app.services.database import init_db
    await init_db()
    
    # Read from stdin, write to stdout
    while True:
        try:
            line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            
            request = json.loads(line.strip())
            method = request.get("method", "")
            params = request.get("params", {})
            request_id = request.get("id")
            
            # Route to appropriate handler
            if method == "initialize":
                result = await server.handle_initialize(params)
            elif method == "tools/list":
                result = await server.handle_tools_list()
            elif method == "resources/list":
                result = await server.handle_resources_list()
            elif method == "tools/call":
                result = await server.handle_tool_call(params.get("name"), params.get("arguments", {}))
            elif method == "resources/read":
                result = await server.handle_resource_read(params.get("uri"))
            else:
                result = {"error": {"code": -32601, "message": f"Method not found: {method}"}}
            
            # Send response
            response = {"jsonrpc": "2.0", "id": request_id, "result": result}
            print(json.dumps(response), flush=True)
            
        except json.JSONDecodeError:
            continue
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": str(e)}
            }
            print(json.dumps(error_response), flush=True)


if __name__ == "__main__":
    asyncio.run(run_stdio_server())



MCP Server for Altitude Recall Monitor
======================================
Model Context Protocol server providing tools for AI agents
to interact with the recall monitoring system.
"""

import json
import asyncio
from typing import Any
from datetime import datetime
import sys

# MCP server implementation using stdio transport
# This can be run standalone or imported by an MCP host


class MCPServer:
    """MCP Server implementing the Model Context Protocol."""
    
    def __init__(self):
        self.tools = self._define_tools()
        self.resources = self._define_resources()
    
    def _define_tools(self) -> list:
        """Define available MCP tools."""
        return [
            {
                "name": "search_recalls",
                "description": "Search the recall database by text query. Returns matching recalls with risk classification.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query (product name, model number, or keyword)"
                        },
                        "risk_level": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"],
                            "description": "Optional filter by risk level"
                        },
                        "limit": {
                            "type": "integer",
                            "default": 10,
                            "description": "Maximum number of results to return"
                        }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "get_recall_details",
                "description": "Get full details of a specific recall including products, hazards, and images.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to look up"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "classify_risk",
                "description": "Classify the risk level of a product recall based on severity factors.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "units_sold": {
                            "type": "integer",
                            "description": "Number of units sold/distributed"
                        },
                        "injuries": {
                            "type": "integer",
                            "description": "Number of reported injuries"
                        },
                        "deaths": {
                            "type": "integer",
                            "description": "Number of reported deaths"
                        },
                        "incidents": {
                            "type": "integer",
                            "description": "Number of reported incidents"
                        },
                        "hazard_descriptions": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of hazard descriptions"
                        }
                    }
                }
            },
            {
                "name": "search_marketplaces",
                "description": "Search enabled marketplaces for products matching a recall. Returns listings with match scores.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to search for"
                        },
                        "marketplace_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of specific marketplaces to search (empty = search all enabled)"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "get_marketplace_listings",
                "description": "Get listings found for a recall on marketplaces.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID"
                        },
                        "min_match_score": {
                            "type": "number",
                            "description": "Minimum match score filter (0-1)"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "list_marketplaces",
                "description": "List all configured marketplaces and their status.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "enabled_only": {
                            "type": "boolean",
                            "default": False,
                            "description": "Only return enabled marketplaces"
                        }
                    }
                }
            },
            {
                "name": "toggle_marketplace",
                "description": "Enable or disable a marketplace for monitoring.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "marketplace_id": {
                            "type": "string",
                            "description": "The marketplace ID to toggle"
                        },
                        "enabled": {
                            "type": "boolean",
                            "description": "Whether to enable or disable"
                        }
                    },
                    "required": ["marketplace_id", "enabled"]
                }
            },
            {
                "name": "get_risk_summary",
                "description": "Get summary counts of recalls by risk level.",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_latest_recalls",
                "description": "Get the most recent recalls, optionally filtered by risk level.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "default": 10,
                            "description": "Number of recalls to return"
                        },
                        "risk_level": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"],
                            "description": "Optional filter by risk level"
                        }
                    }
                }
            },
            {
                "name": "build_search_query",
                "description": "Generate optimized search queries from recall data for marketplace searches.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to build query for"
                        }
                    },
                    "required": ["recall_id"]
                }
            }
        ]
    
    def _define_resources(self) -> list:
        """Define available MCP resources."""
        return [
            {
                "uri": "altitude://recalls/all",
                "name": "All Recalls",
                "description": "Access to all recalls in the database",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://recalls/high-risk",
                "name": "High Risk Recalls",
                "description": "Access to high-risk recalls only",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://marketplaces/enabled",
                "name": "Enabled Marketplaces",
                "description": "List of currently enabled marketplaces",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://config/agent",
                "name": "Agent Configuration",
                "description": "Current agent settings and tool configurations",
                "mimeType": "application/json"
            }
        ]
    
    async def handle_initialize(self, params: dict) -> dict:
        """Handle MCP initialize request."""
        return {
            "protocolVersion": "2024-11-05",
            "serverInfo": {
                "name": "altitude-recall-monitor",
                "version": "1.0.0"
            },
            "capabilities": {
                "tools": {"listChanged": True},
                "resources": {"subscribe": True, "listChanged": True}
            }
        }
    
    async def handle_tools_list(self) -> dict:
        """Handle tools/list request."""
        return {"tools": self.tools}
    
    async def handle_resources_list(self) -> dict:
        """Handle resources/list request."""
        return {"resources": self.resources}
    
    async def handle_tool_call(self, name: str, arguments: dict) -> dict:
        """Handle a tool call request."""
        # Import here to avoid circular imports
        from app.services import database as db
        from app.skills.risk_classifier import classify_risk as do_classify_risk
        from app.skills.query_builder import build_search_query, build_search_variants
        
        try:
            if name == "search_recalls":
                recalls = await db.search_recalls(
                    arguments.get("query", ""),
                    arguments.get("risk_level")
                )
                limit = arguments.get("limit", 10)
                results = [
                    {
                        "recall_id": r.recall_id,
                        "recall_number": r.recall_number,
                        "title": r.title,
                        "risk_level": r.risk_level.value,
                        "risk_score": r.risk_score,
                        "injuries": r.injuries,
                        "deaths": r.deaths
                    }
                    for r in recalls[:limit]
                ]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "get_recall_details":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                return {"content": [{"type": "text", "text": recall.model_dump_json(indent=2)}]}
            
            elif name == "classify_risk":
                level, score = await do_classify_risk(
                    units_sold=arguments.get("units_sold", 0),
                    injuries=arguments.get("injuries", 0),
                    deaths=arguments.get("deaths", 0),
                    incidents=arguments.get("incidents", 0),
                    hazard_descriptions=arguments.get("hazard_descriptions", [])
                )
                result = {"risk_level": level.value, "risk_score": score}
                return {"content": [{"type": "text", "text": json.dumps(result)}]}
            
            elif name == "search_marketplaces":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                
                # Simplified mock search for MCP
                from app.routers.search import mock_marketplace_search
                
                marketplace_ids = arguments.get("marketplace_ids", [])
                if marketplace_ids:
                    marketplaces = [await db.get_marketplace(mid) for mid in marketplace_ids]
                else:
                    marketplaces = await db.get_all_marketplaces()
                
                marketplaces = [m for m in marketplaces if m and m.enabled]
                
                all_listings = []
                for mp in marketplaces:
                    listings = await mock_marketplace_search(
                        mp.id, mp.name, "", arguments["recall_id"], recall
                    )
                    all_listings.extend([l.model_dump() for l in listings])
                
                return {"content": [{"type": "text", "text": json.dumps(all_listings, indent=2, default=str)}]}
            
            elif name == "get_marketplace_listings":
                listings = await db.get_listings_for_recall(arguments["recall_id"])
                min_score = arguments.get("min_match_score", 0)
                filtered = [l for l in listings if l.match_score >= min_score]
                results = [l.model_dump() for l in filtered]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2, default=str)}]}
            
            elif name == "list_marketplaces":
                marketplaces = await db.get_all_marketplaces()
                if arguments.get("enabled_only"):
                    marketplaces = [m for m in marketplaces if m.enabled]
                results = [{"id": m.id, "name": m.name, "enabled": m.enabled, "url": m.url} for m in marketplaces]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "toggle_marketplace":
                await db.update_marketplace(
                    arguments["marketplace_id"],
                    {"enabled": arguments["enabled"]}
                )
                return {"content": [{"type": "text", "text": f"Marketplace {arguments['marketplace_id']} enabled: {arguments['enabled']}"}]}
            
            elif name == "get_risk_summary":
                summary = await db.get_risk_summary()
                return {"content": [{"type": "text", "text": json.dumps(summary)}]}
            
            elif name == "get_latest_recalls":
                recalls = await db.get_all_recalls()
                recalls.sort(key=lambda r: r.recall_date, reverse=True)
                
                risk_level = arguments.get("risk_level")
                if risk_level:
                    from app.models.recall import RiskLevel
                    recalls = [r for r in recalls if r.risk_level.value == risk_level]
                
                limit = arguments.get("limit", 10)
                results = [
                    {
                        "recall_id": r.recall_id,
                        "title": r.title,
                        "risk_level": r.risk_level.value,
                        "recall_date": r.recall_date.isoformat()
                    }
                    for r in recalls[:limit]
                ]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "build_search_query":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                
                primary = build_search_query(recall)
                variants = build_search_variants(recall)
                result = {"primary_query": primary, "variants": variants}
                return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}
            
            else:
                return {"content": [{"type": "text", "text": f"Unknown tool: {name}"}], "isError": True}
        
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Error: {str(e)}"}], "isError": True}
    
    async def handle_resource_read(self, uri: str) -> dict:
        """Handle a resource read request."""
        from app.services import database as db
        
        try:
            if uri == "altitude://recalls/all":
                recalls = await db.get_all_recalls()
                data = [{"id": r.recall_id, "title": r.title, "risk": r.risk_level.value} for r in recalls]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(data)}]}
            
            elif uri == "altitude://recalls/high-risk":
                from app.models.recall import RiskLevel
                recalls = await db.get_recalls_by_risk(RiskLevel.HIGH)
                data = [{"id": r.recall_id, "title": r.title, "score": r.risk_score} for r in recalls]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(data)}]}
            
            elif uri == "altitude://marketplaces/enabled":
                marketplaces = await db.get_all_marketplaces()
                enabled = [{"id": m.id, "name": m.name} for m in marketplaces if m.enabled]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(enabled)}]}
            
            elif uri == "altitude://config/agent":
                config = await db.get_agent_config()
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": config.model_dump_json()}]}
            
            else:
                return {"contents": [], "isError": True}
        
        except Exception as e:
            return {"contents": [{"uri": uri, "text": f"Error: {str(e)}"}], "isError": True}


# Standalone MCP server runner using stdio
async def run_stdio_server():
    """Run the MCP server using stdio transport."""
    server = MCPServer()
    
    # Initialize database
    from app.services.database import init_db
    await init_db()
    
    # Read from stdin, write to stdout
    while True:
        try:
            line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            
            request = json.loads(line.strip())
            method = request.get("method", "")
            params = request.get("params", {})
            request_id = request.get("id")
            
            # Route to appropriate handler
            if method == "initialize":
                result = await server.handle_initialize(params)
            elif method == "tools/list":
                result = await server.handle_tools_list()
            elif method == "resources/list":
                result = await server.handle_resources_list()
            elif method == "tools/call":
                result = await server.handle_tool_call(params.get("name"), params.get("arguments", {}))
            elif method == "resources/read":
                result = await server.handle_resource_read(params.get("uri"))
            else:
                result = {"error": {"code": -32601, "message": f"Method not found: {method}"}}
            
            # Send response
            response = {"jsonrpc": "2.0", "id": request_id, "result": result}
            print(json.dumps(response), flush=True)
            
        except json.JSONDecodeError:
            continue
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": str(e)}
            }
            print(json.dumps(error_response), flush=True)


if __name__ == "__main__":
    asyncio.run(run_stdio_server())




MCP Server for Altitude Recall Monitor
======================================
Model Context Protocol server providing tools for AI agents
to interact with the recall monitoring system.
"""

import json
import asyncio
from typing import Any
from datetime import datetime
import sys

# MCP server implementation using stdio transport
# This can be run standalone or imported by an MCP host


class MCPServer:
    """MCP Server implementing the Model Context Protocol."""
    
    def __init__(self):
        self.tools = self._define_tools()
        self.resources = self._define_resources()
    
    def _define_tools(self) -> list:
        """Define available MCP tools."""
        return [
            {
                "name": "search_recalls",
                "description": "Search the recall database by text query. Returns matching recalls with risk classification.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query (product name, model number, or keyword)"
                        },
                        "risk_level": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"],
                            "description": "Optional filter by risk level"
                        },
                        "limit": {
                            "type": "integer",
                            "default": 10,
                            "description": "Maximum number of results to return"
                        }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "get_recall_details",
                "description": "Get full details of a specific recall including products, hazards, and images.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to look up"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "classify_risk",
                "description": "Classify the risk level of a product recall based on severity factors.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "units_sold": {
                            "type": "integer",
                            "description": "Number of units sold/distributed"
                        },
                        "injuries": {
                            "type": "integer",
                            "description": "Number of reported injuries"
                        },
                        "deaths": {
                            "type": "integer",
                            "description": "Number of reported deaths"
                        },
                        "incidents": {
                            "type": "integer",
                            "description": "Number of reported incidents"
                        },
                        "hazard_descriptions": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of hazard descriptions"
                        }
                    }
                }
            },
            {
                "name": "search_marketplaces",
                "description": "Search enabled marketplaces for products matching a recall. Returns listings with match scores.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to search for"
                        },
                        "marketplace_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of specific marketplaces to search (empty = search all enabled)"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "get_marketplace_listings",
                "description": "Get listings found for a recall on marketplaces.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID"
                        },
                        "min_match_score": {
                            "type": "number",
                            "description": "Minimum match score filter (0-1)"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "list_marketplaces",
                "description": "List all configured marketplaces and their status.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "enabled_only": {
                            "type": "boolean",
                            "default": False,
                            "description": "Only return enabled marketplaces"
                        }
                    }
                }
            },
            {
                "name": "toggle_marketplace",
                "description": "Enable or disable a marketplace for monitoring.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "marketplace_id": {
                            "type": "string",
                            "description": "The marketplace ID to toggle"
                        },
                        "enabled": {
                            "type": "boolean",
                            "description": "Whether to enable or disable"
                        }
                    },
                    "required": ["marketplace_id", "enabled"]
                }
            },
            {
                "name": "get_risk_summary",
                "description": "Get summary counts of recalls by risk level.",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_latest_recalls",
                "description": "Get the most recent recalls, optionally filtered by risk level.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "default": 10,
                            "description": "Number of recalls to return"
                        },
                        "risk_level": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"],
                            "description": "Optional filter by risk level"
                        }
                    }
                }
            },
            {
                "name": "build_search_query",
                "description": "Generate optimized search queries from recall data for marketplace searches.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to build query for"
                        }
                    },
                    "required": ["recall_id"]
                }
            }
        ]
    
    def _define_resources(self) -> list:
        """Define available MCP resources."""
        return [
            {
                "uri": "altitude://recalls/all",
                "name": "All Recalls",
                "description": "Access to all recalls in the database",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://recalls/high-risk",
                "name": "High Risk Recalls",
                "description": "Access to high-risk recalls only",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://marketplaces/enabled",
                "name": "Enabled Marketplaces",
                "description": "List of currently enabled marketplaces",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://config/agent",
                "name": "Agent Configuration",
                "description": "Current agent settings and tool configurations",
                "mimeType": "application/json"
            }
        ]
    
    async def handle_initialize(self, params: dict) -> dict:
        """Handle MCP initialize request."""
        return {
            "protocolVersion": "2024-11-05",
            "serverInfo": {
                "name": "altitude-recall-monitor",
                "version": "1.0.0"
            },
            "capabilities": {
                "tools": {"listChanged": True},
                "resources": {"subscribe": True, "listChanged": True}
            }
        }
    
    async def handle_tools_list(self) -> dict:
        """Handle tools/list request."""
        return {"tools": self.tools}
    
    async def handle_resources_list(self) -> dict:
        """Handle resources/list request."""
        return {"resources": self.resources}
    
    async def handle_tool_call(self, name: str, arguments: dict) -> dict:
        """Handle a tool call request."""
        # Import here to avoid circular imports
        from app.services import database as db
        from app.skills.risk_classifier import classify_risk as do_classify_risk
        from app.skills.query_builder import build_search_query, build_search_variants
        
        try:
            if name == "search_recalls":
                recalls = await db.search_recalls(
                    arguments.get("query", ""),
                    arguments.get("risk_level")
                )
                limit = arguments.get("limit", 10)
                results = [
                    {
                        "recall_id": r.recall_id,
                        "recall_number": r.recall_number,
                        "title": r.title,
                        "risk_level": r.risk_level.value,
                        "risk_score": r.risk_score,
                        "injuries": r.injuries,
                        "deaths": r.deaths
                    }
                    for r in recalls[:limit]
                ]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "get_recall_details":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                return {"content": [{"type": "text", "text": recall.model_dump_json(indent=2)}]}
            
            elif name == "classify_risk":
                level, score = await do_classify_risk(
                    units_sold=arguments.get("units_sold", 0),
                    injuries=arguments.get("injuries", 0),
                    deaths=arguments.get("deaths", 0),
                    incidents=arguments.get("incidents", 0),
                    hazard_descriptions=arguments.get("hazard_descriptions", [])
                )
                result = {"risk_level": level.value, "risk_score": score}
                return {"content": [{"type": "text", "text": json.dumps(result)}]}
            
            elif name == "search_marketplaces":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                
                # Simplified mock search for MCP
                from app.routers.search import mock_marketplace_search
                
                marketplace_ids = arguments.get("marketplace_ids", [])
                if marketplace_ids:
                    marketplaces = [await db.get_marketplace(mid) for mid in marketplace_ids]
                else:
                    marketplaces = await db.get_all_marketplaces()
                
                marketplaces = [m for m in marketplaces if m and m.enabled]
                
                all_listings = []
                for mp in marketplaces:
                    listings = await mock_marketplace_search(
                        mp.id, mp.name, "", arguments["recall_id"], recall
                    )
                    all_listings.extend([l.model_dump() for l in listings])
                
                return {"content": [{"type": "text", "text": json.dumps(all_listings, indent=2, default=str)}]}
            
            elif name == "get_marketplace_listings":
                listings = await db.get_listings_for_recall(arguments["recall_id"])
                min_score = arguments.get("min_match_score", 0)
                filtered = [l for l in listings if l.match_score >= min_score]
                results = [l.model_dump() for l in filtered]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2, default=str)}]}
            
            elif name == "list_marketplaces":
                marketplaces = await db.get_all_marketplaces()
                if arguments.get("enabled_only"):
                    marketplaces = [m for m in marketplaces if m.enabled]
                results = [{"id": m.id, "name": m.name, "enabled": m.enabled, "url": m.url} for m in marketplaces]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "toggle_marketplace":
                await db.update_marketplace(
                    arguments["marketplace_id"],
                    {"enabled": arguments["enabled"]}
                )
                return {"content": [{"type": "text", "text": f"Marketplace {arguments['marketplace_id']} enabled: {arguments['enabled']}"}]}
            
            elif name == "get_risk_summary":
                summary = await db.get_risk_summary()
                return {"content": [{"type": "text", "text": json.dumps(summary)}]}
            
            elif name == "get_latest_recalls":
                recalls = await db.get_all_recalls()
                recalls.sort(key=lambda r: r.recall_date, reverse=True)
                
                risk_level = arguments.get("risk_level")
                if risk_level:
                    from app.models.recall import RiskLevel
                    recalls = [r for r in recalls if r.risk_level.value == risk_level]
                
                limit = arguments.get("limit", 10)
                results = [
                    {
                        "recall_id": r.recall_id,
                        "title": r.title,
                        "risk_level": r.risk_level.value,
                        "recall_date": r.recall_date.isoformat()
                    }
                    for r in recalls[:limit]
                ]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "build_search_query":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                
                primary = build_search_query(recall)
                variants = build_search_variants(recall)
                result = {"primary_query": primary, "variants": variants}
                return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}
            
            else:
                return {"content": [{"type": "text", "text": f"Unknown tool: {name}"}], "isError": True}
        
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Error: {str(e)}"}], "isError": True}
    
    async def handle_resource_read(self, uri: str) -> dict:
        """Handle a resource read request."""
        from app.services import database as db
        
        try:
            if uri == "altitude://recalls/all":
                recalls = await db.get_all_recalls()
                data = [{"id": r.recall_id, "title": r.title, "risk": r.risk_level.value} for r in recalls]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(data)}]}
            
            elif uri == "altitude://recalls/high-risk":
                from app.models.recall import RiskLevel
                recalls = await db.get_recalls_by_risk(RiskLevel.HIGH)
                data = [{"id": r.recall_id, "title": r.title, "score": r.risk_score} for r in recalls]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(data)}]}
            
            elif uri == "altitude://marketplaces/enabled":
                marketplaces = await db.get_all_marketplaces()
                enabled = [{"id": m.id, "name": m.name} for m in marketplaces if m.enabled]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(enabled)}]}
            
            elif uri == "altitude://config/agent":
                config = await db.get_agent_config()
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": config.model_dump_json()}]}
            
            else:
                return {"contents": [], "isError": True}
        
        except Exception as e:
            return {"contents": [{"uri": uri, "text": f"Error: {str(e)}"}], "isError": True}


# Standalone MCP server runner using stdio
async def run_stdio_server():
    """Run the MCP server using stdio transport."""
    server = MCPServer()
    
    # Initialize database
    from app.services.database import init_db
    await init_db()
    
    # Read from stdin, write to stdout
    while True:
        try:
            line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            
            request = json.loads(line.strip())
            method = request.get("method", "")
            params = request.get("params", {})
            request_id = request.get("id")
            
            # Route to appropriate handler
            if method == "initialize":
                result = await server.handle_initialize(params)
            elif method == "tools/list":
                result = await server.handle_tools_list()
            elif method == "resources/list":
                result = await server.handle_resources_list()
            elif method == "tools/call":
                result = await server.handle_tool_call(params.get("name"), params.get("arguments", {}))
            elif method == "resources/read":
                result = await server.handle_resource_read(params.get("uri"))
            else:
                result = {"error": {"code": -32601, "message": f"Method not found: {method}"}}
            
            # Send response
            response = {"jsonrpc": "2.0", "id": request_id, "result": result}
            print(json.dumps(response), flush=True)
            
        except json.JSONDecodeError:
            continue
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": str(e)}
            }
            print(json.dumps(error_response), flush=True)


if __name__ == "__main__":
    asyncio.run(run_stdio_server())



MCP Server for Altitude Recall Monitor
======================================
Model Context Protocol server providing tools for AI agents
to interact with the recall monitoring system.
"""

import json
import asyncio
from typing import Any
from datetime import datetime
import sys

# MCP server implementation using stdio transport
# This can be run standalone or imported by an MCP host


class MCPServer:
    """MCP Server implementing the Model Context Protocol."""
    
    def __init__(self):
        self.tools = self._define_tools()
        self.resources = self._define_resources()
    
    def _define_tools(self) -> list:
        """Define available MCP tools."""
        return [
            {
                "name": "search_recalls",
                "description": "Search the recall database by text query. Returns matching recalls with risk classification.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query (product name, model number, or keyword)"
                        },
                        "risk_level": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"],
                            "description": "Optional filter by risk level"
                        },
                        "limit": {
                            "type": "integer",
                            "default": 10,
                            "description": "Maximum number of results to return"
                        }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "get_recall_details",
                "description": "Get full details of a specific recall including products, hazards, and images.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to look up"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "classify_risk",
                "description": "Classify the risk level of a product recall based on severity factors.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "units_sold": {
                            "type": "integer",
                            "description": "Number of units sold/distributed"
                        },
                        "injuries": {
                            "type": "integer",
                            "description": "Number of reported injuries"
                        },
                        "deaths": {
                            "type": "integer",
                            "description": "Number of reported deaths"
                        },
                        "incidents": {
                            "type": "integer",
                            "description": "Number of reported incidents"
                        },
                        "hazard_descriptions": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of hazard descriptions"
                        }
                    }
                }
            },
            {
                "name": "search_marketplaces",
                "description": "Search enabled marketplaces for products matching a recall. Returns listings with match scores.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to search for"
                        },
                        "marketplace_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of specific marketplaces to search (empty = search all enabled)"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "get_marketplace_listings",
                "description": "Get listings found for a recall on marketplaces.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID"
                        },
                        "min_match_score": {
                            "type": "number",
                            "description": "Minimum match score filter (0-1)"
                        }
                    },
                    "required": ["recall_id"]
                }
            },
            {
                "name": "list_marketplaces",
                "description": "List all configured marketplaces and their status.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "enabled_only": {
                            "type": "boolean",
                            "default": False,
                            "description": "Only return enabled marketplaces"
                        }
                    }
                }
            },
            {
                "name": "toggle_marketplace",
                "description": "Enable or disable a marketplace for monitoring.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "marketplace_id": {
                            "type": "string",
                            "description": "The marketplace ID to toggle"
                        },
                        "enabled": {
                            "type": "boolean",
                            "description": "Whether to enable or disable"
                        }
                    },
                    "required": ["marketplace_id", "enabled"]
                }
            },
            {
                "name": "get_risk_summary",
                "description": "Get summary counts of recalls by risk level.",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_latest_recalls",
                "description": "Get the most recent recalls, optionally filtered by risk level.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "default": 10,
                            "description": "Number of recalls to return"
                        },
                        "risk_level": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"],
                            "description": "Optional filter by risk level"
                        }
                    }
                }
            },
            {
                "name": "build_search_query",
                "description": "Generate optimized search queries from recall data for marketplace searches.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "recall_id": {
                            "type": "string",
                            "description": "The recall ID to build query for"
                        }
                    },
                    "required": ["recall_id"]
                }
            }
        ]
    
    def _define_resources(self) -> list:
        """Define available MCP resources."""
        return [
            {
                "uri": "altitude://recalls/all",
                "name": "All Recalls",
                "description": "Access to all recalls in the database",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://recalls/high-risk",
                "name": "High Risk Recalls",
                "description": "Access to high-risk recalls only",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://marketplaces/enabled",
                "name": "Enabled Marketplaces",
                "description": "List of currently enabled marketplaces",
                "mimeType": "application/json"
            },
            {
                "uri": "altitude://config/agent",
                "name": "Agent Configuration",
                "description": "Current agent settings and tool configurations",
                "mimeType": "application/json"
            }
        ]
    
    async def handle_initialize(self, params: dict) -> dict:
        """Handle MCP initialize request."""
        return {
            "protocolVersion": "2024-11-05",
            "serverInfo": {
                "name": "altitude-recall-monitor",
                "version": "1.0.0"
            },
            "capabilities": {
                "tools": {"listChanged": True},
                "resources": {"subscribe": True, "listChanged": True}
            }
        }
    
    async def handle_tools_list(self) -> dict:
        """Handle tools/list request."""
        return {"tools": self.tools}
    
    async def handle_resources_list(self) -> dict:
        """Handle resources/list request."""
        return {"resources": self.resources}
    
    async def handle_tool_call(self, name: str, arguments: dict) -> dict:
        """Handle a tool call request."""
        # Import here to avoid circular imports
        from app.services import database as db
        from app.skills.risk_classifier import classify_risk as do_classify_risk
        from app.skills.query_builder import build_search_query, build_search_variants
        
        try:
            if name == "search_recalls":
                recalls = await db.search_recalls(
                    arguments.get("query", ""),
                    arguments.get("risk_level")
                )
                limit = arguments.get("limit", 10)
                results = [
                    {
                        "recall_id": r.recall_id,
                        "recall_number": r.recall_number,
                        "title": r.title,
                        "risk_level": r.risk_level.value,
                        "risk_score": r.risk_score,
                        "injuries": r.injuries,
                        "deaths": r.deaths
                    }
                    for r in recalls[:limit]
                ]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "get_recall_details":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                return {"content": [{"type": "text", "text": recall.model_dump_json(indent=2)}]}
            
            elif name == "classify_risk":
                level, score = await do_classify_risk(
                    units_sold=arguments.get("units_sold", 0),
                    injuries=arguments.get("injuries", 0),
                    deaths=arguments.get("deaths", 0),
                    incidents=arguments.get("incidents", 0),
                    hazard_descriptions=arguments.get("hazard_descriptions", [])
                )
                result = {"risk_level": level.value, "risk_score": score}
                return {"content": [{"type": "text", "text": json.dumps(result)}]}
            
            elif name == "search_marketplaces":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                
                # Simplified mock search for MCP
                from app.routers.search import mock_marketplace_search
                
                marketplace_ids = arguments.get("marketplace_ids", [])
                if marketplace_ids:
                    marketplaces = [await db.get_marketplace(mid) for mid in marketplace_ids]
                else:
                    marketplaces = await db.get_all_marketplaces()
                
                marketplaces = [m for m in marketplaces if m and m.enabled]
                
                all_listings = []
                for mp in marketplaces:
                    listings = await mock_marketplace_search(
                        mp.id, mp.name, "", arguments["recall_id"], recall
                    )
                    all_listings.extend([l.model_dump() for l in listings])
                
                return {"content": [{"type": "text", "text": json.dumps(all_listings, indent=2, default=str)}]}
            
            elif name == "get_marketplace_listings":
                listings = await db.get_listings_for_recall(arguments["recall_id"])
                min_score = arguments.get("min_match_score", 0)
                filtered = [l for l in listings if l.match_score >= min_score]
                results = [l.model_dump() for l in filtered]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2, default=str)}]}
            
            elif name == "list_marketplaces":
                marketplaces = await db.get_all_marketplaces()
                if arguments.get("enabled_only"):
                    marketplaces = [m for m in marketplaces if m.enabled]
                results = [{"id": m.id, "name": m.name, "enabled": m.enabled, "url": m.url} for m in marketplaces]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "toggle_marketplace":
                await db.update_marketplace(
                    arguments["marketplace_id"],
                    {"enabled": arguments["enabled"]}
                )
                return {"content": [{"type": "text", "text": f"Marketplace {arguments['marketplace_id']} enabled: {arguments['enabled']}"}]}
            
            elif name == "get_risk_summary":
                summary = await db.get_risk_summary()
                return {"content": [{"type": "text", "text": json.dumps(summary)}]}
            
            elif name == "get_latest_recalls":
                recalls = await db.get_all_recalls()
                recalls.sort(key=lambda r: r.recall_date, reverse=True)
                
                risk_level = arguments.get("risk_level")
                if risk_level:
                    from app.models.recall import RiskLevel
                    recalls = [r for r in recalls if r.risk_level.value == risk_level]
                
                limit = arguments.get("limit", 10)
                results = [
                    {
                        "recall_id": r.recall_id,
                        "title": r.title,
                        "risk_level": r.risk_level.value,
                        "recall_date": r.recall_date.isoformat()
                    }
                    for r in recalls[:limit]
                ]
                return {"content": [{"type": "text", "text": json.dumps(results, indent=2)}]}
            
            elif name == "build_search_query":
                recall = await db.get_recall(arguments["recall_id"])
                if not recall:
                    return {"content": [{"type": "text", "text": "Recall not found"}], "isError": True}
                
                primary = build_search_query(recall)
                variants = build_search_variants(recall)
                result = {"primary_query": primary, "variants": variants}
                return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}
            
            else:
                return {"content": [{"type": "text", "text": f"Unknown tool: {name}"}], "isError": True}
        
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Error: {str(e)}"}], "isError": True}
    
    async def handle_resource_read(self, uri: str) -> dict:
        """Handle a resource read request."""
        from app.services import database as db
        
        try:
            if uri == "altitude://recalls/all":
                recalls = await db.get_all_recalls()
                data = [{"id": r.recall_id, "title": r.title, "risk": r.risk_level.value} for r in recalls]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(data)}]}
            
            elif uri == "altitude://recalls/high-risk":
                from app.models.recall import RiskLevel
                recalls = await db.get_recalls_by_risk(RiskLevel.HIGH)
                data = [{"id": r.recall_id, "title": r.title, "score": r.risk_score} for r in recalls]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(data)}]}
            
            elif uri == "altitude://marketplaces/enabled":
                marketplaces = await db.get_all_marketplaces()
                enabled = [{"id": m.id, "name": m.name} for m in marketplaces if m.enabled]
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(enabled)}]}
            
            elif uri == "altitude://config/agent":
                config = await db.get_agent_config()
                return {"contents": [{"uri": uri, "mimeType": "application/json", "text": config.model_dump_json()}]}
            
            else:
                return {"contents": [], "isError": True}
        
        except Exception as e:
            return {"contents": [{"uri": uri, "text": f"Error: {str(e)}"}], "isError": True}


# Standalone MCP server runner using stdio
async def run_stdio_server():
    """Run the MCP server using stdio transport."""
    server = MCPServer()
    
    # Initialize database
    from app.services.database import init_db
    await init_db()
    
    # Read from stdin, write to stdout
    while True:
        try:
            line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            
            request = json.loads(line.strip())
            method = request.get("method", "")
            params = request.get("params", {})
            request_id = request.get("id")
            
            # Route to appropriate handler
            if method == "initialize":
                result = await server.handle_initialize(params)
            elif method == "tools/list":
                result = await server.handle_tools_list()
            elif method == "resources/list":
                result = await server.handle_resources_list()
            elif method == "tools/call":
                result = await server.handle_tool_call(params.get("name"), params.get("arguments", {}))
            elif method == "resources/read":
                result = await server.handle_resource_read(params.get("uri"))
            else:
                result = {"error": {"code": -32601, "message": f"Method not found: {method}"}}
            
            # Send response
            response = {"jsonrpc": "2.0", "id": request_id, "result": result}
            print(json.dumps(response), flush=True)
            
        except json.JSONDecodeError:
            continue
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": str(e)}
            }
            print(json.dumps(error_response), flush=True)


if __name__ == "__main__":
    asyncio.run(run_stdio_server())




