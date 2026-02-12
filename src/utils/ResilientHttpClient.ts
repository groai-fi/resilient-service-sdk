import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from 'opossum';

export interface ResilientClientConfig {
    // Retry configuration
    retries?: number;
    retryStatusCodes?: number[];
    retryDelay?: (retryCount: number) => number;

    // Circuit breaker configuration
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;

    // Base configuration
    baseURL?: string;
    defaultHeaders?: Record<string, string>;
}

export class ResilientHttpClient {
    private axiosClient: AxiosInstance;
    private breakers: Map<string, CircuitBreaker<[url: string, config?: AxiosRequestConfig], any>> = new Map();
    private config: ResilientClientConfig;

    constructor(config: ResilientClientConfig = {}) {
        this.config = {
            retries: 3,
            retryStatusCodes: [408, 413, 429, 500, 502, 503, 504],
            timeout: 5000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000,
            ...config
        };

        // Create axios instance
        this.axiosClient = axios.create({
            baseURL: this.config.baseURL,
            headers: this.config.defaultHeaders,
            timeout: this.config.timeout
        });

        // Configure retry logic
        axiosRetry(this.axiosClient, {
            retries: this.config.retries,
            retryDelay: this.config.retryDelay || axiosRetry.exponentialDelay,
            retryCondition: (error: AxiosError) => {
                return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                    (error.response?.status !== undefined &&
                        this.config.retryStatusCodes!.includes(error.response.status));
            }
        });
    }

    private getBreaker(key: string = 'default'): CircuitBreaker<[url: string, config?: AxiosRequestConfig], any> {
        if (!this.breakers.has(key)) {
            const breaker = new CircuitBreaker(
                async (url: string, config?: AxiosRequestConfig) => {
                    return await this.axiosClient.request({ ...config, url });
                },
                {
                    timeout: this.config.timeout! * 2,
                    errorThresholdPercentage: this.config.errorThresholdPercentage,
                    resetTimeout: this.config.resetTimeout,
                    errorFilter: (error: any) => {
                        return !(error.response?.status === 429);
                    }
                }
            );
            this.breakers.set(key, breaker);
        }
        return this.breakers.get(key)!;
    }

    // Convenience methods
    async get(url: string, config?: AxiosRequestConfig, circuitKey?: string) {
        const breaker = this.getBreaker(circuitKey);
        return breaker.fire(url, { ...config, method: 'GET' });
    }

    async post(url: string, data?: any, config?: AxiosRequestConfig, circuitKey?: string) {
        const breaker = this.getBreaker(circuitKey);
        return breaker.fire(url, {
            ...config,
            method: 'POST',
            data
        });
    }

    async put(url: string, data?: any, config?: AxiosRequestConfig, circuitKey?: string) {
        const breaker = this.getBreaker(circuitKey);
        return breaker.fire(url, {
            ...config,
            method: 'PUT',
            data
        });
    }

    async delete(url: string, config?: AxiosRequestConfig, circuitKey?: string) {
        const breaker = this.getBreaker(circuitKey);
        return breaker.fire(url, { ...config, method: 'DELETE' });
    }

    // Generic request method
    async request(url: string, config?: AxiosRequestConfig, circuitKey?: string) {
        const breaker = this.getBreaker(circuitKey);
        return breaker.fire(url, config);
    }

    // Get circuit breaker status
    getCircuitStatus(key: string = 'default') {
        const breaker = this.breakers.get(key);
        return breaker ? {
            isOpen: breaker.opened,
            isHalfOpen: breaker.halfOpen,
            isClosed: breaker.closed,
            stats: breaker.stats
        } : null;
    }

    // Manually reset circuit breaker
    resetCircuit(key: string = 'default') {
        const breaker = this.breakers.get(key);
        if (breaker) breaker.close();
    }
}
