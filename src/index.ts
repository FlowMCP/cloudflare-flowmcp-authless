import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FlowMCP } from "flowmcp";

// @ts-ignore - loadFromFolderStatic exists but no TypeScript definitions
import { SchemaImporter } from 'schemaimporter'


// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	private _server?: McpServer;
 
	get server() {
		if (!this._server) {
			this._server = new McpServer({
				name: "FlowMCP Schema Server",
				version: "1.0.0",
			});
		}
		return this._server;
	}

	async init() {
		// Load environment configuration with defaults
		const env = (globalThis as any).env || {};
		console.log("Environment variables:", env);

		const config = {
			cfgSchemaImporter: {
				excludeSchemasWithImports:
					(env.SCHEMA_EXCLUDE_IMPORTS || "true") === "true",
				excludeSchemasWithRequiredServerParams:
					(env.SCHEMA_EXCLUDE_SERVER_PARAMS || "true") === "true",
				addAdditionalMetaData: (env.SCHEMA_ADD_METADATA || "false") === "true",
			},
			cfgFilterArrayOfSchemas: {
				includeNamespaces: env.FILTER_INCLUDE_NAMESPACES
					? env.FILTER_INCLUDE_NAMESPACES.split(",")
					: [],
				excludeNamespaces: env.FILTER_EXCLUDE_NAMESPACES
					? env.FILTER_EXCLUDE_NAMESPACES.split(",")
					: [],
				activateTags: env.FILTER_ACTIVATE_TAGS
					? env.FILTER_ACTIVATE_TAGS.split(",")
					: [],
			},
		};
		console.log("Config:", config);

		// Load schemas using static import
		// @ts-ignore - loadFromFolderStatic exists but no TypeScript definitions
		const arrayOfSchemas = await SchemaImporter
			.loadFromFolderStatic( {
				excludeSchemasWithImports: config.cfgSchemaImporter.excludeSchemasWithImports,
				excludeSchemasWithRequiredServerParams: config.cfgSchemaImporter.excludeSchemasWithRequiredServerParams,
				addAdditionalMetaData: config.cfgSchemaImporter.addAdditionalMetaData,
				outputType: 'onlySchema'
			} )
		console.log(`Loaded ${arrayOfSchemas.length} schemas`)

		// Filter schemas based on configuration
		const { filteredArrayOfSchemas } = FlowMCP
			.filterArrayOfSchemas({
				arrayOfSchemas,
				includeNamespaces: config.cfgFilterArrayOfSchemas.includeNamespaces,
				excludeNamespaces: config.cfgFilterArrayOfSchemas.excludeNamespaces,
				activateTags: config.cfgFilterArrayOfSchemas.activateTags
			} )
		console.log(`Filtered to ${filteredArrayOfSchemas.length} schemas`)

		// Register schemas as MCP tools
		for( const schema of filteredArrayOfSchemas ) {
			try {
				FlowMCP.activateServerTools({
					server: this.server,
					schema,
					serverParams: []
				} )
			} catch (error) {
				console.error(`Failed to activate schema ${schema.namespace}:`, error)
			}
		}

		console.log('Schema registration completed')

		// Always register a basic ping tool for testing
		this.server.tool("ping", {}, async () => ({
			content: [{ type: "text", text: "pong - FlowMCP Server is running!" }],
		}));
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		const routePath = env.ROUTE_PATH || "/mcp";

		// Store environment in global for access in MyMCP.init()
		(globalThis as any).env = env;

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === routePath) {
			return MyMCP.serve(routePath).fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
