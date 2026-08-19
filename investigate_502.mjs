import { Client } from 'ssh2';

const conn = new Client();

const script = `
echo "=== Nginx Error Log ==="
tail -n 20 /var/log/nginx/error.log || true

echo "=== Localhost Curl Check ==="
curl -I http://localhost:3001 || true

echo "=== PM2 Process Details ==="
pm2 show wms-backend || true

echo "=== Active Ports ==="
ss -tulpn | grep LISTEN || true
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
