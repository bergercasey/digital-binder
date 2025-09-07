
// /.netlify/functions/get-binder
const { getStore } = require('@netlify/blobs');

const DEFAULT_BINDER = {
  contractors: [
    { name: "Copper Ridge" },
    { name: "Dakota Custom Homes" },
    { name: "Diversity Homes" },
    { name: "Epic Built" },
    { name: "Hallmark Homes" },
    { name: "Knutson Homes" },
    { name: "Mark Fleck" },
    { name: "ND Construction" },
    { name: "Northwest Contracting" },
    { name: "Sunrise Builders" }
  ],
  roster: ["Alice", "Bob", "Chris", "Dee"],
  stages: ["Bid", "Rough-in", "Trim", "Complete"],
  logoDataUrl: ""
};

exports.handler = async () => {
  try {
    const store = getStore('binder');        // namespace
    const data = await store.get('current', { type: 'json' }); // key
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || DEFAULT_BINDER)
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify(DEFAULT_BINDER) };
  }
};
