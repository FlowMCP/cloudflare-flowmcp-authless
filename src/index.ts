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

		console.log( 'Start import...')
		// @ts-ignore - loadFromFolderStatic exists but no TypeScript definitions
		const arrayOfSchemas = await SchemaImporter
			.loadFromFolderStatic( {
				excludeSchemasWithImports: true,
				excludeSchemasWithRequiredServerParams: true,
				addAdditionalMetaData: false,
				outputType: 'onlySchema'
			} )
		console.log( 'B - arrayOfSchemas count:', arrayOfSchemas.length)

		const { filteredArrayOfSchemas } = FlowMCP
			.filterArrayOfSchemas({
				arrayOfSchemas,
				includeNamespaces: ['cryptocompare', 'coingecko'],
				excludeNamespaces: [],
				activateTags: []
			} )
 console.log( 'C - filteredArrayOfSchemas count:', filteredArrayOfSchemas.length)
		for( const schema of filteredArrayOfSchemas ) {
			console.log( 'D - Processing schema:', schema.namespace || 'unknown' )
			try {
				FlowMCP.activateServerTools({
					server: this.server,
					schema,
					serverParams: []
				} )
				console.log( 'E - Schema activated successfully' )
			} catch (error) {
				console.error('Error activating schema:', error)
				console.error('Error stack:', error.stack)
				throw error
			}
		}

		console.log( 'Import finished' )


/*
		// Load schemas using dynamic imports (Cloudflare Workers compatible)
		const arrayOfSchemas = await Promise.all(
			arrayOfSchemaPaths.map(async (path) => {
				const module = await import(path);
				return { schema: module.schema, absolutePath: path };
			})
		);
*/

		// const schema = await import( 'schemaimporter/schemas/v1.2.0/defilama/api.mjs' )
/*
		
			FlowMCP.activateServerTools( {
				server: this.server,
				schema: arrayOfSchemas[0]['schema'],
				serverParams: []
			} );
*/
/*
			FlowMCP.activateServerTools( {
				server: this.server,
				schema: arrayOfSchemas[0]['schema'],
				serverParams: []
			} );
*/


/*
		const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas({
			arrayOfSchemas: arrayOfSchemas.map(({ schema }: any) => schema),
			includeNamespaces: [],
			excludeNamespaces: [],
			activateTags: [],
		});
*/
		/*
		 */
		/*
		// Load schemas from folder
		const arrayOfSchemas = await SchemaImporter
			.loadFromFolder(config.cfgSchemaImporter);
		console.log("Loaded schemas:", arrayOfSchemas);

		// Filter schemas
		const { filteredArrayOfSchemas } = FlowMCP
			.filterArrayOfSchemas({
				arrayOfSchemas: arrayOfSchemas.map(({ schema }: any) => schema),
				...config.cfgFilterArrayOfSchemas
			});
*/
		// console.log("Filtered schemas:", filteredArrayOfSchemas);
		/*
		FlowMCP
			.activateServerTools( {
				server: this.server,
				schema: arrayOfSchemas[0]['schema'],
				serverParams: []
			} )
*/
/*
		FlowMCP.activateServerTools({
			server: this.server,
			'schema': arrayOfSchemas[0]['schema'],
			serverParams: []
		});
*/
/*
		const arrayOfSchemas = await SchemaImporter.loadFromFolder({
			excludeSchemasWithImports: true,
			excludeSchemasWithRequiredServerParams: true,
			addAdditionalMetaData: false,
		});
*/


		// Always register a basic ping tool for testing
		this.server.tool("ping6", {}, async () => ({
			content: [{ type: "text", text: "pong - FlowMCP Server is running!" }],
		}));

		/*
		// Register tools for each schema
		console.log(`Registering tools for ${filteredArrayOfSchemas.length} schemas`);
		for (const schema of filteredArrayOfSchemas) {
			console.log(`Processing schema: ${schema.name}`);

			FlowMCP.activateServerTools({
				server: this.server,
				schema,
				serverParams: []
			});
		}
*/
		console.log("Tool registration completed");
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
