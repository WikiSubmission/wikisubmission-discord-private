import dotenv from "dotenv";
import http from "http";
import { GlobalCache } from "./utils/global-cache";
import { Bot } from "./bot/client";

(async () => {
    // [Environment]
    dotenv.config();
    process.env.TZ = "America/Denver";
    console.log(
        `NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`,
    );
    if (process.env.SUPABASE_URL && process.env.SUPABASE_API_KEY) {
        console.log(`Environment variables loaded (supabase keys found)\n`);
    } else if (process.env.BOT_TOKEN || process.env.BOT_CLIENT_ID) {
        console.log(`Environment variables loaded (using token/client ID from .env)\n`)
    } else {
        console.error(
            `Missing environment variables: SUPABASE_URL, SUPABASE_API_KEY`,
        );
        process.exit(1);
    }

    // [Server]
    const server = http.createServer();
    server.listen(process.env.PORT || 8080);

    // [Bot]
    const instance = new Bot();
    GlobalCache.set("bot_instance", instance);
    await instance.start();
})();