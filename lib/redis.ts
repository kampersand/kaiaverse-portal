import Redis from 'ioredis';

let redis: Redis | null = null;

// 环境前缀配置
const ENV_PREFIXES = {
  dev: 'dev-',
  prod: 'prod-',
  default: ''
} as const;

type Environment = keyof typeof ENV_PREFIXES;

// 获取当前环境前缀
function getEnvironmentPrefix(): string {
  const env = process.env.REDIS_ENV as Environment;
  return ENV_PREFIXES[env] || ENV_PREFIXES.default;
}

// 为key添加环境前缀的工具函数
export function addKeyPrefix(key: string): string {
  const prefix = getEnvironmentPrefix();
  return prefix ? `${prefix}${key}` : key;
}

// 从key中移除环境前缀的工具函数
export function removeKeyPrefix(key: string): string {
  const prefix = getEnvironmentPrefix();
  return prefix && key.startsWith(prefix) 
    ? key.substring(prefix.length) 
    : key;
}

// 为多个key添加前缀
export function addKeyPrefixes(keys: string[]): string[] {
  return keys.map(key => addKeyPrefix(key));
}

// 从多个key中移除前缀
export function removeKeyPrefixes(keys: string[]): string[] {
  return keys.map(key => removeKeyPrefix(key));
}

// Redis客户端包装器，提供带前缀的操作方法
export class PrefixedRedisOperations {
  constructor(private client: Redis) {}

  // String 操作
  async get(key: string): Promise<string | null> {
    return this.client.get(addKeyPrefix(key));
  }

  async set(key: string, value: string | number | Buffer): Promise<string> {
    return this.client.set(addKeyPrefix(key), value);
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...addKeyPrefixes(keys));
  }

  // Hash 操作
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(addKeyPrefix(key), field);
  }

  async hset(key: string, field: string, value: string | number | Buffer): Promise<number> {
    return this.client.hset(addKeyPrefix(key), field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(addKeyPrefix(key));
  }

  async hlen(key: string): Promise<number> {
    return this.client.hlen(addKeyPrefix(key));
  }

  // List 操作
  async llen(key: string): Promise<number> {
    return this.client.llen(addKeyPrefix(key));
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(addKeyPrefix(key), start, stop);
  }

  // Set 操作
  async scard(key: string): Promise<number> {
    return this.client.scard(addKeyPrefix(key));
  }

  async sadd(key: string, ...members: (string | number | Buffer)[]): Promise<number> {
    return this.client.sadd(addKeyPrefix(key), ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(addKeyPrefix(key));
  }

  // Sorted Set 操作
  async zcard(key: string): Promise<number> {
    return this.client.zcard(addKeyPrefix(key));
  }

  async zadd(key: string, score: number, member: string | number | Buffer): Promise<number> {
    return this.client.zadd(addKeyPrefix(key), score, member);
  }

  async zrange(key: string, start: number, stop: number, withScores?: 'WITHSCORES'): Promise<string[]> {
    if (withScores) {
      return this.client.zrange(addKeyPrefix(key), start, stop, withScores);
    }
    return this.client.zrange(addKeyPrefix(key), start, stop);
  }

  // 通用操作
  async keys(pattern: string): Promise<string[]> {
    const prefixedPattern = addKeyPrefix(pattern);
    const keys = await this.client.keys(prefixedPattern);
    return removeKeyPrefixes(keys);
  }

  async type(key: string): Promise<string> {
    return this.client.type(addKeyPrefix(key));
  }

  async flushdb(): Promise<string> {
    const prefix = getEnvironmentPrefix();
    // 在有前缀的情况下，不直接清空整个数据库，而是删除带前缀的key
    if (prefix) {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return 'OK';
    } else {
      return this.client.flushdb();
    }
  }

  // Pipeline 操作 - 返回原始pipeline，调用者需要手动添加前缀
  pipeline() {
    return this.client.pipeline();
  }

  // 基础方法代理
  async ping(): Promise<string> {
    return this.client.ping();
  }

  async quit(): Promise<string> {
    return this.client.quit();
  }

  // 事件监听器代理
  on(event: string, listener: (...args: any[]) => void): this {
    this.client.on(event, listener);
    return this;
  }
}

function createRedisClient(): Redis {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL 环境变量未设置');
  }

  const client = new Redis(process.env.REDIS_URL, {
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    lazyConnect: true
  });

  // 测试连接
  client.on('error', (error) => {
    console.error('Redis 连接错误:', error);
  });

  client.on('connect', () => {
    const prefix = getEnvironmentPrefix();
    const envInfo = prefix ? `(环境前缀: ${prefix})` : '(无前缀)';
    console.log(`Redis 连接成功 ${envInfo}`);
  });

  return client;
}

function getRedisClient(): Redis {
  if (!redis) {
    redis = createRedisClient();
  }
  return redis;
}

// 获取带前缀操作的Redis客户端
export function getPrefixedRedisClient(): PrefixedRedisOperations {
  const client = getRedisClient();
  return new PrefixedRedisOperations(client);
}

export default getRedisClient; 