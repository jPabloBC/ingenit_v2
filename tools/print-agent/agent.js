#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000', 10);
const PRINTER_NAME = process.env.PRINTER_NAME || process.env.AGENT_PRINTER || 'Brother';
const WORK_DIR = process.env.WORK_DIR || path.join(require('os').tmpdir(), 'ingenit_agent');

if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR, { recursive: true });

console.log('Print agent starting');
console.log('SERVER_URL=', SERVER_URL);
console.log('PRINTER_NAME=', PRINTER_NAME);
console.log('WORK_DIR=', WORK_DIR);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function poll() {
  try {
    const headers = {};
    if (process.env.AGENT_KEY) headers['X-AGENT-KEY'] = process.env.AGENT_KEY;
    const resp = await fetch(`${SERVER_URL}/api/prints?next=true`, { headers });
    if (resp.status === 204) {
      return null;
    }
    if (!resp.ok) {
      console.error('Error fetching next job', resp.status);
      return null;
    }
    const job = await resp.json();
    return job;
  } catch (err) {
    console.error('Poll error', err);
    return null;
  }
}

async function downloadFile(job) {
  const id = job.id;
  const headers = {};
  if (process.env.AGENT_KEY) headers['X-AGENT-KEY'] = process.env.AGENT_KEY;
  const url = job.temporaryLink || `${SERVER_URL}/api/prints/${id}/file`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to download file: ' + res.status);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filePath = path.join(WORK_DIR, `${id}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function postStatus(id, status, message) {
  try {
    await fetch(`${SERVER_URL}/api/prints/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, message }),
    });
  } catch (err) {
    console.error('Error posting status', err);
  }
}

async function handleJob(job) {
  const id = job.id;
  console.log('Handling job', id, 'printer:', job.printerId || PRINTER_NAME);
  try {
    const filePath = await downloadFile(job);
    console.log('Downloaded to', filePath);
    // Use lp if available
    const printer = job.printerId || PRINTER_NAME;
    await new Promise((resolve, reject) => {
      const cmd = `lp -d ${printer} ${filePath}`;
      console.log('Executing:', cmd);
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          reject({ err, stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
    console.log('Print sent for', id);
    await postStatus(id, 'done', 'Printed successfully');
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('Job error', err);
    await postStatus(id, 'failed', String(err));
  }
}

async function mainLoop() {
  while (true) {
    try {
      const job = await poll();
      if (job) {
        await handleJob(job);
      } else {
        await sleep(POLL_INTERVAL);
      }
    } catch (err) {
      console.error('Main loop error', err);
      await sleep(POLL_INTERVAL);
    }
  }
}

mainLoop();
