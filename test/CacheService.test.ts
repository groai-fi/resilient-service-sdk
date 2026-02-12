import { CacheService } from '../src/services/CacheService';
import { createClient } from 'redis';

// Mock Redis and NodeCache
jest.mock('redis', () => ({
    createClient: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
    })),
}));

describe('CacheService', () => {
    let service: CacheService;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with in-memory cache when no redisUrl is provided', () => {
        service = new CacheService({});
        // We can inspect private fields via 'any' casting if needed for white-box testing
        // Or check behavior
    });

    it('should set and get values from in-memory cache', async () => {
        service = new CacheService({});
        await service.set('test-key', { foo: 'bar' });

        // Since we are black-boxing NodeCache which is real code here (unless mocked globally),
        // we can test actual functionality
        const val = await service.get('test-key');
        expect(val).toEqual({ foo: 'bar' });
    });

    it('should initialize with Redis when redisUrl provided', () => {
        const redisUrl = 'redis://localhost:6379';
        service = new CacheService({ redisUrl });
        expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ url: redisUrl }));
    });
});
