# Resilient Service SDK v1

A generic, resilience-first SDK for building reliable backend services.

## Features

- **ResilientHttpClient**: A wrapper around Axios with built-in retries, timeouts, and per-endpoint circuit breakers.
- **CacheService**: A unified caching layer that defaults to Redis but automatically falls back to in-memory caching if Redis is down.
- **HealthCheckService**: A standardized startup check for environment variables, external HTTP dependencies, and Redis.
- **FailureManager**: A watchdog for background processes to prevent zombie containers.

## Installation

```bash
npm install @groaifi/resilient-service-sdk
```

## Usage

### 1. HTTP Client
```typescript
import { ResilientHttpClient } from '@groaifi/resilient-service-sdk';

interface PriceData {
    bitcoin: { usd: number };
}

const client = new ResilientHttpClient({ retries: 3 });

// Circuit key 'coingecko' isolates failures
// Generic type <PriceData> ensures response.data is correctly typed
const response = await client.get<PriceData>('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {}, 'coingecko');
console.log(response.data.bitcoin.usd);
```

### 2. Caching
```typescript
import { CacheService } from '@groaifi/resilient-service-sdk';

interface UserSession {
    id: string;
    exp: number;
}

const cache = new CacheService({ redisUrl: process.env.REDIS_URL });

await cache.set('session_123', { id: 'abc', exp: 123456 }, 3600);
const session = await cache.get<UserSession>('session_123');
```

### 3. Health Checks
```typescript
import { HealthCheckService } from '@groaifi/resilient-service-sdk';

const health = new HealthCheckService({
  httpEndpoints: { google: 'https://google.com' },
  requiredEnvVars: ['API_KEY']
});

// Run health checks before starting server
await health.runAllChecks();
```

## License

Apache-2.0

