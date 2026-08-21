import { Client } from 'ssh2';
import * as fs from 'fs';

const conn = new Client();
const script = `
cd /var/www/wms
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); async function run() { const users = await prisma.user.count(); const products = await prisma.product.count(); console.log('DB STATS:', {users, products}); } run();"
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
      console.error('STDERR: ' + data);
    });
  });
}).connect({
  host: '13.140.175.47',
  port: 22,
  username: 'root',
  password: 'Aliwdansaa23'
});
