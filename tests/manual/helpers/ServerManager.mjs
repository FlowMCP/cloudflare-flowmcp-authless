import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

class ServerManager {
	#app;

	initServer({ routePath = "/mcp", mcpServer }) {
		this.#app = express();
		this.#app.use(express.json());
		const transports = {};
		this.#app.post(routePath, async (req, res) => {
			const sessionId = req.headers["mcp-session-id"];
			let transport;

			if (sessionId && transports[sessionId]) {
				// Reuse existing transport
				transport = transports[sessionId];
			} else if (!sessionId && isInitializeRequest(req.body)) {
				// New initialization request
				transport = new StreamableHTTPServerTransport({
					sessionIdGenerator: () => randomUUID(),
					onsessioninitialized: (sessionId) => {
						// Store the transport by session ID
						transports[sessionId] = transport;
					},
					// DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
					// locally, make sure to set:
					// enableDnsRebindingProtection: true,
					// allowedHosts: ['127.0.0.1'],
				});

				// Clean up transport when closed
				transport.onclose = () => {
					if (transport.sessionId) {
						delete transports[transport.sessionId];
					}
				};

				// ... set up server resources, tools, and prompts ...

				// Connect to the MCP server
				await mcpServer.connect(transport);
			} else {
				// Invalid request
				res.status(400).json({
					jsonrpc: "2.0",
					error: {
						code: -32000,
						message: "Bad Request: No valid session ID provided",
					},
					id: null,
				});
				return;
			}

			// Handle the request
			await transport.handleRequest(req, res, req.body);
		});

		// Reusable handler for GET and DELETE requests
		const handleSessionRequest = async (req, res) => {
			const sessionId = req.headers["mcp-session-id"];
			if (!sessionId || !transports[sessionId]) {
				res.status(400).send("Invalid or missing session ID");
				return;
			}

			const transport = transports[sessionId];
			await transport.handleRequest(req, res);
		};

		// Handle GET requests for server-to-client notifications via SSE
		this.#app.get(routePath, handleSessionRequest);

		// Handle DELETE requests for session termination
		this.#app.delete(routePath, handleSessionRequest);

		return { app: this.#app };
	}

	startServer({ serverPort }) {
		console.log(`Starting server on port ${serverPort}...`);
		this.#app.listen(serverPort);
	}
}

export { ServerManager };
