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

echo "=== RESTARTING PM2 ==="
pm2 restart wms-backend

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
