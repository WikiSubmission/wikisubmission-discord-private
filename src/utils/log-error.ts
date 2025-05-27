import { DiscordAPIError, HTTPError } from 'discord.js';

/**
 * Logs a structured error message to the console with source trace.
 * Differentiates Discord API errors, HTTP errors, and general Node errors.
 * Automatically includes source file and line from the calling context.
 *
 * @param error - The error object (DiscordAPIError, HTTPError, generic Error, or unknown)
 * @param context - A string label describing the error context (e.g., function or module name)
 */
export function logError(error: unknown, context: string = 'Discord Error'): void {
    const source = getCallerInfo(); // Infer the file and line number that called this function

    if (error instanceof DiscordAPIError) {
        // Specific handling for Discord API errors
        console.error(`[${context}] DiscordAPIError at ${source}: ${error.message}`);
        console.error(`Status: ${error.status}, Code: ${error.code}`);
        if (error.requestBody?.json) {
            console.error('Request Body:', JSON.stringify(error.requestBody.json, null, 2));
        }
    } else if (error instanceof HTTPError) {
        // Less specific HTTP-level error from discord.js REST client
        console.error(`[${context}] HTTPError at ${source}: ${error.message}`);
        console.error(`Status: ${error.status}`);
    } else if (error instanceof Error) {
        // Fallback for generic JS errors
        console.error(`[${context}] Error at ${source}: ${error.message}`);
        console.error(error.stack);
    } else {
        // Catch-all for unknown error types (e.g., string, null, object)
        console.error(`[${context}] Unknown error at ${source}:`, error);
    }
}

/**
 * Extracts the location (file and line number) of the function that called `logDiscordError`.
 * Uses stack trace manipulation to find the first relevant frame outside this module.
 *
 * @returns A string representing the calling file/function/line, or 'unknown source' if unavailable.
 */
function getCallerInfo(): string {
    const obj = {};
    Error.captureStackTrace(obj, getCallerInfo); // Remove getCallerInfo from the stack trace
    const stack = (obj as any).stack as string;

    // Split into lines and ignore the first two (getCallerInfo and logDiscordError)
    const lines = stack.split('\n').slice(2);
    
    // Find the first external caller frame not referencing logDiscordError itself
    const callerLine = lines.find(line => !line.includes('logDiscordError')) || lines[0];
    
    // Clean up and return the frame info
    return callerLine?.trim().replace(/^at\s+/, '') || 'unknown source';
}