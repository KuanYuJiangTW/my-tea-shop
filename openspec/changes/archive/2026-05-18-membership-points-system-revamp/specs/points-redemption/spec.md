## ADDED Requirements

### Requirement: User selects redemption amount
The system SHALL allow users to input a custom points amount to redeem at checkout, between the minimum and maximum allowed.

#### Scenario: User enters valid amount
- **WHEN** a user with 50 points balance enters 30 points to redeem on an order where max is 80
- **THEN** the system applies NT$30 discount (1 point = NT$1)

#### Scenario: User enters zero
- **WHEN** a user enters 0 or leaves the field empty
- **THEN** no points discount is applied

### Requirement: Minimum redemption threshold
The system SHALL enforce a minimum of 10 points per redemption.

#### Scenario: User tries to use less than minimum
- **WHEN** a user enters 5 points to redeem
- **THEN** the system rejects with error "最低使用 10 點"

### Requirement: Maximum redemption cap by tier
The system SHALL cap point redemption at floor(afterCoupon × tier.max_discount_rate).

#### Scenario: Standard member hits 10% cap
- **WHEN** a standard member tries to redeem 100 points on a NT$800 order (after coupon)
- **THEN** the system rejects because max is floor(800 × 0.10) = 80

#### Scenario: Gold member has higher cap
- **WHEN** a gold member redeems 150 points on a NT$800 order (after coupon)
- **THEN** the system accepts because max is floor(800 × 0.20) = 160

### Requirement: Balance sufficiency check
The system SHALL verify the user has enough non-expired points before redeeming.

#### Scenario: Insufficient balance
- **WHEN** a user with 20 points tries to redeem 30
- **THEN** the system rejects with error "點數不足"

### Requirement: Points deducted immediately at checkout
The system SHALL insert a type='redeem' point_transaction with negative points immediately when the order is created, preventing double-spend.

#### Scenario: Successful redemption
- **WHEN** a user redeems 25 points and order is created
- **THEN** a point_transaction with points=-25, type='redeem', order_id=<order_id> is inserted

### Requirement: Points refunded on order cancellation
The system SHALL refund redeemed points when an order is cancelled.

#### Scenario: Order cancelled after points used
- **WHEN** an order that used 25 points is cancelled
- **THEN** a point_transaction with points=+25, type='refund', order_id=<order_id> is inserted

### Requirement: Frontend points slider/input
The system SHALL display a number input (with optional slider) showing the allowed range (10 to max), current balance, and real-time discount calculation.

#### Scenario: User adjusts slider
- **WHEN** a user drags the slider to 40
- **THEN** the display shows "折抵 NT$40" and the total updates accordingly

### Requirement: Experience booking points redemption
The system SHALL apply the same 1:1 redemption logic for experience bookings as product orders (min 10, max by tier rate, balance check).

#### Scenario: Redeem points on experience booking
- **WHEN** a silver member with 100 points redeems 50 points on a NT$2000 experience
- **THEN** the system accepts (max = floor(2000 × 0.15) = 300, 50 < 300) and charges NT$1950

#### Scenario: Experience checkout sends correct amount to payment gateway
- **WHEN** a user redeems 30 points on a NT$1500 experience
- **THEN** the amount sent to ECPay is NT$1470 (1500 - 30)

### Requirement: Experience cancellation points refund uses correct type
The system SHALL use type='refund' (not 'earn') when refunding redeemed points on booking cancellation.

#### Scenario: Experience cancelled with points refund
- **WHEN** a confirmed booking that used 25 points is cancelled with 100% refund rate
- **THEN** a point_transaction with points=+25, type='refund', booking_id is inserted
