import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ServerManager } from './helpers/ServerManager.mjs'
import { FlowMCP } from 'flowmcp'
import { SchemaImporter } from 'schemaimporter'

const config = {
    'routePath': '/mcp',
    'serverPort': 3000
}

const { routePath, serverPort } = config


const serverManager = new ServerManager()
const mcpServer = new McpServer({
    name: "example-server",
    version: "1.0.0"
} )

const arrayOfSchemas = await SchemaImporter
    .loadFromFolder( {
        excludeSchemasWithImports: true,
        excludeSchemasWithRequiredServerParams: true,
        addAdditionalMetaData: false
    } )

const { filteredArrayOfSchemas } = FlowMCP
    .filterArrayOfSchemas( {
        'arrayOfSchemas': arrayOfSchemas.map( ( { schema } ) => { return schema } ),
        includeNamespaces: [],
        excludeNamespaces: [],
        activateTags: []
    } )
const { arrayOfMcpTools } = filteredArrayOfSchemas
    .reduce( ( acc, schema ) => {
        const { mcpTools } = FlowMCP
            .activateServerTools( { server: mcpServer, schema, serverParams: []  } )
        acc.concat( ...Object.entries( mcpTools ) )
        return acc
    }, [] )
const { app } = serverManager.initServer( { routePath, mcpServer } )

/*
Middleware injection
*/

serverManager.startServer( { serverPort } )

