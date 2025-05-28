import dotenv from "dotenv";
import http from "http";
import { Bot } from "./bot/client";

(async () => {
    // [Environment]
    dotenv.config();
    console.log(
        `NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`,
    );
    if (process.env.SUPABASE_URL && process.env.SUPABASE_API_KEY) {
        console.log(`Environment variables loaded (supabase keys found)\n`);
    } else if (process.env.BOT_TOKEN || process.env.BOT_CLIENT_ID) {
        console.log(`Environment variables loaded (using token/client ID from .env)\n`)
    } else {
        console.error(
            `Missing environment variables (BOT_TOKEN, BOT_CLIENT_ID) or (SUPABASE_URL, SUPABASE_API_KEY)`,
        );
        process.exit(1);
    }

    // [Server]
    const server = http.createServer((req, res) => {
        if (req.url === "/" || req.url === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        }
    });

    server.listen(process.env.PORT || 8080);

    // [Bot]
    await Bot.instance.start();
})();