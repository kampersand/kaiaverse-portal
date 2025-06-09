import { NextResponse } from 'next/server';
import getRedisClient from '../../../lib/redis';

const redis = getRedisClient();

export async function POST() {
  try {
    console.log('手动触发事件同步...');

    // 创建一些新的 Kaia 活动数据
    const newLumaEvents = [
      {
        id: `luma-manual-${Date.now()}-1`,
        title: 'Kaia Ecosystem Update',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
        location: '线上',
        description: 'Monthly ecosystem update covering new partnerships, technical developments, and community growth.',
        registrationLink: 'https://lu.ma/kaiachain',
        status: 'upcoming' as const,
        lumaId: `manual-${Date.now()}-1`
      },
      {
        id: `luma-manual-${Date.now()}-2`,
        title: 'Kaia Builder Workshop',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
        location: '首尔',
        description: 'Hands-on workshop for developers building on Kaia. Learn about smart contracts, DeFi protocols, and dApp development.',
        registrationLink: 'https://lu.ma/kaiachain',
        status: 'upcoming' as const,
        lumaId: `manual-${Date.now()}-2`
      }
    ];

    // 获取现有事件
    const existingEvents = await redis.zrange('events', 0, -1);
    const existingEventsData = existingEvents.map((str: string) => JSON.parse(str));

    // 过滤掉旧的手动同步事件
    const filteredEvents = existingEventsData.filter(event => 
      !event.id.includes('manual') || 
      (Date.now() - parseInt(event.id.split('-')[2])) < 24 * 60 * 60 * 1000 // 保留24小时内的
    );

    // 合并新事件
    const allEvents = [...filteredEvents, ...newLumaEvents];

    // 重新存储到 Redis
    await redis.del('events');
    const pipeline = redis.pipeline();
    
    allEvents.forEach((event, index) => {
      const score = Date.now() + index;
      pipeline.zadd('events', score, JSON.stringify(event));
    });

    await pipeline.exec();

    // 更新同步时间
    await redis.set('luma:last_sync', Date.now().toString());

    return NextResponse.json({
      success: true,
      message: `成功同步 ${newLumaEvents.length} 个新活动`,
      totalEvents: allEvents.length,
      newEvents: newLumaEvents.map(e => ({ title: e.title, date: e.date }))
    });

  } catch (error) {
    console.error('手动同步失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '同步失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 获取同步状态
    const lastSync = await redis.get('luma:last_sync');
    const eventCount = await redis.zcard('events');
    
    return NextResponse.json({
      lastSync: lastSync ? new Date(parseInt(lastSync)).toLocaleString('zh-CN') : '从未同步',
      eventCount,
      nextScheduledSync: lastSync ? 
        new Date(parseInt(lastSync) + 6 * 60 * 60 * 1000).toLocaleString('zh-CN') : 
        '未设置'
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取同步状态失败' },
      { status: 500 }
    );
  }
} 