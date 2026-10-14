import puppeteer from 'puppeteer-core';
import { getChromePath } from '../packages/render-adapter/src/index.js';
import path from 'node:path';
import fs from 'node:fs';

async function generateSampleAssets() {
  const assetsDir = path.resolve('data/projects/easymoderator-launch/assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // 1. Generate logo.png (500x500 transparent / dark badge)
  await page.setViewport({ width: 500, height: 500, deviceScaleFactor: 2 });
  const logoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; background: transparent; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, -apple-system, sans-serif; }
        .logo-box {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #17223B;
          border: 2px solid #7460D9;
          border-radius: 24px;
          padding: 24px 40px;
          box-shadow: 0 12px 36px rgba(116, 96, 217, 0.4);
        }
        .icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, #7460D9, #F4C35E);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 32px;
          color: #17223B;
        }
        .text {
          display: flex;
          flex-direction: column;
        }
        .title {
          font-size: 32px;
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 14px;
          font-weight: 600;
          color: #F4C35E;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="logo-box">
        <div class="icon">EM</div>
        <div class="text">
          <div class="title">EasyModerator</div>
          <div class="subtitle">Smart Commerce AI</div>
        </div>
      </div>
    </body>
    </html>
  `;
  await page.setContent(logoHtml);
  const logoEl = await page.$('.logo-box');
  await logoEl.screenshot({ path: path.join(assetsDir, 'logo.png'), omitBackground: true });
  console.log('✓ logo.png generated');

  // 2. Generate inbox-demo.png (1200x800 dashboard UI)
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  const dashboardHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; background: #0b0f19; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 240px; background: #111827; border-right: 1px solid rgba(255,255,255,0.08); padding: 20px; display: flex; flex-direction: column; gap: 24px; }
        .brand { font-size: 20px; font-weight: 800; color: #F4C35E; display: flex; align-items: center; gap: 8px; }
        .nav-item { padding: 10px 14px; border-radius: 8px; font-size: 14px; font-weight: 600; color: #94a3b8; display: flex; align-items: center; gap: 10px; }
        .nav-item.active { background: #7460D9; color: #fff; }
        .inbox-list { width: 340px; background: #0f172a; border-right: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; }
        .inbox-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 16px; font-weight: 700; color: #fff; }
        .conv-card { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; gap: 12px; }
        .conv-card.active { background: rgba(116, 96, 217, 0.15); border-left: 3px solid #7460D9; }
        .avatar { width: 36px; height: 36px; border-radius: 50%; background: #334155; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #cbd5e1; }
        .conv-info { flex: 1; }
        .name-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: #fff; }
        .time { font-size: 11px; color: #64748b; }
        .snippet { font-size: 12px; color: #94a3b8; margin-top: 4px; }
        .chat-view { flex: 1; display: flex; flex-direction: column; background: #0b0f19; }
        .chat-header { padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; }
        .chat-body { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .msg { max-width: 65%; padding: 12px 18px; border-radius: 14px; font-size: 14px; line-height: 1.4; }
        .msg.in { background: #1e293b; align-self: flex-start; color: #f8fafc; border-bottom-left-radius: 2px; }
        .msg.out { background: #7460D9; align-self: flex-end; color: #fff; border-bottom-right-radius: 2px; }
        .status-pill { background: #22c55e22; color: #22c55e; border: 1px solid #22c55e44; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="brand">⚡ EasyModerator</div>
        <div class="nav-item active">💬 Live Inbox (14)</div>
        <div class="nav-item">📊 Auto-Orders</div>
        <div class="nav-item">⚙️ AI Settings</div>
      </div>
      <div class="inbox-list">
        <div class="inbox-header">Merchant Customer Queue</div>
        <div class="conv-card active">
          <div class="avatar" style="background: #7460D9;">RH</div>
          <div class="conv-info">
            <div class="name-row"><span>Rashedul Hasan</span><span class="time">Just now</span></div>
            <div class="snippet">Is the black edition still available in size L?</div>
          </div>
        </div>
        <div class="conv-card">
          <div class="avatar">TA</div>
          <div class="conv-info">
            <div class="name-row"><span>Tania Akter</span><span class="time">2m ago</span></div>
            <div class="snippet">Delivery location confirmed for Gulshan.</div>
          </div>
        </div>
        <div class="conv-card">
          <div class="avatar">SK</div>
          <div class="conv-info">
            <div class="name-row"><span>Saif Khan</span><span class="time">5m ago</span></div>
            <div class="snippet">Please send invoice for Order #8492.</div>
          </div>
        </div>
      </div>
      <div class="chat-view">
        <div class="chat-header">
          <div>
            <div style="font-weight: 800; font-size: 16px;">Rashedul Hasan</div>
            <div style="font-size: 12px; color: #94a3b8;">Facebook Messenger • Active Conversation</div>
          </div>
          <div class="status-pill">● Auto-Moderated</div>
        </div>
        <div class="chat-body">
          <div class="msg in">Hello! Is the black edition still available in size L? How long is delivery to Dhaka?</div>
          <div class="msg out">Yes, size L is in stock! Standard Dhaka delivery takes 24–48 hours with cash-on-delivery. Would you like me to reserve one for you?</div>
          <div class="msg in">Yes please! Name: Rashedul Hasan, Phone: 01711-XXXXXX</div>
          <div class="msg out" style="background: #10b981;">✓ Order draft #4109 created and sent to dispatch dashboard.</div>
        </div>
      </div>
    </body>
    </html>
  `;
  await page.setContent(dashboardHtml);
  await page.screenshot({ path: path.join(assetsDir, 'inbox-demo.png') });
  console.log('✓ inbox-demo.png generated');

  await browser.close();
  console.log('>>> Sample assets generation completed! <<<');
}

generateSampleAssets().catch(e => {
  console.error('Failed to generate sample assets:', e);
  process.exit(1);
});
