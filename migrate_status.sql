ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE text USING "status"::text;
ALTER TABLE "order_histories" ALTER COLUMN "status" TYPE text USING "status"::text;
DROP TYPE "OrderStatus" CASCADE;
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
