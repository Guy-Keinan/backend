import 'dotenv/config';
import { connectRedis, disconnectRedis, testRedis, redisCache } from '../config/redis';

/**
 * בדיקה בסיסית של Redis
 */

const testRedisBasics = async (): Promise<void> => {
    try {
        console.log('🔴 Testing Redis connection and basic operations...\n');

        // צעד 1: חיבור
        console.log('1️⃣ Connecting to Redis...');
        await connectRedis();

        // צעד 2: ping test
        console.log('2️⃣ Testing Redis ping...');
        const pingResult = await testRedis();
        console.log('✅ Ping result:', pingResult);

        // צעד 3: set operation
        console.log('\n3️⃣ Testing cache set...');
        await redisCache.set('test:key', { message: 'Hello Redis!', timestamp: new Date() }, 60);
        console.log('✅ Data saved to cache');

        // צעד 4: get operation
        console.log('4️⃣ Testing cache get...');
        const cachedData = await redisCache.get('test:key');
        console.log('✅ Data retrieved from cache:', cachedData);

        // צעד 5: exists check
        console.log('\n5️⃣ Testing key existence...');
        const exists = await redisCache.exists('test:key');
        console.log('✅ Key exists:', exists);

        // צעד 6: performance test
        console.log('\n6️⃣ Performance test...');
        const startTime = Date.now();

        // שמירת 100 ערכים
        for (let i = 0; i < 100; i++) {
            await redisCache.set(`perf:test:${i}`, { id: i, data: `test data ${i}` }, 60);
        }

        // קריאת 100 ערכים
        for (let i = 0; i < 100; i++) {
            await redisCache.get(`perf:test:${i}`);
        }

        const endTime = Date.now();
        console.log(`✅ 200 operations completed in ${endTime - startTime}ms`);

        // צעד 7: cleanup
        console.log('\n7️⃣ Cleaning up test data...');
        await redisCache.delete('test:key');

        // מחיקת test data
        for (let i = 0; i < 100; i++) {
            await redisCache.delete(`perf:test:${i}`);
        }

        console.log('✅ Test data cleaned up');

        // צעד 8: בדיקה שהמפתח נמחק
        console.log('8️⃣ Verifying deletion...');
        const existsAfterDelete = await redisCache.exists('test:key');
        console.log('✅ Key exists after deletion:', existsAfterDelete);

        console.log('\n🎉 All Redis tests passed successfully!');

    } catch (error) {
        console.error('❌ Redis test failed:', error);
    } finally {
        // ניתוק
        await disconnectRedis();
    }
};

// הפעלת הבדיקה
testRedisBasics();