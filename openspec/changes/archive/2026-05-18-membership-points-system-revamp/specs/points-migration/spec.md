## ADDED Requirements

### Requirement: Convert existing points from 100:1 to 1:1
The system SHALL provide a one-time migration script that divides all existing point_transactions.points by 100 (using ROUND) to convert to the new 1:1 ratio.

#### Scenario: Earn transaction migration
- **WHEN** migration runs on a record with type='earn', points=800
- **THEN** points becomes 8 (800/100 rounded)

#### Scenario: Redeem transaction migration
- **WHEN** migration runs on a record with type='redeem', points=-200
- **THEN** points becomes -2 (-200/100 rounded)

### Requirement: Backfill order discount columns
The system SHALL provide a migration script that populates the new coupon_discount and points_discount columns on existing orders from their current discount_amount and points_used values.

#### Scenario: Order with points_used=500
- **WHEN** migration processes an order with discount_amount=55, points_used=500
- **THEN** points_discount=5 (500/100), coupon_discount=50 (55-5), and discount_amount remains 55

#### Scenario: Order with no points used
- **WHEN** migration processes an order with discount_amount=50, points_used=0
- **THEN** points_discount=0, coupon_discount=50

### Requirement: Create user_membership records for existing users
The system SHALL create user_membership records for all existing users, calculating their tier based on historical completed order spend.

#### Scenario: User with NT$5000 historical spend
- **WHEN** migration runs for a user with NT$5000 total completed order spend
- **THEN** user_membership is created with tier_id='silver', annual_spend=5000

### Requirement: Migration idempotency
The migration script SHALL be idempotent — running it multiple times produces the same result without corrupting data.

#### Scenario: Migration run twice
- **WHEN** migration script is executed a second time
- **THEN** no data changes occur (uses guards like WHERE migrated_at IS NULL or ON CONFLICT DO NOTHING)

### Requirement: Pre-migration backup verification
The migration script SHALL output a summary of affected records before executing, and require explicit confirmation (or flag) to proceed.

#### Scenario: Dry run mode
- **WHEN** migration is run with --dry-run flag
- **THEN** it outputs "Will migrate X point_transactions, Y orders, Z users" without making changes
