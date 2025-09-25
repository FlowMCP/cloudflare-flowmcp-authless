# FlowMCP Remote Schema Server

A remote MCP (Model Context Protocol) server that dynamically loads and serves FlowMCP schemas as tools via Cloudflare Workers.

## Overview

This server automatically imports FlowMCP schemas and exposes them as MCP tools that can be used by AI assistants like Claude. It supports flexible configuration for filtering schemas by namespaces and tags.

## Features

- 🚀 **Dynamic Schema Loading** - Automatically loads FlowMCP schemas at runtime
- 🔧 **Configurable Filtering** - Filter schemas by namespaces and tags via environment variables
- ☁️ **Cloudflare Workers** - Runs on Cloudflare's global edge network
- 🔌 **MCP Compatible** - Works with any MCP-compatible client (Claude Desktop, AI Playground)
- 🔐 **No Authentication Required** - Simple setup for testing and development

## Quick Start

### Deploy to Cloudflare Workers

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/flowmcp/remote-mcp-server-authless)

This will deploy your MCP server to: `remote-mcp-server-authless.<your-account>.workers.dev/sse`

### Local Development

```bash
# Clone the repository
git clone https://github.com/flowmcp/remote-mcp-server-authless.git
cd remote-mcp-server-authless

# Install dependencies
npm install

# Start development server
npm run dev
```

## Configuration

Configure the server behavior using environment variables in `wrangler.jsonc` or your Cloudflare Workers dashboard:

| Variable | Default | Description |
|----------|---------|-------------|
| `ROUTE_PATH` | `/mcp` | The HTTP endpoint path for the MCP server |
| `SCHEMA_EXCLUDE_IMPORTS` | `true` | Exclude schemas that have imports |
| `SCHEMA_EXCLUDE_SERVER_PARAMS` | `true` | Exclude schemas requiring server parameters |
| `SCHEMA_ADD_METADATA` | `false` | Add additional metadata to schemas |
| `FILTER_INCLUDE_NAMESPACES` | `""` | Comma-separated list of namespaces to include |
| `FILTER_EXCLUDE_NAMESPACES` | `""` | Comma-separated list of namespaces to exclude |
| `FILTER_ACTIVATE_TAGS` | `""` | Comma-separated list of tags to activate |

### Example Configuration

```jsonc
// wrangler.jsonc
{
  "vars": {
    "FILTER_INCLUDE_NAMESPACES": "payment,auth",
    "FILTER_EXCLUDE_NAMESPACES": "deprecated",
    "FILTER_ACTIVATE_TAGS": "production"
  }
}
```

## Connect to Claude Desktop

To use this MCP server with Claude Desktop:

1. Deploy your server to Cloudflare Workers (see Quick Start)
2. Open Claude Desktop and go to **Settings > Developer > Edit Config**
3. Add your server configuration:

```json
{
  "mcpServers": {
    "flowmcp-schemas": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://remote-mcp-server-authless.<your-account>.workers.dev/sse"
      ]
    }
  }
}
```

4. Restart Claude Desktop - your FlowMCP tools will be available!

## Connect to Cloudflare AI Playground

You can also test your MCP server directly in the browser:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your server URL: `https://remote-mcp-server-authless.<your-account>.workers.dev/sse`
3. Your FlowMCP tools are now available in the playground!

## Development

### Project Structure

```
├── src/
│   ├── index.ts           # Main server implementation
│   ├── types.d.ts         # TypeScript type definitions
│   └── schema-paths.mjs   # Schema path configurations
├── custom-schemas/         # Custom schema definitions (optional)
├── tests/                  # Test files
├── wrangler.jsonc         # Cloudflare Workers configuration
└── package.json           # Node.js dependencies
```

### Adding Custom Tools

To add custom tools beyond the FlowMCP schemas, edit `src/index.ts`:

```typescript
async init() {
  // ... existing schema loading code ...

  // Add custom tool
  this.server.tool("my-custom-tool", {
    description: "My custom tool description",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string" }
      }
    }
  }, async (params) => ({
    content: [{
      type: "text",
      text: `Processed: ${params.input}`
    }]
  }));
}
```

### Testing

```bash
# Run development server
npm run dev

# Type checking
npm run type-check

# Format code
npm run format

# Lint and fix
npm run lint:fix
```

## Deployment

### Deploy to Production

```bash
npm run deploy
```

This deploys your server to Cloudflare Workers using the configuration in `wrangler.jsonc`.

### Environment-Specific Deployment

```bash
# Deploy with custom environment variables
wrangler deploy --var FILTER_INCLUDE_NAMESPACES:payment,checkout
```

## Troubleshooting

### Server Not Loading Schemas

1. Check the console logs in Wrangler dev mode: `npm run dev`
2. Verify schema importer configuration in environment variables
3. Ensure FlowMCP and SchemaImporter packages are properly installed

### Claude Desktop Connection Issues

1. Ensure `mcp-remote` is installed: `npm install -g mcp-remote`
2. Verify your server URL is correct and accessible
3. Check Claude Desktop console for error messages
4. Restart Claude Desktop after configuration changes

## Dependencies

- **@modelcontextprotocol/sdk** - MCP SDK for building MCP servers
- **agents** - Agent framework for MCP integration
- **flowmcp** - FlowMCP schema library
- **schemaimporter** - Dynamic schema importing utility
- **hono** - Lightweight web framework for Cloudflare Workers

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/flowmcp/remote-mcp-server-authless/issues)
- Check the [FlowMCP documentation](https://github.com/flowmcp/flowmcp)
- Review the [MCP specification](https://modelcontextprotocol.io)