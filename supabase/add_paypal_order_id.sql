-- PayPal 整合：orders 表新增 paypal_order_id 欄位
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;
