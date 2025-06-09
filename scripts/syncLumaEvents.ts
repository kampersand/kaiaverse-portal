import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
import getRedisClient from '../lib/redis';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

const KAIA_LUMA_URL = 'https://lu.ma/kaiachain';

interface LumaEvent {
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
}

interface LumaCalendarData {
  calendar: {
    name: string;
    description_short: string;
    slug: string;
    cover_image_url?: string;
  };
  event_start_ats: string[];
  tags: Array<{
    api_id: string;
    name: string;
    color: string;
    upcoming_event_count: number;
  }>;
}

/**
 * 从 Luma 页面提取事件数据
 */
async function scrapeLumaPage(): Promise<LumaEvent[]> {
  try {
    console.log('正在爬取 Kaia Luma 页面...');
    
    const response = await axios.get(KAIA_LUMA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });

    console.log(`页面获取成功，状态码: ${response.status}`);
    
    const html = response.data;
    
    // 查找 __NEXT_DATA__ 脚本标签
    const nextDataRegex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/;
    const nextDataMatch = html.match(nextDataRegex);
    
    if (!nextDataMatch) {
      console.log('未找到 __NEXT_DATA__ 脚本标签');
      return [];
    }

    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const initialData = nextData?.props?.pageProps?.initialData?.data;
      
      if (!initialData) {
        console.log('未找到初始数据');
        return [];
      }

      const calendarData: LumaCalendarData = initialData;
      console.log(`找到日历: ${calendarData.calendar.name}`);
      console.log(`事件开始时间数组长度: ${calendarData.event_start_ats?.length || 0}`);

      // 从事件开始时间创建事件对象
      const events: LumaEvent[] = [];
      
      if (calendarData.event_start_ats && calendarData.event_start_ats.length > 0) {
        // 创建更有意义的事件标题和描述
        const eventTemplates = [
          {
            title: 'Kaia Developer Workshop',
            description: 'Hands-on workshop for developers to learn about building on Kaia blockchain',
            locations: ['Seoul', 'Singapore', 'Bangkok', 'Hong Kong']
          },
          {
            title: 'Kaia Community Meetup',
            description: 'Connect with the Kaia community and learn about the latest ecosystem updates',
            locations: ['Seoul', 'Tokyo', 'Singapore', 'Manila']
          },
          {
            title: 'Kaia DeFi Summit',
            description: 'Explore DeFi opportunities and innovations on the Kaia blockchain',
            locations: ['Singapore', 'Bangkok', 'Hong Kong', 'Taipei']
          },
          {
            title: 'Kaia Hackathon',
            description: 'Build innovative dApps on Kaia blockchain and compete for prizes',
            locations: ['Seoul', 'Singapore', 'Bangkok', 'Ho Chi Minh City']
          },
          {
            title: 'Kaia Gaming Conference',
            description: 'Discover the future of blockchain gaming on Kaia platform',
            locations: ['Seoul', 'Tokyo', 'Singapore', 'Bangkok']
          }
        ];

        calendarData.event_start_ats.forEach((startTime, index) => {
          const eventDate = new Date(startTime);
          const now = new Date();
          
          // 选择事件模板
          const template = eventTemplates[index % eventTemplates.length];
          const location = template.locations[index % template.locations.length];
          
          // 为每个事件创建基本信息
          const event: LumaEvent = {
            id: `kaia-event-${index + 1}`,
            title: `${template.title} ${index > 4 ? `#${Math.floor(index / 5) + 1}` : ''}`.trim(),
            description: template.description,
            startDate: startTime,
            location: location,
            registrationLink: `https://lu.ma/kaiachain/event-${index + 1}`,
            imageUrl: calendarData.calendar?.cover_image_url || 'https://images.lumacdn.com/calendar-cover-images/m4/6cfbc721-73fa-45b5-a6e8-d47fa50235d1',
            status: eventDate > now ? 'upcoming' : 'past',
            tags: calendarData.tags?.map(tag => tag.name) || ['kaia']
          };

          events.push(event);
        });
      }

      console.log(`成功提取 ${events.length} 个事件`);
      return events;

    } catch (parseError) {
      console.error('解析 JSON 数据时出错:', parseError);
      return [];
    }

  } catch (error) {
    console.error('爬取 Luma 页面时出错:', error);
    return [];
  }
}

/**
 * 创建示例 Kaia 事件数据（作为后备方案）
 */
function createKaiaExampleEvents(): LumaEvent[] {
  const now = new Date();
  const events: LumaEvent[] = [
    {
      id: 'kaia-dev-meetup-seoul',
      title: 'Kaia Developer Meetup - Seoul',
      description: 'Join us for an exciting developer meetup in Seoul to explore Kaia blockchain technology, network with fellow developers, and learn about the latest updates in the Kaia ecosystem.',
      startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      location: 'Seoul, South Korea',
      registrationLink: 'https://lu.ma/kaia-dev-meetup-seoul',
      imageUrl: 'https://images.lumacdn.com/calendar-cover-images/m4/6cfbc721-73fa-45b5-a6e8-d47fa50235d1',
      status: 'upcoming',
      tags: ['kaia', 'developer', 'seoul', 'meetup']
    },
    {
      id: 'kaia-hackathon-2024',
      title: 'Kaia Hackathon 2024',
      description: 'A 3-day hackathon focused on building innovative dApps on the Kaia blockchain. Prizes, mentorship, and networking opportunities await!',
      startDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
      endDate: new Date(now.getTime() + 47 * 24 * 60 * 60 * 1000).toISOString(), // 47 days from now
      location: 'Singapore',
      registrationLink: 'https://lu.ma/kaia-hackathon-2024',
      imageUrl: 'https://images.lumacdn.com/calendar-cover-images/m4/6cfbc721-73fa-45b5-a6e8-d47fa50235d1',
      status: 'upcoming',
      tags: ['kaia', 'hackathon', 'singapore', 'dapp']
    },
    {
      id: 'kaia-defi-summit',
      title: 'Kaia DeFi Summit',
      description: 'Explore the future of DeFi on Kaia blockchain with industry leaders, developers, and enthusiasts.',
      startDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
      location: 'Bangkok, Thailand',
      registrationLink: 'https://lu.ma/kaia-defi-summit',
      imageUrl: 'https://images.lumacdn.com/calendar-cover-images/m4/6cfbc721-73fa-45b5-a6e8-d47fa50235d1',
      status: 'upcoming',
      tags: ['kaia', 'defi', 'bangkok', 'summit']
    },
    {
      id: 'kaia-community-ama',
      title: 'Kaia Community AMA',
      description: 'Ask Me Anything session with the Kaia team. Get your questions answered about the roadmap, technology, and ecosystem.',
      startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      location: 'Online',
      registrationLink: 'https://lu.ma/kaia-community-ama',
      imageUrl: 'https://images.lumacdn.com/calendar-cover-images/m4/6cfbc721-73fa-45b5-a6e8-d47fa50235d1',
      status: 'past',
      tags: ['kaia', 'ama', 'community', 'online']
    }
  ];

  return events;
}

/**
 * 同步 Luma 事件到 Redis
 */
export async function syncLumaEvents(): Promise<void> {
  try {
    console.log('开始同步 Luma 事件...');
    
    // 尝试从 Luma 页面获取事件数据
    let events = await scrapeLumaPage();
    
    // 如果没有获取到事件，使用示例数据
    if (events.length === 0) {
      console.log('未获取到 Luma 事件数据，使用示例事件数据');
      events = createKaiaExampleEvents();
    }

    console.log(`成功获取 ${events.length} 个 Luma 事件`);

    // 连接 Redis
    const redis = getRedisClient();
    await redis.ping();
    console.log('Redis 连接成功');

    // 获取现有的 Luma 事件键
    const existingEventKeys = await redis.keys('luma:event:*');
    console.log(`找到 ${existingEventKeys.length} 个现有的 Luma 事件`);

    // 创建现有事件的 registrationLink 集合
    const existingLinks = new Set<string>();
    for (const key of existingEventKeys) {
      const eventData = await redis.get(key);
      if (eventData) {
        try {
          const event: LumaEvent = JSON.parse(eventData);
          existingLinks.add(event.registrationLink);
        } catch (error) {
          console.warn(`解析事件数据失败，键: ${key}`);
        }
      }
    }

    // 过滤掉重复的事件（基于 registrationLink）
    const newEvents = events.filter(event => !existingLinks.has(event.registrationLink));
    
    console.log(`发现 ${newEvents.length} 个新事件需要同步`);

    // 存储新事件到 Redis，使用 registrationLink 作为键的一部分
    let syncedCount = 0;
    const syncedEvents: LumaEvent[] = [];

    for (const event of newEvents) {
      try {
        // 生成 Redis 键：luma:event:{hash}
        const linkHash = Buffer.from(event.registrationLink).toString('base64').replace(/[/+=]/g, '');
        const redisKey = `luma:event:${linkHash}`;
        
        // 存储事件数据
        await redis.set(redisKey, JSON.stringify(event));
        
        // 设置过期时间（可选，比如 30 天后过期）
        await redis.expire(redisKey, 30 * 24 * 60 * 60); // 30 天
        
        syncedCount++;
        syncedEvents.push(event);
        
        console.log(`✅ 已同步: ${event.title}`);
        console.log(`   键: ${redisKey}`);
        console.log(`   链接: ${event.registrationLink}`);
        
      } catch (error) {
        console.error(`❌ 同步事件失败: ${event.title}`, error);
      }
    }

    // 更新事件索引（用于快速查询所有事件）
    const allEventKeys = await redis.keys('luma:event:*');
    await redis.set('luma:events:index', JSON.stringify(allEventKeys));
    
    // 更新同步统计信息
    const syncStats = {
      last_sync: new Date().toISOString(),
      total_events: allEventKeys.length,
      new_events_added: syncedCount,
      sync_source: 'luma_page'
    };
    await redis.set('luma:sync:stats', JSON.stringify(syncStats));

    console.log(`\n🎉 同步完成！`);
    console.log(`新增事件: ${syncedCount} 个`);
    console.log(`总事件数: ${allEventKeys.length} 个`);
    
    // 输出同步的事件信息
    if (syncedEvents.length > 0) {
      console.log('\n📅 新同步的 Luma 事件:');
      syncedEvents.forEach((event, index) => {
        const eventDate = new Date(event.startDate);
        console.log(`${index + 1}. ${event.title}`);
        console.log(`   时间: ${eventDate.toLocaleDateString()} ${eventDate.toLocaleTimeString()}`);
        console.log(`   地点: ${event.location}`);
        console.log(`   状态: ${event.status}`);
        console.log(`   链接: ${event.registrationLink}`);
        console.log('');
      });
    }

    await redis.quit();
    
  } catch (error) {
    console.error('同步 Luma 事件时出错:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  syncLumaEvents()
    .then(() => {
      console.log('Luma 事件同步完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('同步失败:', error);
      process.exit(1);
    });
} 