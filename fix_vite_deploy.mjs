import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e

cd /var/www/wms

echo "=== RESTARTING PM2 FOR EXPRESS BACKEND ==="
pm2 kill || true
pm2 start npm --name "wms-backend" -- run server
pm2 save

echo "=== FIXING NGINX CONFIG FOR VITE + EXPRESS ==="
cat <<'EOT' > /etc/nginx/sites-available/wms
server {
    listen 80;
    server_name nomadfoods.mn www.nomadfoods.mn;

    root /var/www/wms/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
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

echo "=== RUNNING CERTBOT ==="
certbot --nginx -d nomadfoods.mn -d www.nomadfoods.mn --non-interactive --agree-tos -m dev@nomadfoods.mn --redirect

echo "=== DEPLOYMENT FIXED ==="
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
