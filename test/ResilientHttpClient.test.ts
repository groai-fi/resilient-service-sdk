import { ResilientHttpClient } from '../src/utils/ResilientHttpClient';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Create a new instance of MockAdapter on the axios instance
const mock = new MockAdapter(axios);

describe('ResilientHttpClient', () => {
    let client: ResilientHttpClient;

    beforeEach(() => {
        mock.reset();
        client = new ResilientHttpClient({
            retries: 2,
            timeout: 1000,
            resetTimeout: 200 // Fast reset for testing
        });
    });

    it('should successfully make a GET request', async () => {
        mock.onGet('https://api.example.com/data').reply(200, { success: true });

        const result = await client.get('https://api.example.com/data');
        expect(result.data).toEqual({ success: true });
    });

    it('should retry on 500 error and eventually succeed', async () => {
        // Fail twice with 500, then succeed
        mock.onGet('https://api.example.com/flaky').replyOnce(500);
        mock.onGet('https://api.example.com/flaky').replyOnce(500);
        mock.onGet('https://api.example.com/flaky').reply(200, { recovered: true });

        const result = await client.get('https://api.example.com/flaky');
        expect(result.data).toEqual({ recovered: true });
    });
});
