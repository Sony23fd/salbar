import { Client } from 'ssh2';

const conn = new Client();

const script = `
set -e

echo "=== INSTALLING CERTBOT ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y certbot python3-certbot-nginx

echo "=== CONFIGURING SSL ==="
certbot --nginx -d nomadfoods.mn -d www.nomadfoods.mn --non-interactive --agree-tos -m dev@nomadfoods.mn --redirect

echo "=== CHECKING NGINX STATUS ==="
nginx -t
systemctl restart nginx
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
