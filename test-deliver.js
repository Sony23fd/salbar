async function test() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@wms.app', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const ordersRes = await fetch('http://localhost:3000/api/orders', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const orders = await ordersRes.json();
  
  const target = orders.find(o => o.status !== 'DELIVERED');
  if (!target) {
    console.log('No non-delivered order found!');
    return;
  }
  
  console.log('Testing delivery for:', target.orderNumber, target.id);
  
  const deliverRes = await fetch(`http://localhost:3000/api/orders/${target.id}/deliver`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      driverId: loginData.user.id,
      notes: 'Test delivery'
    })
  });
  
  console.log('Status:', deliverRes.status);
  const text = await deliverRes.text();
  console.log('Body:', text);
}
test().catch(console.error);
