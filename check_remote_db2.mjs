import { Client } from 'ssh2';

const conn = new Client();
const script = `
cd /var/www/wms
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); async function run() { 
  const pBatches = await prisma.productionBatch.count(); 
  const pItems = await prisma.productionBatchItem.count(); 
  const orders = await prisma.order.count(); 
  console.log('DB STATS:', {pBatches, pItems, orders}); 
} run();"
`;

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
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
