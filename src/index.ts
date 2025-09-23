import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FlowMCP } from "./lib/flowmcp.js";
import { SchemaImporter } from "./lib/schemaimporter.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "FlowMCP Schema Server",
		version: "1.0.0",
	});

	async init() {
		// Load environment configuration
		const env = (globalThis as any).env || {};
		const config = {
			cfgSchemaImporter: {
				excludeSchemasWithImports: env.SCHEMA_EXCLUDE_IMPORTS === "true",
				excludeSchemasWithRequiredServerParams: env.SCHEMA_EXCLUDE_SERVER_PARAMS === "true",
				addAdditionalMetaData: env.SCHEMA_ADD_METADATA === "true"
			},
			cfgFilterArrayOfSchemas: {
				includeNamespaces: env.FILTER_INCLUDE_NAMESPACES ? env.FILTER_INCLUDE_NAMESPACES.split(",") : [],
				excludeNamespaces: env.FILTER_EXCLUDE_NAMESPACES ? env.FILTER_EXCLUDE_NAMESPACES.split(",") : [],
				activateTags: env.FILTER_ACTIVATE_TAGS ? env.FILTER_ACTIVATE_TAGS.split(",") : []
			}
		};

		// Load schemas from folder
		const arrayOfSchemas = await SchemaImporter.loadFromFolder(config.cfgSchemaImporter);

		// Filter schemas
		const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas({
			arrayOfSchemas: arrayOfSchemas.map(({ schema }: any) => schema),
			...config.cfgFilterArrayOfSchemas
		});

		// Register tools for each schema
		for (const schema of filteredArrayOfSchemas) {
			// For now, manually register calculator tools from the placeholder schema
			if (schema.name === "calculator") {
				this.server.tool("adding", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
					content: [{ type: "text", text: String(a + b) }],
				}));

				this.server.tool("multiply", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
					content: [{ type: "text", text: String(a * b) }],
				}));
			}

			FlowMCP.activateServerTools({
				server: this.server,
				schema,
				serverParams: []
			});
		}
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
