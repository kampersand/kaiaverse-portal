import { config } from 'dotenv';
import { resolve } from 'path';
import getRedisClient, { getPrefixedRedisClient, addKeyPrefix } from '../lib/redis';
import { syncLumaEvents } from './syncLumaEvents';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * 初始化 Redis 数据
 */
async function initRedis(): Promise<void> {
  let redis;
  
  try {
    console.log('正在初始化 Redis...');
    redis = getPrefixedRedisClient();
    
    // 测试连接
    await redis.ping();
    console.log('Redis 连接成功');

    // 创建一些基础数据结构
    const initialData = {
      'app:version': '1.0.0',
      'app:initialized_at': new Date().toISOString(),
      'app:status': 'active'
    };

    for (const [key, value] of Object.entries(initialData)) {
      await redis.set(key, value);
      console.log(`设置 ${key}: ${value}`);
    }

    console.log('Redis 初始化完成');
    
  } catch (error) {
    console.error('初始化 Redis 时出错:', error);
    throw error;
  } finally {
    if (redis) {
      await redis.quit();
      console.log('Redis 连接已关闭');
    }
  }
}

/**
 * 清理 Redis 数据
 * @param pattern - 可选的键模式，如果不提供则清除所有数据
 */
async function clearRedis(pattern?: string): Promise<void> {
  let redis;
  
  try {
    console.log('正在连接 Redis...');
    redis = getPrefixedRedisClient();
    
    // 测试连接
    await redis.ping();
    console.log('Redis 连接成功');

    if (pattern) {
      // 清除匹配模式的键
      console.log(`正在查找匹配模式 "${pattern}" 的键...`);
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log(`未找到匹配模式 "${pattern}" 的键`);
        return;
      }

      console.log(`找到 ${keys.length} 个匹配的键:`);
      keys.forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}`);
      });

      // 删除匹配的键
      const deletedCount = await redis.del(...keys);
      console.log(`成功删除 ${deletedCount} 个键`);
      
    } else {
      // 清除所有数据
      console.log('正在清除所有 Redis 数据...');
      
      // 获取当前数据库中的所有键
      const keys = await redis.keys('*');
      console.log(`当前数据库中有 ${keys.length} 个键`);
      
      if (keys.length > 0) {
        console.log('现有的键:');
        keys.forEach((key, index) => {
          console.log(`  ${index + 1}. ${key}`);
        });
        
        // 清空当前环境的数据
        await redis.flushdb();
        console.log('所有数据已清除');
      } else {
        console.log('数据库已经是空的');
      }
    }

    // 验证清理结果
    const remainingKeys = await redis.keys('*');
    console.log(`清理后剩余键数量: ${remainingKeys.length}`);
    
  } catch (error) {
    console.error('清理 Redis 时出错:', error);
    throw error;
  } finally {
    if (redis) {
      await redis.quit();
      console.log('Redis 连接已关闭');
    }
  }
}

/**
 * 显示当前 Redis 数据概览
 */
async function showRedisOverview(): Promise<void> {
  let redis;
  
  try {
    console.log('正在获取 Redis 数据概览...');
    redis = getPrefixedRedisClient();
    
    await redis.ping();
    console.log('Redis 连接成功');

    const keys = await redis.keys('*');
    const envPrefix = process.env.REDIS_ENV ? `${process.env.REDIS_ENV.toUpperCase()}环境` : '默认环境';
    console.log(`\n=== Redis 数据概览 (${envPrefix}) ===`);
    console.log(`总键数量: ${keys.length}`);
    
    if (keys.length > 0) {
      console.log('\n所有键:');
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const type = await redis.type(key);
        let info = '';
        
        try {
          switch (type) {
            case 'string':
              const value = await redis.get(key);
              const preview = value ? value.substring(0, 100) : '';
              info = `(字符串, 长度: ${value?.length || 0}) ${preview}${value && value.length > 100 ? '...' : ''}`;
              break;
            case 'list':
              const listLength = await redis.llen(key);
              info = `(列表, 长度: ${listLength})`;
              break;
            case 'set':
              const setLength = await redis.scard(key);
              info = `(集合, 长度: ${setLength})`;
              break;
            case 'hash':
              const hashLength = await redis.hlen(key);
              info = `(哈希, 字段数: ${hashLength})`;
              break;
            case 'zset':
              const zsetLength = await redis.zcard(key);
              info = `(有序集合, 长度: ${zsetLength})`;
              break;
            default:
              info = `(${type})`;
          }
        } catch (error) {
          info = `(${type}, 获取详情失败)`;
        }
        
        console.log(`  ${i + 1}. ${key} ${info}`);
      }
    }
    
  } catch (error) {
    console.error('获取 Redis 概览时出错:', error);
    throw error;
  } finally {
    if (redis) {
      await redis.quit();
    }
  }
}

/**
 * 测试 Redis 连接
 */
async function testRedisConnection(): Promise<void> {
  let redis;
  
  try {
    console.log('正在测试 Redis 连接...');
    redis = getPrefixedRedisClient();
    
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    
    const envPrefix = process.env.REDIS_ENV ? `${process.env.REDIS_ENV.toUpperCase()}环境` : '默认环境';
    console.log(`Redis 连接成功! (${envPrefix})`);
    console.log(`延迟: ${latency}ms`);
    
    // 显示环境信息
    if (process.env.REDIS_ENV) {
      console.log(`当前环境: ${process.env.REDIS_ENV}`);
      console.log(`Key前缀: ${process.env.REDIS_ENV}-`);
    } else {
      console.log('当前环境: 默认 (无前缀)');
    }
    
  } catch (error) {
    console.error('Redis 连接测试失败:', error);
    throw error;
  } finally {
    if (redis) {
      await redis.quit();
    }
  }
}

/**
 * 备份 Redis 数据
 */
async function backupRedis(): Promise<void> {
  let redis;
  
  try {
    console.log('正在备份 Redis 数据...');
    redis = getPrefixedRedisClient();
    
    await redis.ping();
    console.log('Redis 连接成功');

    const keys = await redis.keys('*');
    const backup: Record<string, any> = {};
    
    console.log(`正在备份 ${keys.length} 个键...`);
    
    for (const key of keys) {
      const type = await redis.type(key);
      
      switch (type) {
        case 'string':
          backup[key] = {
            type: 'string',
            value: await redis.get(key)
          };
          break;
        case 'list':
          backup[key] = {
            type: 'list',
            value: await redis.lrange(key, 0, -1)
          };
          break;
        case 'set':
          backup[key] = {
            type: 'set',
            value: await redis.smembers(key)
          };
          break;
        case 'hash':
          backup[key] = {
            type: 'hash',
            value: await redis.hgetall(key)
          };
          break;
        case 'zset':
          backup[key] = {
            type: 'zset',
            value: await redis.zrange(key, 0, -1, 'WITHSCORES')
          };
          break;
      }
    }
    
    const backupData = {
      timestamp: new Date().toISOString(),
      keys_count: keys.length,
      data: backup
    };
    
    const fs = require('fs');
    const backupFile = `redis-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ 备份完成！文件: ${backupFile}`);
    console.log(`备份了 ${keys.length} 个键`);
    
  } catch (error) {
    console.error('备份 Redis 时出错:', error);
    throw error;
  } finally {
    if (redis) {
      await redis.quit();
    }
  }
}

/**
 * 显示 Luma 事件详情
 */
async function showLumaEvents(): Promise<void> {
  let redis;
  
  try {
    console.log('正在获取 Luma 事件详情...');
    redis = getPrefixedRedisClient();
    
    await redis.ping();
    console.log('Redis 连接成功');

    // 获取所有 Luma 事件键
    const eventKeys = await redis.keys('luma:event:*');
    console.log(`\n=== Luma 事件概览 ===`);
    console.log(`总事件数量: ${eventKeys.length}`);

    if (eventKeys.length === 0) {
      console.log('暂无 Luma 事件数据');
      return;
    }

    // 获取同步统计信息
    const syncStatsJson = await redis.get('luma:sync:stats');
    if (syncStatsJson) {
      try {
        const syncStats = JSON.parse(syncStatsJson);
        console.log(`最后同步时间: ${new Date(syncStats.last_sync).toLocaleString()}`);
        console.log(`同步来源: ${syncStats.sync_source}`);
        console.log(`最近新增: ${syncStats.new_events_added} 个事件`);
      } catch (error) {
        console.log('同步统计信息解析失败');
      }
    }

    console.log('\n📅 事件列表:');
    
    // 获取所有事件数据并按时间排序
    const events: Array<{key: string, data: any, startDate: Date}> = [];
    
    for (const key of eventKeys) {
      const eventData = await redis.get(key);
      if (eventData) {
        try {
          const event = JSON.parse(eventData);
          events.push({
            key,
            data: event,
            startDate: new Date(event.startDate)
          });
        } catch (error) {
          console.warn(`解析事件数据失败，键: ${key}`);
        }
      }
    }

    // 按开始时间排序
    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // 显示事件详情
    events.forEach((item, index) => {
      const event = item.data;
      const eventDate = new Date(event.startDate);
      const now = new Date();
      const isUpcoming = eventDate > now;
      const statusIcon = isUpcoming ? '🔜' : '✅';
      
      console.log(`${index + 1}. ${statusIcon} ${event.title}`);
      console.log(`   时间: ${eventDate.toLocaleDateString()} ${eventDate.toLocaleTimeString()}`);
      console.log(`   地点: ${event.location}`);
      console.log(`   状态: ${event.status}`);
      console.log(`   Redis键: ${item.key}`);
      console.log(`   链接: ${event.registrationLink}`);
      
      if (event.tags && event.tags.length > 0) {
        console.log(`   标签: ${event.tags.join(', ')}`);
      }
      
      console.log('');
    });

    // 统计信息
    const upcomingEvents = events.filter(item => new Date(item.data.startDate) > new Date());
    const pastEvents = events.filter(item => new Date(item.data.startDate) <= new Date());
    
    console.log(`\n📊 统计信息:`);
    console.log(`即将到来的事件: ${upcomingEvents.length} 个`);
    console.log(`已结束的事件: ${pastEvents.length} 个`);
    
  } catch (error) {
    console.error('获取 Luma 事件详情时出错:', error);
    throw error;
  } finally {
    if (redis) {
      await redis.quit();
    }
  }
}

// 主函数 - 处理命令行参数
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'init':
        await initRedis();
        break;
        
      case 'overview':
      case 'show':
      case 'status':
        await showRedisOverview();
        break;
        
      case 'luma':
      case 'luma-events':
        await showLumaEvents();
        break;
        
      case 'test':
      case 'ping':
        await testRedisConnection();
        break;
        
      case 'clear':
        const pattern = args[1];
        if (pattern) {
          console.log(`准备清除匹配模式 "${pattern}" 的键...`);
        } else {
          console.log('准备清除所有 Redis 数据...');
          console.log('警告: 这将删除当前数据库中的所有数据！');
        }
        
        // 简单的确认机制
        if (process.env.NODE_ENV === 'production') {
          console.log('生产环境中需要额外确认才能清除数据');
          console.log('请设置环境变量 FORCE_CLEAR=true 来强制执行');
          if (process.env.FORCE_CLEAR !== 'true') {
            console.log('操作已取消');
            return;
          }
        }
        
        await clearRedis(pattern);
        break;
        
      case 'backup':
        await backupRedis();
        break;
        
      case 'sync-luma':
        console.log('正在同步 Luma 事件数据...');
        await syncLumaEvents();
        break;
        
      case 'help':
      case '--help':
      case '-h':
      default:
        console.log(`
Redis 管理工具使用说明:

环境脚本:
  pnpm run redis-dev <命令>     - 在开发环境中执行Redis操作 (key前缀: dev-)
  pnpm run redis-prod <命令>    - 在生产环境中执行Redis操作 (key前缀: prod-)
  pnpm run redis <命令>         - 在默认环境中执行Redis操作 (无前缀)

基础命令:
  init                          - 初始化 Redis 数据
  test / ping                   - 测试 Redis 连接
  overview / show / status      - 显示 Redis 数据概览

数据管理:
  clear                         - 清除所有 Redis 数据
  clear <模式>                  - 清除匹配模式的键
  backup                        - 备份 Redis 数据到 JSON 文件

业务功能:
  sync-luma                     - 同步 Luma 事件数据
  luma / luma-events            - 查看 Luma 事件详情

环境使用示例:
  pnpm run redis-dev overview                # 查看开发环境数据
  pnpm run redis-prod overview               # 查看生产环境数据
  pnpm run redis-dev clear "luma:*"          # 清除开发环境Luma数据
  pnpm run redis-prod backup                 # 备份生产环境数据
  pnpm run redis-dev sync-luma               # 在开发环境同步Luma事件

传统使用示例:
  pnpm run redis overview                    # 查看默认环境数据
  pnpm run redis luma                        # 查看默认环境Luma事件详情
  pnpm run redis test                        # 测试默认环境连接
  pnpm run redis clear "events:*"            # 清除默认环境events数据

注意事项:
- 开发环境的所有key都会自动添加 'dev-' 前缀
- 生产环境的所有key都会自动添加 'prod-' 前缀
- 默认环境不添加任何前缀
- 在生产环境中，需要设置 FORCE_CLEAR=true 环境变量才能执行清除操作
- 清除操作不可逆，请谨慎使用
- 备份文件会保存在当前目录下
- 环境隔离确保开发和生产数据不会相互影响
        `);
        break;
    }
    
    console.log('\n操作完成');
    process.exit(0);
    
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
} 