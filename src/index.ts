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

	private static initialized = false;
	private static environmentVars: any = {};

	static setEnvironment(env: any) {
		this.environmentVars = env;
	}

	async init(env?: any) {
		// Prevent multiple initializations
		if (MyMCP.initialized) {
			return;
		}
		MyMCP.initialized = true;
		// Load environment configuration with defaults
		const envVars = env || MyMCP.environmentVars || (globalThis as any).env || {};
		console.log("Environment variables:", envVars);

		const config = {
			cfgSchemaImporter: {
				excludeSchemasWithImports: (envVars.SCHEMA_EXCLUDE_IMPORTS || "true") === "true",
				excludeSchemasWithRequiredServerParams: (envVars.SCHEMA_EXCLUDE_SERVER_PARAMS || "true") === "true",
				addAdditionalMetaData: (envVars.SCHEMA_ADD_METADATA || "false") === "true"
			},
			cfgFilterArrayOfSchemas: {
				includeNamespaces: envVars.FILTER_INCLUDE_NAMESPACES ? envVars.FILTER_INCLUDE_NAMESPACES.split(",") : [],
				excludeNamespaces: envVars.FILTER_EXCLUDE_NAMESPACES ? envVars.FILTER_EXCLUDE_NAMESPACES.split(",") : [],
				activateTags: envVars.FILTER_ACTIVATE_TAGS ? envVars.FILTER_ACTIVATE_TAGS.split(",") : []
			}
		};
		console.log("Config:", config);

		// Load schemas from folder
		const arrayOfSchemas = await SchemaImporter.loadFromFolder(config.cfgSchemaImporter);
		console.log("Loaded schemas:", arrayOfSchemas);

		// Filter schemas
		const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas({
			arrayOfSchemas: arrayOfSchemas.map(({ schema }: any) => schema),
			...config.cfgFilterArrayOfSchemas
		});
		console.log("Filtered schemas:", filteredArrayOfSchemas);

		// Register tools for each schema
		console.log(`Registering tools for ${filteredArrayOfSchemas.length} schemas`);
		for (const schema of filteredArrayOfSchemas) {
			console.log(`Processing schema: ${schema.name}`);

			// For now, manually register calculator tools from the placeholder schema
			if (schema.name === "calculator") {
				console.log("Registering calculator tools manually");

				this.server.tool("adding", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
					content: [{ type: "text", text: String(a + b) }],
				}));

				this.server.tool("multiply", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
					content: [{ type: "text", text: String(a * b) }],
				}));

				this.server.tool("subtract", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
					content: [{ type: "text", text: String(a - b) }],
				}));
			}

			// Call FlowMCP activation (placeholder for now)
			FlowMCP.activateServerTools({
				server: this.server,
				schema,
				serverParams: []
			});
		}
		console.log("Tool registration completed");
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		const routePath = env.ROUTE_PATH || "/mcp";

		// Set environment variables for MyMCP initialization
		MyMCP.setEnvironment(env);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === routePath) {
			return MyMCP.serve(routePath).fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
