async function test() {
  const tokenRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@wms.app', password: 'password123' })
  });
  const auth = await tokenRes.json();
  const token = auth.token;

  const branchRes = await fetch('http://localhost:3000/api/branches', { headers: { 'Authorization': `Bearer ${token}` } });
  const branches = await branchRes.json();
  
  const productRes = await fetch('http://localhost:3000/api/products', { headers: { 'Authorization': `Bearer ${token}` } });
  const products = await productRes.json();

  const res = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      branchId: branches[0]?.id,
      createdById: auth.user.id,
      itemsInput: [{ productId: products[0]?.id, quantity: 1 }],
      notes: 'Test'
    })
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

test();
