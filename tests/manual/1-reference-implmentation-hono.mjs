import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { HonoServerManager } from './helpers/HonoServerManager.mjs'
import { FlowMCP } from 'flowmcp'
import { SchemaImporter } from 'schemaimporter'

const config = {
    'routePath': '/mcp',
    'serverPort': 3000,
    'cfgSchemaImporter': {
        excludeSchemasWithImports: true,
        excludeSchemasWithRequiredServerParams: true,
        addAdditionalMetaData: false
    },
    'cfgFilterArrayOfSchemas': {
        includeNamespaces: [],
        excludeNamespaces: [],
        activateTags: []
    }
}
const { routePath, serverPort, cfgSchemaImporter, cfgFilterArrayOfSchemas } = config


const serverManager = new HonoServerManager()
const mcpServer = new McpServer( { name: "example-server-hono", version: "1.0.0" } )

const arrayOfSchemas = await SchemaImporter
    .loadFromFolder( cfgSchemaImporter )
const { filteredArrayOfSchemas } = FlowMCP
    .filterArrayOfSchemas( {
        'arrayOfSchemas': arrayOfSchemas.map( ( { schema } ) => { return schema } ),
        ...cfgFilterArrayOfSchemas
    } )
const { arrayOfMcpTools } = filteredArrayOfSchemas
    .reduce( ( acc, schema ) => {
        const { mcpTools } = FlowMCP
            .activateServerTools( { server: mcpServer, schema, serverParams: []  } )
        acc.concat( ...Object.entries( mcpTools ) )
        return acc
    }, [] )
const { app } = serverManager
    .initServer( { routePath, mcpServer } )
serverManager
    .startServer( { serverPort } )