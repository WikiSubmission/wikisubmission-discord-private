import { WikiSubmission } from "wikisubmission-sdk";

export const ws = WikiSubmission.Quran.V1.createAPIClient({
    enableRequestLogging: true
});