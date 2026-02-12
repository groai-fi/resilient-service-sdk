# Resilient Service SDK v1

A generic, resilience-first SDK for building reliable backend services.

## Features

- **ResilientHttpClient**: A wrapper around Axios with built-in retries, timeouts, and per-endpoint circuit breakers.
- **CacheService**: A unified caching layer that defaults to Redis but automatically falls back to in-memory caching if Redis is down.
- **HealthCheckService**: A standardized startup check for environment variables, external HTTP dependencies, and Redis.
- **FailureManager**: A watchdog for background processes to prevent zombie containers.

## Installation

```bash
npm install @groai-fi/resilient-service-sdk
```

## Usage

### 1. HTTP Client
```typescript
import { ResilientHttpClient } from '@groai-fi/resilient-service-sdk';

const client = new ResilientHttpClient({ retries: 3 });
// Circuit key 'coingecko' isolates failures
const data = await client.get('https://api.coingecko.com/...', {}, 'coingecko');
```

### 2. Caching
```typescript
import { CacheService } from '@groai-fi/resilient-service-sdk';

const cache = new CacheService({ redisUrl: process.env.REDIS_URL });
await cache.set('key', { foo: 'bar' }, 60);
```

### 3. Health Checks
```typescript
import { HealthCheckService } from '@groai-fi/resilient-service-sdk';

const health = new HealthCheckService({
  httpEndpoints: { google: 'https://google.com' }, // Example check
  requiredEnvVars: ['API_KEY']
});

// Run health checks before starting server
await health.RunAllChecks();
```

