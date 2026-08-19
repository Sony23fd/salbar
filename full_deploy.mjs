import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e

echo "=== PULLING LATEST CODE ==="
cd /var/www/wms
git stash || true
git fetch --all
git reset --hard origin/main
git pull

echo "=== INSTALLING DEPENDENCIES ==="
npm install

echo "=== BUILDING PROJECT ==="
npx prisma generate
npm run build

echo "=== PREPARING STANDALONE ==="
cp -r public .next/standalone/wms/ || true
cp -r .next/static .next/standalone/wms/.next/ || true

echo "=== RESTARTING PM2 ==="
pm2 kill || true
PORT=3001 pm2 start .next/standalone/wms/server.js --name "wms-backend"
pm2 save

echo "=== FIXING SSL & NGINX ==="
# Certbot will automatically rewrite the Nginx config to add SSL back
# First, write the base HTTP config
cat <<'EOT' > /etc/nginx/sites-available/wms
server {
    listen 80;
    server_name nomadfoods.mn www.nomadfoods.mn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOT

nginx -t
systemctl restart nginx

# Re-run certbot to reinstall the certificates into the nginx config
certbot --nginx -d nomadfoods.mn -d www.nomadfoods.mn --non-interactive --agree-tos -m dev@nomadfoods.mn --redirect

echo "=== DONE ==="
`;

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '13.140.175.47',
  port: 22,
  username: 'root',
  password: 'Aliwdansaa23'
});
