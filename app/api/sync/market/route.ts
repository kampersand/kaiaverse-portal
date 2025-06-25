import { NextResponse } from "next/server";
import { getPrefixedRedisClient } from "@lib/redis";
import fetch from "node-fetch";

const redis = getPrefixedRedisClient();
const MARKET_CACHE_KEY = "market:kaia";
const CACHE_TTL = 24 * 60 * 60; // 24小时
const MARKET_LAST_SYNC_KEY = "market:last_sync";

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3/coins/kaia";
const fetchOptions = {
  method: "GET",
  headers: {
    accept: "application/json",
    "x-cg-demo-api-key": process.env.COINGECKO_API || "",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  },
};

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
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}

// 同步市场数据的核心逻辑
async function syncMarketData(): Promise<unknown> {
  // 检查是否刚刚同步过（防止频繁同步）
  const lastSync = await redis.get(MARKET_LAST_SYNC_KEY);
  if (lastSync) {
    const timeSinceLastSync = Date.now() - parseInt(lastSync);
    const minSyncInterval = 1 * 60 * 1000; // 1分钟最小同步间隔
    if (timeSinceLastSync < minSyncInterval) {
      throw new Error(
        `同步过于频繁，请在 ${new Date(
          parseInt(lastSync) + minSyncInterval
        ).toLocaleString("zh-CN")} 后重试`
      );
    }
  }

  // 使用重试机制拉取市场数据
  const data = await retryOperation(async () => {
    console.log("正在从 CoinGecko 获取数据...");
    const response = await fetch(COINGECKO_API_URL, fetchOptions);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();

    // 基本数据验证
    if (!result || typeof result !== "object") {
      throw new Error("API 返回数据格式无效");
    }

    return result;
  });

  console.log("成功获取市场数据，准备写入 Redis...");

  // 使用重试机制写入 redis
  await retryOperation(async () => {
    const pipeline = redis.pipeline();
    pipeline.setex(MARKET_CACHE_KEY, CACHE_TTL, JSON.stringify(data));
    pipeline.set(MARKET_LAST_SYNC_KEY, Date.now().toString());
    await pipeline.exec();
  });

  console.log("市场数据同步成功");
  return data;
}

export async function POST() {
  try {
    console.log("手动触发市场数据同步...");
    const data = await syncMarketData();

    return NextResponse.json({
      success: true,
      message: "市场数据已同步",
      data,
      syncTime: new Date().toLocaleString("zh-CN"),
    });
  } catch (error) {
    console.error("市场数据同步失败:", error);

    // 检查是否是频率限制错误
    if (error instanceof Error && error.message.includes("频繁")) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "同步市场数据失败",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  // 验证授权
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const requestUrl = new URL(request.url);
  const shouldSync = requestUrl.searchParams.get("sync") !== "false"; // 默认触发同步

  // 如果需要触发同步
  if (shouldSync) {
    try {
      console.log("Cron 触发市场数据同步...");
      const data = await syncMarketData();

      return NextResponse.json({
        success: true,
        message: "Cron 同步完成",
        syncTime: new Date().toLocaleString("zh-CN"),
        syncedData: {
          symbol: (data as Record<string, unknown>)?.symbol || "unknown",
          name: (data as Record<string, unknown>)?.name || "unknown",
          last_updated:
            (data as Record<string, unknown>)?.last_updated ||
            new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Cron 同步失败:", error);

      // 检查是否是频率限制错误
      if (error instanceof Error && error.message.includes("频繁")) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Cron 同步失败",
          details:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : String(error)
              : undefined,
        },
        { status: 500 }
      );
    }
  }

  // 只查询状态
  try {
    const [lastSync, cachedData] = await Promise.all([
      redis.get(MARKET_LAST_SYNC_KEY),
      redis.get(MARKET_CACHE_KEY),
    ]);

    let cachePreview = null;
    if (cachedData) {
      try {
        const fullData = JSON.parse(cachedData);
        cachePreview = {
          symbol: fullData.symbol,
          name: fullData.name,
          current_price_usd: fullData.market_data?.current_price?.usd,
          market_cap_usd: fullData.market_data?.market_cap?.usd,
          price_change_24h: fullData.market_data?.price_change_percentage_24h,
          last_updated: fullData.last_updated,
        };
      } catch (error) {
        console.warn("解析缓存预览数据失败:", error);
        cachePreview = { error: "缓存数据格式错误" };
      }
    }

    return NextResponse.json({
      success: true,
      lastSync: lastSync
        ? new Date(parseInt(lastSync)).toLocaleString("zh-CN")
        : "从未同步",
      hasCache: !!cachedData,
      nextScheduledSync: lastSync
        ? new Date(parseInt(lastSync) + CACHE_TTL * 1000).toLocaleString(
            "zh-CN"
          )
        : "未设置",
      cacheSize: cachedData
        ? `${Math.round(cachedData.length / 1024)} KB`
        : "0 KB",
      cachePreview,
    });
  } catch (error) {
    console.error("获取市场同步状态失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取市场同步状态失败",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
