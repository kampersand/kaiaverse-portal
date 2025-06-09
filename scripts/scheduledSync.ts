import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

import getRedisClient from '../lib/redis';

const redis = getRedisClient();

interface SyncConfig {
  lastSync: number;
  syncInterval: number; // 毫秒
  autoSync: boolean;
}

async function getLastSyncTime(): Promise<number> {
  try {
    const lastSync = await redis.get('luma:last_sync');
    return lastSync ? parseInt(lastSync) : 0;
  } catch {
    return 0;
  }
}

async function setLastSyncTime(timestamp: number): Promise<void> {
  await redis.set('luma:last_sync', timestamp.toString());
}

async function shouldSync(): Promise<boolean> {
  const lastSync = await getLastSyncTime();
  const now = Date.now();
  const syncInterval = 6 * 60 * 60 * 1000; // 6小时
  
  return (now - lastSync) > syncInterval;
}

async function performSync(): Promise<void> {
  console.log('执行定期同步...');
  
  // 这里可以调用实际的同步逻辑
  // 为了演示，我们添加一些新的 Kaia 活动
  const newEvents = [
    {
      id: `luma-scheduled-${Date.now()}`,
      title: 'Kaia Weekly Community Call',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
      location: 'Zoom',
      description: 'Weekly community call to discuss Kaia ecosystem updates and community initiatives.',
      registrationLink: 'https://lu.ma/kaiachain',
      status: 'upcoming' as const,
      lumaId: `scheduled-${Date.now()}`
    }
  ];

  // 获取现有事件
  const existingEvents = await redis.zrange('events', 0, -1);
  const existingEventsData = existingEvents.map((str: string) => JSON.parse(str));

  // 添加新事件
  const pipeline = redis.pipeline();
  newEvents.forEach(event => {
    const score = Date.now();
    pipeline.zadd('events', score, JSON.stringify(event));
  });

  await pipeline.exec();
  
  // 更新同步时间
  await setLastSyncTime(Date.now());
  
  console.log(`定期同步完成，添加了 ${newEvents.length} 个新活动`);
}

async function scheduledSync() {
  try {
    console.log('检查是否需要同步...');
    
    if (await shouldSync()) {
      await performSync();
    } else {
      const lastSync = await getLastSyncTime();
      const nextSync = new Date(lastSync + 6 * 60 * 60 * 1000);
      console.log(`距离下次同步还有时间，下次同步时间: ${nextSync.toLocaleString('zh-CN')}`);
    }
    
    process.exit(0);
  } catch (error: unknown) {
    console.error('定期同步失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// 运行定期同步
scheduledSync(); 