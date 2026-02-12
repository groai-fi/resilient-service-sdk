import { createClient } from 'redis';

export interface HealthCheckConfig {
    httpEndpoints?: Record<string, string>; // { "Google": "https://google.com" }
    redisUrl?: string;
    requiredEnvVars?: string[];
}

export class HealthCheckService {
    private config: HealthCheckConfig;

    constructor(config: HealthCheckConfig = {}) {
        this.config = config;
    }

    async runAllChecks(): Promise<void> {
        console.log('Running startup health checks...');
        await this.checkEnvVars();
        await this.checkHttpEndpoints();
        await this.checkRedisConnection();
        console.log('✅ Health checks passed.');
    }

    private async checkEnvVars(): Promise<void> {
        if (!this.config.requiredEnvVars) return;

        const missing = this.config.requiredEnvVars.filter((key) => !process.env[key]);
        if (missing.length > 0) {
            throw new Error(`Health check failed: Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    /**
     * Replaces the Ethereum-specific check with a generic HTTP check.
     * This allows checking RPC nodes via detailed HTTP calls if needed,
     * but decouples the library from ethers.js.
     */
    private async checkHttpEndpoints(): Promise<void> {
        if (!this.config.httpEndpoints) return;

        console.log(`Checking HTTP endpoints...`);

        // We use fetch here to avoid circular dependency on our own ResilientHttpClient or adding axios here if we want to keep it light
        // Or we can use the global fetch available in Node 18+
        for (const [name, url] of Object.entries(this.config.httpEndpoints)) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                // Accept any 2xx or 3xx status, failure usually means network error or 5xx
                // For RPCs, they often return 405 on HEAD or GET, but connectivity is what we care about here.
                // If standard connectivity check is needed, a 200 OK on a health endpoint is best.
                // Assuming simple connectivity check:
                if (response.ok || response.status === 405 || response.status === 404) {
                    console.log(`✅ ${name} is reachable.`);
                } else {
                    console.warn(`⚠️ ${name} returned status ${response.status}.`);
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`${name} connection error:`, errorMessage);
                throw new Error(`Health check failed: Could not connect to ${name} at ${url}.`);
            }
        }
    }

    private async checkRedisConnection(): Promise<void> {
        const redisUrl = this.config.redisUrl;
        if (!redisUrl) {
            return;
        }

        console.log(`Checking Redis connection to: ${redisUrl}`);
        try {
            const client = createClient({ url: redisUrl });
            await client.connect();
            await client.ping();
            await client.quit();
            console.log('✅ Redis connection successful.');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Redis connection error:', errorMessage);
            throw new Error(`Health check failed: Could not connect to Redis at ${redisUrl}.`);
        }
    }
}
