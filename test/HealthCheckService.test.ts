import { HealthCheckService } from '../src/services/HealthCheckService';

describe('HealthCheckService', () => {
    let service: HealthCheckService;

    beforeEach(() => {
        service = new HealthCheckService({
            requiredEnvVars: ['API_KEY'],
        });
    });

    it('should pass if all required env vars are present', async () => {
        process.env.API_KEY = 'test-key';
        await expect(service.runAllChecks()).resolves.not.toThrow();
        delete process.env.API_KEY;
    });

    it('should fail if a required env var is missing', async () => {
        delete process.env.API_KEY;
        await expect(service.runAllChecks()).rejects.toThrow('Health check failed: Missing required environment variables: API_KEY');
    });
});
