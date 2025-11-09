// Runs weekly on Netlify Scheduled Functions
import { getStore } from '@netlify/blobs';

export const config = {
  schedule: "@weekly"    // every 7 days; you can change to "@daily" etc.
};

export default async () => {
  try {
    const store = getStore({
      name: 'binder-store',
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_TOKEN
    });

    const data = await store.get('data', { type: 'json' });
    if (!data) return { statusCode: 200, body: 'No data to back up' };

    const now = new Date().toISOString().replace(/[:.]/g,'-');
    const backupKey = `backups/auto-${now}.json`;
    await store.setJSON(backupKey, data);
    await store.setJSON('meta/last-auto-backup.json', {
      lastAutoBackupAt: new Date().toISOString(),
      backupKey
    });

    return { statusCode: 200, body: JSON.stringify({ ok:true, backupKey }) };
  } catch(e){
    return { statusCode: 500, body: JSON.stringify({ error:String(e) }) };
  }
};
