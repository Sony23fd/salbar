import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e
echo "=== PM2 STATUS ==="
pm2 status

echo "=== CURL TEST ==="
curl -I http://127.0.0.1:3001 || echo "Curl failed"

echo "=== PM2 LOGS ==="
pm2 logs wms-backend --lines 20 --nostream || true
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
