import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e

echo "=== Setup PostgreSQL Schema Permission ==="
sudo -u postgres psql -d wms_db -c "GRANT ALL ON SCHEMA public TO wms_user;" || true

cd /var/www/wms

cat <<EOT > .env
DATABASE_URL="postgresql://wms_user:Aliwdansaa23@localhost:5432/wms_db?schema=public"
DIRECT_URL="postgresql://wms_user:Aliwdansaa23@localhost:5432/wms_db?schema=public"
JWT_SECRET="super_secret_jwt_key_here_change_me"
PORT=3001
VITE_API_URL="/api"
EOT

echo "=== Start PM2 ==="
pm2 kill || true
pm2 start npm --name "wms-backend" -- run start
pm2 save
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root || true

echo "=== Configure Nginx ==="
cat <<'EOT' > /etc/nginx/sites-available/wms
server {
    listen 80;
    server_name nomadfoods.mn www.nomadfoods.mn;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
    }
}
EOT

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo "=== DEPLOYMENT COMPLETED ==="
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
