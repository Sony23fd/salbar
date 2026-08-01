async function test() {
  const tokenRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@wms.app', password: 'password123' })
  });
  const auth = await tokenRes.json();
  const token = auth.token;

  const ordersRes = await fetch('http://localhost:3000/api/orders', { headers: { 'Authorization': `Bearer ${token}` } });
  const orders = await ordersRes.json();
  const order = orders[0];
  if (!order) {
    console.log("No order found");
    return;
  }
  console.log("Order ID:", order.id);

  const res = await fetch(`http://localhost:3000/api/orders/${order.id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      status: 'PROCESSING',
      changedById: auth.user.id,
      notes: 'Testing status update'
    })
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

test();
