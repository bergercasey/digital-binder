
// /.netlify/functions/save-binder
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const store = getStore('binder');
    await store.set('current', JSON.stringify(body || {}), { consistency: 'strong' });
    return { statusCode: 200, body: 'OK' };
  } catch (e) {
    return { statusCode: 500, body: 'Save error' };
  }
};
