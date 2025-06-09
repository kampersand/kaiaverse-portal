import { NextResponse } from 'next/server';
import { clearCache } from '../route';

// 清除事件缓存
export async function DELETE() {
  try {
    clearCache();
    return NextResponse.json({ 
      message: '事件缓存已清除',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('清除缓存失败:', error);
    return NextResponse.json(
      { error: '清除缓存失败' },
      { status: 500 }
    );
  }
}

// 获取缓存状态
export async function GET() {
  try {
    // 这里我们无法直接访问内存缓存状态，但可以提供一些有用的信息
    return NextResponse.json({
      message: '缓存管理端点',
      actions: {
        'DELETE /api/events/cache': '清除事件缓存',
        'GET /api/events': '获取事件列表（会显示缓存状态）'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取缓存状态失败:', error);
    return NextResponse.json(
      { error: '获取缓存状态失败' },
      { status: 500 }
    );
  }
} 