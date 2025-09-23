import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { createServer } from 'node:http'


class HonoServerManager {
    #app

    initServer( { routePath = '/mcp', mcpServer } ) {
        this.#app = new Hono();
        this.transports = {};
        this.mcpServer = mcpServer;
        this.routePath = routePath;

        return { app: this.#app }
    }

    #handleMcpRequest = async (req, res) => {
        let body;
        try {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            await new Promise((resolve) => req.on('end', resolve));
            body = JSON.parse(Buffer.concat(chunks).toString());
        } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32700, message: 'Parse error' },
                id: null
            }));
            return;
        }

        const sessionId = req.headers['mcp-session-id'];
        let transport;

        if (sessionId && this.transports[sessionId]) {
            // Reuse existing transport
            transport = this.transports[sessionId];
        } else if (!sessionId && isInitializeRequest(body)) {
            // New initialization request
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sessionId) => {
                    // Store the transport by session ID
                    this.transports[sessionId] = transport;
                },
                // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
                // locally, make sure to set:
                // enableDnsRebindingProtection: true,
                // allowedHosts: ['127.0.0.1'],
            });

            // Clean up transport when closed
            transport.onclose = () => {
                if (transport.sessionId) {
                    delete this.transports[transport.sessionId];
                }
            };

            // Connect to the MCP server
            await this.mcpServer.connect(transport);
        } else {
            // Invalid request
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Bad Request: No valid session ID provided',
                },
                id: null,
            }));
            return;
        }

        // Handle the request
        await transport.handleRequest(req, res, body);
    }

    #handleSessionRequest = async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        if (!sessionId || !this.transports[sessionId]) {
            res.statusCode = 400;
            res.end('Invalid or missing session ID');
            return;
        }

        const transport = this.transports[sessionId];
        await transport.handleRequest(req, res);
    }


    startServer( { serverPort } ) {
        console.log( `Starting Hono server on port ${serverPort}...` )

        // Create a native Node.js HTTP server that works with StreamableHTTPServerTransport
        const server = createServer( async (req, res) => {
            if (req.url === this.routePath) {
                if (req.method === 'POST') {
                    await this.#handleMcpRequest(req, res);
                } else if (req.method === 'GET' || req.method === 'DELETE') {
                    await this.#handleSessionRequest(req, res);
                } else {
                    res.statusCode = 405;
                    res.end('Method Not Allowed');
                }
            } else {
                res.statusCode = 404;
                res.end('Not Found');
            }
        })

        server.listen(serverPort, () => {
            console.log(`Hono server running on port ${serverPort}`)
        })
    }
}


export { HonoServerManager }