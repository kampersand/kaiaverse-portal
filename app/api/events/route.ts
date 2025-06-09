import { NextResponse } from 'next/server';
import getRedisClient from '../../../lib/redis';

const redis = getRedisClient();

// 事件数据类型 - 与 Luma 事件结构保持一致
export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: string;
  registrationLink: string;
  imageUrl?: string;
  status: 'upcoming' | 'ongoing' | 'past';
  tags?: string[];
  // 为了兼容前端，添加 date 字段
  date: string;
}

// 内存缓存
interface CacheData {
  events: Event[];
  timestamp: number;
  lastSyncTime?: string;
}

let memoryCache: CacheData | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 重试函数
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`操作失败，重试 ${i + 1}/${maxRetries}:`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

// 检查缓存是否有效
function isCacheValid(cache: CacheData | null, currentSyncTime?: string): boolean {
  if (!cache) return false;
  
  const now = Date.now();
  const cacheAge = now - cache.timestamp;
  
  // 如果缓存超过5分钟，则无效
  if (cacheAge > CACHE_DURATION) {
    console.log('缓存已过期，需要重新获取数据');
    return false;
  }
  
  // 如果同步时间发生变化，则缓存无效
  if (currentSyncTime && cache.lastSyncTime && currentSyncTime !== cache.lastSyncTime) {
    console.log('检测到新的同步数据，缓存失效');
    return false;
  }
  
  return true;
}

// 获取最后同步时间
async function getLastSyncTime(): Promise<string | null> {
  try {
    const syncStatsJson = await redis.get('luma:sync:stats');
    if (syncStatsJson) {
      const syncStats = JSON.parse(syncStatsJson);
      return syncStats.last_sync;
    }
  } catch (error) {
    console.warn('获取同步时间失败:', error);
  }
  return null;
}

// 获取所有 Luma 事件
async function getAllLumaEvents(): Promise<Event[]> {
  return retryOperation(async () => {
    // 先检查最后同步时间
    const currentSyncTime = await getLastSyncTime();
    
    // 检查内存缓存是否有效
    if (isCacheValid(memoryCache, currentSyncTime || undefined)) {
      console.log(`使用内存缓存数据，缓存中有 ${memoryCache!.events.length} 个事件`);
      return memoryCache!.events;
    }
    
    console.log('缓存无效或不存在，从 Redis 获取数据...');
    
    // 获取所有 Luma 事件键
    const eventKeys = await redis.keys('luma:event:*');
    
    if (eventKeys.length === 0) {
      console.log('未找到 Luma 事件数据，请先运行同步命令: pnpm run redis sync-luma');
      // 即使没有数据也要缓存，避免频繁查询
      memoryCache = {
        events: [],
        timestamp: Date.now(),
        lastSyncTime: currentSyncTime || undefined
      };
      return [];
    }
    
    const events: Event[] = [];
    
    // 获取每个事件的数据
    for (const key of eventKeys) {
      try {
        const eventData = await redis.get(key);
        if (eventData) {
          const lumaEvent = JSON.parse(eventData);
          
          // 转换为前端期望的格式
          const event: Event = {
            id: lumaEvent.id,
            title: lumaEvent.title,
            description: lumaEvent.description,
            startDate: lumaEvent.startDate,
            endDate: lumaEvent.endDate,
            location: lumaEvent.location,
            registrationLink: lumaEvent.registrationLink,
            imageUrl: lumaEvent.imageUrl,
            status: lumaEvent.status,
            tags: lumaEvent.tags,
            // 为了兼容前端，格式化日期
            date: new Date(lumaEvent.startDate).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
          
          events.push(event);
        }
      } catch (error) {
        console.warn(`解析事件数据失败，键: ${key}`, error);
      }
    }
    
    // 按开始时间倒序排序（最新的事件在前面）
    events.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    // 更新内存缓存
    memoryCache = {
      events,
      timestamp: Date.now(),
      lastSyncTime: currentSyncTime || undefined
    };
    
    console.log(`成功获取并缓存 ${events.length} 个 Luma 事件`);
    return events;
  });
}

export async function GET() {
  try {
    const events = await getAllLumaEvents();
    
    // 添加缓存控制头
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5分钟缓存，10分钟过期重新验证
      'X-Cache-Status': memoryCache && isCacheValid(memoryCache) ? 'HIT' : 'MISS',
    };
    
    return NextResponse.json({ 
      events,
      meta: {
        total: events.length,
        cached: memoryCache && isCacheValid(memoryCache),
        cacheAge: memoryCache ? Date.now() - memoryCache.timestamp : 0
      }
    }, { headers });
  } catch (error) {
    console.error('获取 Luma 事件列表失败:', error);
    return NextResponse.json(
      { error: '获取事件列表失败，请检查 Redis 连接或运行事件同步' },
      { status: 500 }
    );
  }
}

// POST 方法暂时禁用，因为我们只从 Luma 读取事件
export async function POST(request: Request) {
  return NextResponse.json(
    { error: '事件数据现在从 Luma 同步，请使用同步命令添加事件' },
    { status: 405 }
  );
}

// 清除缓存的辅助函数（可以在需要时调用）
export function clearCache() {
  memoryCache = null;
  console.log('内存缓存已清除');
} 