import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

import getRedisClient from '../lib/redis';

const redis = getRedisClient();

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  registrationLink: string;
  status: 'completed' | 'in_process' | 'upcoming';
}

const testEvents: Event[] = [
  {
    id: '1',
    title: "Kaia 开发者大会 2024",
    date: "2024年6月15日",
    location: "线上",
    description: "探讨Kaia最新技术发展和应用场景，包括智能合约、DeFi和跨链技术",
    registrationLink: "https://kaiaverse.xyz/events/dev-conf-2024",
    status: "upcoming"
  },
  {
    id: '2',
    title: "Kaia Web3 黑客松",
    date: "2024年7月1日-7月3日",
    location: "全球",
    description: "72小时编程马拉松，构建创新的Kaia生态应用，总奖金池100,000 USDT",
    registrationLink: "https://kaiaverse.xyz/events/hackathon-2024",
    status: "upcoming"
  },
  {
    id: '3',
    title: "Kaia 生态项目路演 - 亚洲站",
    date: "2024年5月20日",
    location: "新加坡",
    description: "优秀项目展示与投资对接，连接亚洲资本与创新项目",
    registrationLink: "https://kaiaverse.xyz/events/roadshow-asia",
    status: "upcoming"
  },
  {
    id: '4',
    title: "Kaia DeFi 创新峰会",
    date: "2024年8月15日",
    location: "迪拜",
    description: "深入探讨Kaia DeFi生态系统的创新方向，包括借贷、交易和衍生品",
    registrationLink: "https://kaiaverse.xyz/events/defi-summit",
    status: "upcoming"
  },
  {
    id: '5',
    title: "Kaia NFT 艺术节",
    date: "2024年9月1日-9月7日",
    location: "元宇宙",
    description: "展示基于Kaia的NFT艺术作品，包括虚拟展览和艺术家见面会",
    registrationLink: "https://kaiaverse.xyz/events/nft-festival",
    status: "upcoming"
  },
  {
    id: '6',
    title: "Kaia 技术工作坊系列",
    date: "2024年5月1日-5月30日",
    location: "线上",
    description: "每周技术培训，覆盖智能合约开发、DApp构建和安全审计",
    registrationLink: "https://kaiaverse.xyz/events/tech-workshop",
    status: "in_process"
  },
  {
    id: '7',
    title: "Kaia 社区 AMA",
    date: "2024年5月10日",
    location: "Discord",
    description: "与Kaia核心团队交流，了解最新发展规划和技术路线",
    registrationLink: "https://kaiaverse.xyz/events/ama-may",
    status: "upcoming"
  },
  {
    id: '8',
    title: "Kaia 生态基金路演日",
    date: "2024年6月1日",
    location: "伦敦",
    description: "Kaia生态基金投资方向发布，项目路演和现场投资对接",
    registrationLink: "https://kaiaverse.xyz/events/fund-day",
    status: "upcoming"
  }
];

async function initializeRedis() {
  try {
    console.log('开始初始化 Redis 测试数据...');

    // 清除现有数据
    await redis.del('events');
    console.log('已清除现有数据');

    // 使用管道批量添加数据
    const pipeline = redis.pipeline();
    
    testEvents.forEach((event, index) => {
      // 使用递增的时间戳作为分数，确保顺序
      const score = Date.now() + index;
      pipeline.zadd('events', score, JSON.stringify(event));
    });

    await pipeline.exec();
    console.log(`成功添加 ${testEvents.length} 条测试数据`);

    // 验证数据
    const count = await redis.zcard('events');
    console.log(`当前 Redis 中共有 ${count} 条事件数据`);

    // 获取并打印第一条数据作为样例
    const firstEvent = await redis.zrange('events', 0, 0);
    if (firstEvent.length > 0) {
      console.log('数据样例:', JSON.parse(firstEvent[0]));
    }

    console.log('Redis 测试数据初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
}

// 运行初始化
initializeRedis(); 