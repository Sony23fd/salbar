import bcrypt from 'bcrypt';

async function test() {
  const hash = "$2b$10$Epz0oN4hO3X5zY8A8R.5O.Xk7H/qF9OqHkZ1E/E8i2t9h1I9Y4Yq2";
  const match = await bcrypt.compare('password123', hash);
  console.log('Match?', match);
}

test();
