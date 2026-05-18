## ADDED Requirements

### Requirement: Product revenue recognition at completed
The system SHALL calculate product revenue using orders with order_status='completed' instead of payment_status='paid'.

#### Scenario: Dashboard monthly product revenue
- **WHEN** admin views the dashboard
- **THEN** "本月產品確認營收" shows sum(total_amount) WHERE order_status='completed' AND completed within current month

### Requirement: Experience revenue recognition at completed
The system SHALL calculate experience revenue using bookings with status='completed' instead of status='confirmed'.

#### Scenario: Dashboard monthly experience revenue
- **WHEN** admin views the dashboard
- **THEN** "本月體驗確認營收" shows sum(total_price) WHERE status='completed' AND completed within current month

#### Scenario: Confirmed but not completed experience not in revenue
- **WHEN** a booking is confirmed (paid) but session hasn't happened yet
- **THEN** it does NOT count toward "確認營收", only toward "收款金額"

### Requirement: Cash flow display
The system SHALL display a secondary "本月收款金額" metric showing sum(total_amount) WHERE payment_status='paid' within current month, for cash flow reference.

#### Scenario: Paid but not completed orders exist
- **WHEN** there are paid orders not yet completed
- **THEN** "本月收款金額" is higher than "本月確認營收", and the difference shows as "待履約"

### Requirement: Marketing cost cards
The system SHALL display four new stat cards on the dashboard: 本月折價券消耗, 本月點數消耗, 未兌現點數總額, 本月點數發放.

#### Scenario: Monthly coupon consumption
- **WHEN** admin views dashboard
- **THEN** "本月折價券消耗" shows sum(coupon_discount) from completed orders this month

#### Scenario: Monthly points consumption
- **WHEN** admin views dashboard
- **THEN** "本月點數消耗" shows sum(points_discount) from completed orders this month

#### Scenario: Outstanding points liability
- **WHEN** admin views dashboard
- **THEN** "未兌現點數總額" shows sum of all non-expired point balances across all users (potential liability)

#### Scenario: Monthly points issued
- **WHEN** admin views dashboard
- **THEN** "本月點數發放" shows sum(points) from point_transactions WHERE type='earn' AND created this month

### Requirement: Order amount equation constraint
The system SHALL enforce: total_amount = MAX(subtotal + shipping_fee - coupon_discount - points_discount, 0) via DB CHECK constraint.

#### Scenario: Attempt to insert mismatched amounts
- **WHEN** an order is inserted where total_amount != subtotal + shipping_fee - coupon_discount - points_discount
- **THEN** the database rejects the insert with a constraint violation

### Requirement: Split discount columns
The system SHALL store coupon_discount and points_discount as separate INTEGER columns on the orders table (replacing the combined discount_amount usage).

#### Scenario: Order with both discounts
- **WHEN** an order uses a NT$50 coupon and 20 points redemption
- **THEN** the order record has coupon_discount=50, points_discount=20, discount_amount=70

### Requirement: Revenue chart includes discount trend
The system SHALL add a "折扣消耗趨勢" line/bar to the existing 6-month revenue chart showing monthly (coupon_discount + points_discount) totals.

#### Scenario: Admin views revenue chart
- **WHEN** admin views the 6-month chart
- **THEN** they see product revenue, experience revenue, and a discount cost line for each month
