import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FlowMCP } from "flowmcp";
// import { arrayOfSchemaPaths } from "./schema-paths.mjs";
import { schema as pingSchema } from "../custom-schemas/ping.mjs";
import { SchemaImporter } from 'schemaimporter'


// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "FlowMCP Schema Server",
		version: "1.0.0",
	});

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

		console.log("Starting schema import - using direct data import for Cloudflare Workers...");

		let schemas = [];

		try {
			// Import schema paths directly (bypassing SchemaImporter's relative path issues)
			const { allSchemaPaths } = await import('schemaimporter/src/data/all-schema-paths.mjs');

			// Replicate the filtering logic from loadFromFolderWithImport
			const schemaRootFolder = "./../schemas/v1.2.0/";
			const filteredPaths = allSchemaPaths
				.filter((item: any) => item.relativePath.includes(schemaRootFolder.replace('./../schemas/', '')))
				.filter((item: any) => config.cfgSchemaImporter.excludeSchemasWithImports ? !item.hasImport : true)
				.filter((item: any) => config.cfgSchemaImporter.excludeSchemasWithRequiredServerParams ? (item.requiredServerParams.length === 0) : true);

			console.log(`Found ${filteredPaths.length} schema paths after filtering`);

			// Import schemas using modulImportPath (works in Cloudflare Workers)
			for (const pathInfo of filteredPaths) {
				try {
					const module = await import(pathInfo.modulImportPath);
					if (module.schema) {
						schemas.push(module.schema);
					}
				} catch (importError: any) {
					console.error(`Failed to import ${pathInfo.modulImportPath}:`, importError?.message || importError);
				}
			}

			console.log(`Successfully imported ${schemas.length} schemas`);

			// Now use FlowMCP to filter the schemas
			const { filteredArrayOfSchemas } = FlowMCP
				.filterArrayOfSchemas({
					arrayOfSchemas: schemas,
					includeNamespaces: ['coingecko-com', 'coinmarketcap-com', 'defilama'],
					excludeNamespaces: [],
					activateTags: []
				})

			console.log(`Filtered to ${filteredArrayOfSchemas.length} schemas`);

			// Register filtered schemas
			if (filteredArrayOfSchemas.length > 0) {
				console.log("Registering schemas as MCP tools...");
				for( const schema of filteredArrayOfSchemas ) {
					console.log(`Registering schema: ${schema.name || schema.namespace || 'unknown'}`);
					try {
						FlowMCP.activateServerTools( {
							server: this.server,
							schema,
							serverParams: []
						} )
					} catch (error) {
						console.error(`Error registering schema:`, error);
					}
				}
				console.log("Schema registration complete");
			} else {
				console.log("No matching schemas found after filtering");
			}

		} catch (error) {
			console.error("Error during schema import process:", error);
		}
		


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
		this.server.tool("ping", {}, async () => ({
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
