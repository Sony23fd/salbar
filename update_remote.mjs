import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e

echo "=== Pulling latest changes from GitHub ==="
cd /var/www/wms
git pull origin main

echo "=== Installing dependencies ==="
npm install

echo "=== Building frontend ==="
npm run build

echo "=== Restarting PM2 backend ==="
pm2 restart wms-backend

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
