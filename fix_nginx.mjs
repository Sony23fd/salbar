import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e

echo "=== FIXING NGINX CONFIG ==="
sed -i 's/proxy_pass http:\\/\\/localhost:3001;/proxy_pass http:\\/\\/127.0.0.1:3001;/g' /etc/nginx/sites-available/wms

echo "=== RESTARTING NGINX ==="
nginx -t
systemctl restart nginx

echo "=== CHECKING NGINX STATUS ==="
systemctl status nginx --no-pager || true
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
