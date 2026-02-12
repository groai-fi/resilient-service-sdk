import { createClient, RedisClientType } from 'redis';
import CircuitBreaker from 'opossum';
import NodeCache from 'node-cache';

export interface CacheConfig {
    redisUrl?: string;
    defaultTTL?: number;
    circuitBreaker?: {
        timeout?: number;
        errorThresholdPercentage?: number;
        resetTimeout?: number;
    }
}

export class CacheService {
    private client: RedisClientType | NodeCache;
    private isRedisEnabled: boolean;
    private circuitBreaker: CircuitBreaker;

    constructor(config: CacheConfig = {}) {
        if (config.redisUrl) {
            console.log('Redis URL configured, initializing Redis client...');
            this.client = createClient({
                url: config.redisUrl,
                socket: {
                    connectTimeout: 5000
                }
            });

            // Initialize Circuit Breaker for Redis operations
            const circuitBreakerOptions = {
                timeout: config.circuitBreaker?.timeout || 3000,
                errorThresholdPercentage: config.circuitBreaker?.errorThresholdPercentage || 50,
                resetTimeout: config.circuitBreaker?.resetTimeout || 10000
            };

            this.circuitBreaker = new CircuitBreaker(async (operation: () => Promise<any>) => {
                return await operation();
            }, circuitBreakerOptions);

            this.circuitBreaker.fallback(() => {
                console.warn('Circuit breaker open or timeout. Redis operation fallback.');
                return null;
            });

            (this.client as RedisClientType).on('error', (err: any) => console.error('Redis Client Error', err));

            // Handle connection asynchronously but don't block constructor
            (this.client as RedisClientType).connect().catch(err => {
                console.error('Failed to connect to Redis on startup:', err);
                // We don't disable isRedisEnabled here because we want the circuit breaker to handle retries/failures
            });

            this.isRedisEnabled = true;
        } else {
            console.log('No Redis URL configured, initializing in-memory cache.');
            this.client = new NodeCache({ stdTTL: config.defaultTTL || 300 });
            this.isRedisEnabled = false;
            // Mock circuit breaker for symmetry
            this.circuitBreaker = new CircuitBreaker(async (op: any) => op(), {});
        }
    }

    async get<T>(key: string): Promise<T | null> {
        if (this.isRedisEnabled) {
            try {
                const result = await this.circuitBreaker.fire(async () => {
                    const data = await (this.client as RedisClientType).get(key);
                    return data;
                });
                return result ? JSON.parse(result as string) : null;
            } catch (error) {
                console.error(`Error getting key ${key} from Redis (Circuit Breaker):`, error);
                // Potential Enhancement: Fallback to local memory cache if Redis fails?
                // For now, returning null is standard.
                return null;
            }
        } else {
            return (this.client as NodeCache).get(key) as T | null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        const stringValue = JSON.stringify(value);
        if (this.isRedisEnabled) {
            try {
                await this.circuitBreaker.fire(async () => {
                    await (this.client as RedisClientType).set(key, stringValue, {
                        EX: ttlSeconds || 300,
                    });
                });
            } catch (error) {
                console.error(`Error setting key ${key} to Redis (Circuit Breaker):`, error);
            }
        } else {
            (this.client as NodeCache).set(key, value, ttlSeconds || 300);
        }
    }
}
