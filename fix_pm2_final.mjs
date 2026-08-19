import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e

echo "=== Copy Static Files for Standalone ==="
cd /var/www/wms
cp -r public .next/standalone/wms/ || true
cp -r .next/static .next/standalone/wms/.next/ || true

echo "=== PM2 Restart ==="
pm2 kill || true
cd /var/www/wms
PORT=3001 pm2 start .next/standalone/wms/server.js --name "wms-backend"
pm2 save
pm2 status
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
