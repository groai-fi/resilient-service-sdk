export class FailureManager {
    private consecutiveFailures = 0;
    private failureThreshold: number;
    private exitProcess: boolean;

    constructor(failureThreshold = 3, exitProcess = true) {
        this.failureThreshold = failureThreshold;
        this.exitProcess = exitProcess;
        console.log(`Initialized FailureManager with threshold: ${this.failureThreshold}`);
    }

    /**
     * Call this method when an operation succeeds. Resets the failure counter.
     */
    handleSuccess() {
        if (this.consecutiveFailures > 0) {
            console.log(`✅ Success observed. Resetting consecutive failure count from ${this.consecutiveFailures} to 0.`);
            this.consecutiveFailures = 0;
        }
    }

    /**
     * Call this method when a critical operation fails. Increments the counter
     * and exits the process if the threshold is reached.
     */
    handleFailure() {
        this.consecutiveFailures++;
        console.warn(`FailureManager: Consecutive failures: ${this.consecutiveFailures}/${this.failureThreshold}`);

        if (this.consecutiveFailures >= this.failureThreshold) {
            console.error(`🚨 Reached failure threshold (${this.failureThreshold}). Exiting application gracefully...`);
            if (this.exitProcess) {
                process.exit(1);
            } else {
                // In library mode where we don't want to exit, we could emit an event or just log
                // But for now, sticking to the original design pattern of "Watchdog"
                throw new Error(`Failure threshold reached (${this.failureThreshold})`);
            }
        }
    }
}
