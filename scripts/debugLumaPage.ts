import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

const KAIA_LUMA_URL = 'https://lu.ma/kaiachain';

async function debugLumaPage() {
  try {
    console.log('获取 Kaia Luma 页面进行调试分析...');
    
    const response = await axios.get(KAIA_LUMA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000
    });

    console.log('页面获取成功，状态码:', response.status);
    
    // 保存原始 HTML 用于分析
    writeFileSync('debug-luma-page.html', response.data);
    console.log('原始 HTML 已保存到 debug-luma-page.html');
    
    const $ = cheerio.load(response.data);
    
    // 分析页面结构
    console.log('\n=== 页面标题 ===');
    console.log($('title').text());
    
    console.log('\n=== 主要内容区域 ===');
    const mainContent = $('main, [role="main"], .main-content, #main').first();
    if (mainContent.length > 0) {
      console.log('找到主内容区域:', mainContent.prop('tagName'), mainContent.attr('class'));
    }
    
    console.log('\n=== 可能的事件容器 ===');
    const potentialEventContainers = [
      '[data-testid*="event"]',
      '[class*="event"]',
      '[class*="Event"]',
      'article',
      '.card',
      '[data-cy*="event"]',
      '.calendar-event',
      '.event-item',
      '.event-card'
    ];
    
    potentialEventContainers.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`${selector}: ${elements.length} 个元素`);
        
        // 显示前几个元素的结构
        elements.slice(0, 3).each((index, element) => {
          const $el = $(element);
          console.log(`  元素 ${index + 1}:`);
          console.log(`    标签: ${$el.prop('tagName')}`);
          console.log(`    类名: ${$el.attr('class') || '无'}`);
          console.log(`    ID: ${$el.attr('id') || '无'}`);
          console.log(`    文本预览: ${$el.text().substring(0, 100)}...`);
          
          // 查找链接
          const links = $el.find('a');
          if (links.length > 0) {
            console.log(`    包含 ${links.length} 个链接:`);
            links.slice(0, 2).each((linkIndex, link) => {
              const href = $(link).attr('href');
              const text = $(link).text().trim();
              console.log(`      链接 ${linkIndex + 1}: ${href} (${text.substring(0, 50)})`);
            });
          }
          console.log('');
        });
      }
    });
    
    console.log('\n=== 所有链接分析 ===');
    const allLinks = $('a[href*="lu.ma"], a[href*="/event"], a[href*="/e/"]');
    console.log(`找到 ${allLinks.length} 个可能的事件链接`);
    
    allLinks.slice(0, 10).each((index, link) => {
      const $link = $(link);
      const href = $link.attr('href');
      const text = $link.text().trim();
      console.log(`${index + 1}. ${href} - "${text.substring(0, 80)}"`);
    });
    
    console.log('\n=== JSON-LD 结构化数据 ===');
    const jsonLdScripts = $('script[type="application/ld+json"]');
    if (jsonLdScripts.length > 0) {
      console.log(`找到 ${jsonLdScripts.length} 个 JSON-LD 脚本`);
      jsonLdScripts.each((index, script) => {
        try {
          const jsonData = JSON.parse($(script).html() || '');
          console.log(`JSON-LD ${index + 1}:`, JSON.stringify(jsonData, null, 2).substring(0, 500));
        } catch (error) {
          console.log(`JSON-LD ${index + 1} 解析失败`);
        }
      });
    }
    
    console.log('\n=== 页面脚本分析 ===');
    const scripts = $('script:not([type="application/ld+json"])');
    console.log(`找到 ${scripts.length} 个脚本标签`);
    
    // 查找可能包含事件数据的脚本
    scripts.each((index, script) => {
      const scriptContent = $(script).html() || '';
      if (scriptContent.includes('event') || scriptContent.includes('Event') || 
          scriptContent.includes('calendar') || scriptContent.includes('Calendar')) {
        console.log(`脚本 ${index + 1} 可能包含事件数据 (长度: ${scriptContent.length})`);
        console.log(`内容预览: ${scriptContent.substring(0, 200)}...`);
      }
    });
    
    console.log('\n调试分析完成！');
    
  } catch (error: unknown) {
    console.error('调试失败:', error instanceof Error ? error.message : String(error));
  }
}

// 运行调试
debugLumaPage(); 