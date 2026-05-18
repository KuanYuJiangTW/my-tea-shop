## ADDED Requirements

### Requirement: Member tier data structure
The system SHALL maintain a `member_tiers` configuration table with fields: id (TEXT PK), name, min_annual_spend (INTEGER), points_rate (NUMERIC), max_discount_rate (NUMERIC), sort_order.

#### Scenario: Default tiers exist
- **WHEN** the system is initialized
- **THEN** three tiers exist: standard (0 threshold, 2% rate, 10% max), silver (3000 threshold, 3% rate, 15% max), gold (8000 threshold, 4% rate, 20% max)

### Requirement: User membership tracking
The system SHALL maintain a `user_membership` table linking each user to their current tier, with annual_spend accumulation and reset date.

#### Scenario: New user gets default tier
- **WHEN** a new user registers
- **THEN** a user_membership record is created with tier_id = 'standard' and annual_spend = 0

#### Scenario: Annual spend updates on order completion
- **WHEN** an order status changes to 'completed'
- **THEN** the user's annual_spend increases by the order's net product amount (subtotal - coupon_discount - points_discount)

### Requirement: Automatic tier upgrade
The system SHALL automatically upgrade a user's tier when their annual_spend reaches a higher tier's threshold.

#### Scenario: User reaches silver threshold
- **WHEN** a user's annual_spend reaches 3000
- **THEN** their tier_id is updated to 'silver' and tier_upgraded_at is set to current timestamp

#### Scenario: User reaches gold threshold
- **WHEN** a user's annual_spend reaches 8000
- **THEN** their tier_id is updated to 'gold' and tier_upgraded_at is set to current timestamp

#### Scenario: No downgrade on this phase
- **WHEN** a new year starts and annual_spend resets
- **THEN** the user's tier remains unchanged (downgrade is out of scope)

### Requirement: Display tier info to user
The system SHALL display the user's current tier, annual spend progress, and next tier threshold in the account page.

#### Scenario: User views account page
- **WHEN** a logged-in user visits their account page
- **THEN** they see their tier name, current annual spend, and how much more they need for the next tier
