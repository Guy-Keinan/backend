import axios from 'axios';

/**
 * סקריפט בדיקה ל-Rate Limiting
 */

const API_URL = 'http://localhost:3000';

const testRateLimit = async () => {
    console.log('🧪 Testing Rate Limiting...\n');

    // 1. בדיקת auth rate limit
    console.log('1️⃣ Testing Auth Rate Limit (5 attempts allowed)...');

    for (let i = 1; i <= 7; i++) {
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                email: 'test@example.com',
                password: 'wrong-password'
            });
            console.log(`   Attempt ${i}: ❌ Should not succeed`);
        } catch (error: any) {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;

            if (status === 429) {
                console.log(`   Attempt ${i}: 🛑 Rate limited! ${message}`);
            } else {
                console.log(`   Attempt ${i}: ❌ Failed (${status}) - ${message}`);
            }
        }

        // המתנה קצרה בין בקשות
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 2. בדיקת general rate limit
    console.log('\n2️⃣ Testing General API Rate Limit...');

    let successCount = 0;
    let rateLimitedCount = 0;

    // נשלח 10 בקשות מהירות
    const promises = Array(10).fill(null).map(async (_, i) => {
        try {
            const response = await axios.get(`${API_URL}/api/stories/templates`);
            successCount++;
            return { attempt: i + 1, status: 'success' };
        } catch (error: any) {
            if (error.response?.status === 429) {
                rateLimitedCount++;
                return { attempt: i + 1, status: 'rate-limited' };
            }
            return { attempt: i + 1, status: 'error' };
        }
    });

    const results = await Promise.all(promises);
    console.log(`   Results: ${successCount} successful, ${rateLimitedCount} rate limited`);

    // 3. בדיקת headers
    console.log('\n3️⃣ Checking Rate Limit Headers...');

    try {
        const response = await axios.get(`${API_URL}/api/stories/templates`);
        const headers = response.headers;

        console.log('   Rate Limit Headers:');
        console.log(`   - X-RateLimit-Limit: ${headers['x-ratelimit-limit'] || 'N/A'}`);
        console.log(`   - X-RateLimit-Remaining: ${headers['x-ratelimit-remaining'] || 'N/A'}`);
        console.log(`   - X-RateLimit-Reset: ${headers['x-ratelimit-reset'] || 'N/A'}`);

        if (headers['ratelimit-limit']) {
            console.log(`   - RateLimit-Limit: ${headers['ratelimit-limit']}`);
            console.log(`   - RateLimit-Remaining: ${headers['ratelimit-remaining']}`);
            console.log(`   - RateLimit-Reset: ${headers['ratelimit-reset']}`);
        }
    } catch (error) {
        console.log('   Failed to get headers');
    }

    console.log('\n✅ Rate Limit test completed!');
    console.log('\n💡 Tips:');
    console.log('   - Auth endpoints: 5 attempts per 15 minutes');
    console.log('   - General API: 100 requests per 15 minutes');
    console.log('   - Story generation: 20 per hour');
};

// הפעלת הבדיקה
testRateLimit().catch(console.error);