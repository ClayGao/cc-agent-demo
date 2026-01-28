/**
 * cc-agent-demo - Claude Agent SDK HTTP Server
 */

import "dotenv/config";
import { createServer } from "node:http";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options } from "@anthropic-ai/claude-agent-sdk";

const PORT = process.env.PORT || 3000;

const options: Options = {
  model: "claude-sonnet-4-5",
  systemPrompt: "你是一個友善的 AI 助手，請使用繁體中文回覆。",
  permissionMode: "acceptEdits",
  maxTurns: 10,
} as Options;

async function chat(prompt: string): Promise<string> {
  const response = query({ prompt, options });
  let result = "";

  for await (const message of response) {
    if (message.type === "assistant") {
      const content = message.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text") {
            result += block.text;
          }
        }
      }
    }
  }

  return result;
}

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // Chat endpoint
  if (url.pathname === "/chat") {
    const prompt = url.searchParams.get("prompt");

    if (!prompt) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing prompt parameter" }));
      return;
    }

    try {
      console.log(`[Chat] ${prompt}`);
      const result = await chat(prompt);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ prompt, response: result }));
    } catch (error) {
      console.error("[Error]", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("[ERROR] Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Endpoints]`);
  console.log(`  GET /health - Health check`);
  console.log(`  GET /chat?prompt=你好 - Chat with AI`);
});
