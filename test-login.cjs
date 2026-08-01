const fetch = require('node-fetch'); // or use built-in fetch if Node >= 18
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@wms.app', password: 'password123' })
    });
    console.log(res.status, await res.text());
  } catch (e) { console.error(e); }
}
test();
