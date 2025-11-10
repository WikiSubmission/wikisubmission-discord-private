# Submission Mod Bot

A moderation bot designed specifically for the 19 Server. While not available for public use, its source code is publicly available as part of a commitment to transparency and open source.

## Developer Setup

Install dependencies using `npm run install`. Then, start the bot with `npm run start`.

The following environment variables are required to be defined inside a .env file at the root directory of the project:

- `BOT_TOKEN`
- `BOT_CLIENT_ID`

For WikiSubmission:

- `NODE_ENV` ("development" or "production")
- `DISCORD_TOKEN_SUBMISSIONMOD`(production token)
- `DISCORD_TOKEN_SUBMISSIONMOD_DEVELOPMENT` (dev token)
- `DISCORD_CLIENTID_SUBMISSIONMOD` (production client ID)
- `DISCORD_CLIENTID_SUBMISSIONMOD_DEVELOPMENT` (dev client ID)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Main Bot

Our main bot, WikiSubmission, can be found [here](https://github.com/WikiSubmission/wikisubmission-discord-public).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contact

Email: [developer@wikisubmission.org](mailto:developer@wikisubmission.org)
