// netlify/functions/manual-backup-run.js
import manualBackupSchedule from './manual-backup-schedule.js';

// This wrapper lets you run the scheduled job manually by visiting the URL
export async function handler(event) {
  try {
    const result = await manualBackupSchedule();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, triggered: 'manual', result })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
}
