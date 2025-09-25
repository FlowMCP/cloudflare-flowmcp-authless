import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MyMCP } from '../../src/index'

// Mock the dependencies
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
    McpServer: vi.fn().mockImplementation(() => ({
        tool: vi.fn()
    }))
}))

vi.mock('agents/mcp', () => ({
    McpAgent: class {
        static serve() { return { fetch: vi.fn() } }
        static serveSSE() { return { fetch: vi.fn() } }
    }
}))

vi.mock('flowmcp', () => ({
    FlowMCP: {
        filterArrayOfSchemas: vi.fn().mockReturnValue({
            filteredArrayOfSchemas: []
        }),
        activateServerTools: vi.fn()
    }
}))

vi.mock('schemaimporter', () => ({
    SchemaImporter: {
        loadFromFolderStatic: vi.fn().mockResolvedValue([])
    }
}))

describe('MyMCP', () => {
    let mcpInstance: MyMCP

    beforeEach(() => {
        mcpInstance = new MyMCP()
        // Set global env for testing
        ;(globalThis as any).env = {
            SCHEMA_EXCLUDE_IMPORTS: 'true',
            SCHEMA_EXCLUDE_SERVER_PARAMS: 'true',
            SCHEMA_ADD_METADATA: 'false',
            FILTER_INCLUDE_NAMESPACES: '',
            FILTER_EXCLUDE_NAMESPACES: '',
            FILTER_ACTIVATE_TAGS: ''
        }
    })

    it('should create an instance of MyMCP', () => {
        expect(mcpInstance).toBeDefined()
        expect(mcpInstance).toBeInstanceOf(MyMCP)
    })

    it('should have a server getter that returns McpServer instance', () => {
        const server = mcpInstance.server
        expect(server).toBeDefined()
        expect(server.tool).toBeDefined()
    })

    it('should initialize with ping6 tool', async () => {
        await mcpInstance.init()

        // Check that the ping6 tool was registered
        const server = mcpInstance.server
        expect(server.tool).toHaveBeenCalledWith(
            'ping6',
            {},
            expect.any(Function)
        )
    })

    it('should handle init with environment configuration', async () => {
        ;(globalThis as any).env = {
            SCHEMA_EXCLUDE_IMPORTS: 'false',
            SCHEMA_EXCLUDE_SERVER_PARAMS: 'false',
            SCHEMA_ADD_METADATA: 'true',
            FILTER_INCLUDE_NAMESPACES: 'test1,test2',
            FILTER_EXCLUDE_NAMESPACES: 'exclude1',
            FILTER_ACTIVATE_TAGS: 'tag1,tag2'
        }

        await mcpInstance.init()

        // Verify the configuration was processed correctly
        const { FlowMCP } = await import('flowmcp')
        expect(FlowMCP.filterArrayOfSchemas).toHaveBeenCalledWith({
            arrayOfSchemas: [],
            includeNamespaces: ['test1', 'test2'],
            excludeNamespaces: ['exclude1'],
            activateTags: ['tag1', 'tag2']
        })
    })

    it('should handle empty environment configuration', async () => {
        ;(globalThis as any).env = {}

        await mcpInstance.init()

        // Should use default values
        const { SchemaImporter } = await import('schemaimporter')
        expect(SchemaImporter.loadFromFolderStatic).toHaveBeenCalledWith({
            excludeSchemasWithImports: true,
            excludeSchemasWithRequiredServerParams: true,
            addAdditionalMetaData: false,
            outputType: 'onlySchema'
        })
    })
})

describe('Default export fetch handler', () => {
    it('should export default fetch handler', async () => {
        const defaultExport = await import('../../src/index')
        expect(defaultExport.default).toBeDefined()
        expect(defaultExport.default.fetch).toBeDefined()
        expect(typeof defaultExport.default.fetch).toBe('function')
    })
})