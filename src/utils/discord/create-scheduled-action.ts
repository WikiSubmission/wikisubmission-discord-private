import { WScheduledTask } from "../../types/w-scheduled-task";

export class ScheduledTaskManager {
    public static actions: Map<
        string,
        { intervalId: NodeJS.Timeout; action: WScheduledTask }
    > = new Map();

    constructor(public action: WScheduledTask) {
        const {
            id: name,
            interval,
            action: actionFunction,
            triggerImmediately,
        } = action;

        let intervalMs: number;
        switch (interval) {
            case 'EVERY_FIVE_SECONDS':
                intervalMs = 5000;
                break;
            case 'EVERY_MINUTE':
                intervalMs = 60 * 1000;
                break;
            case 'EVERY_HOUR':
                intervalMs = 60 * 60 * 1000;
                break;
            case 'EVERY_DAY':
                intervalMs = 24 * 60 * 60 * 1000;
                break;
            case 'EVERY_OTHER_DAY':
                intervalMs = 48 * 60 * 60 * 1000;
                break;
            case 'EVERY_WEEK':
                intervalMs = 168 * 60 * 60 * 1000;
                break;
            default:
                throw new Error(`Unknown interval: ${interval}`);
        }

        const intervalId = setInterval(async () => {
            try {
                await actionFunction();
                console.log(`✓ Triggered scheduled action: "${action.id}"`);
            } catch (error) {
                console.log(`Error on scheduled action "${action.id}" -->`);
                console.log(error);
            }
        }, intervalMs);

        ScheduledTaskManager.actions.set(name, { intervalId, action });

        if (triggerImmediately) {
            actionFunction()
                .then(() => console.log(`✓ Immediately triggered action: "${action.id}"`))
                .catch((error) => {
                    console.log(`Error on immediate trigger of "${action.id}" -->`);
                    console.log(error);
                });
        }
    }

    stop(name: string): void | Error {
        const actionInfo = ScheduledTaskManager.actions.get(name);
        if (actionInfo) {
            clearInterval(actionInfo.intervalId);
            ScheduledTaskManager.actions.delete(name);
        } else {
            return new Error(
                `Could not find a scheduled action with ID of "${name}". Possible actions are: ${this.listActiveActions().join(
                    ', ',
                )}`,
            );
        }
    }

    async trigger(name: string): Promise<void | Error> {
        const actionInfo = ScheduledTaskManager.actions.get(name);
        if (actionInfo) {
            await actionInfo.action.action();
        } else {
            return new Error(
                `Could not find a scheduled action with ID of "${name}". Possible actions are: ${this.listActiveActions().join(
                    ', ',
                )}`,
            );
        }
    }

    listActiveActions(): string[] {
        return Array.from(ScheduledTaskManager.actions.keys());
    }
}