## ADDED Requirements

### Requirement: Points earned on order completion
The system SHALL award points when an order status changes to 'completed'. Points = floor(earnBase × tier.points_rate × campaign_multiplier). EarnBase = subtotal - coupon_discount - points_discount.

#### Scenario: Standard member earns points without campaign
- **WHEN** a standard member's order of NT$800 net is completed with no active campaign
- **THEN** they earn floor(800 × 0.02 × 1.0) = 16 points

#### Scenario: Silver member earns points with double campaign
- **WHEN** a silver member's order of NT$800 net is completed during a 2x campaign
- **THEN** they earn floor(800 × 0.03 × 2.0) = 48 points

#### Scenario: First purchase bonus
- **WHEN** a user's first order is completed and a first_purchase campaign (5x) is active
- **THEN** the multiplier applied is 5.0 (or whichever is higher if multiple campaigns apply)

### Requirement: Points have 365-day expiry
The system SHALL set expires_at to 365 days from creation for all earned points.

#### Scenario: Points expire after one year
- **WHEN** points were earned on 2026-05-18
- **THEN** expires_at is set to 2027-05-18

### Requirement: Duplicate earn prevention
The system SHALL NOT issue earn points for an order that already has an earn record.

#### Scenario: Order completed twice
- **WHEN** an order is marked completed but already has a type='earn' point_transaction for that order_id
- **THEN** no new points are issued

### Requirement: Campaign multiplier selection
The system SHALL apply the highest applicable campaign multiplier (not stack/sum) when multiple campaigns are active.

#### Scenario: Two campaigns active simultaneously
- **WHEN** a global 2x campaign and a product-specific 3x campaign both apply to an order
- **THEN** the system uses multiplier = 3.0 (the higher one)

### Requirement: Record multiplier on transaction
The system SHALL store the applied multiplier value in point_transactions.multiplier for audit purposes.

#### Scenario: Points issued with campaign
- **WHEN** points are earned during a 2x campaign
- **THEN** the point_transaction record has multiplier = 2.0

### Requirement: Experience booking points earning
The system SHALL award points for experience bookings using the same formula as product orders: floor(earnBase × tier.points_rate × multiplier), where earnBase = total_price - points_discount.

#### Scenario: Experience completed via admin
- **WHEN** admin marks a booking as completed for a standard member who paid NT$2000 (no discount)
- **THEN** they earn floor(2000 × 0.02 × 1.0) = 40 points

#### Scenario: Experience completed via cron
- **WHEN** the cron job marks a booking as completed (7 days past session date)
- **THEN** the same formula is applied, producing identical results as admin manual completion

### Requirement: Unified earn function
The system SHALL use a single shared function for points earning calculation across product orders, admin-completed bookings, and cron-completed bookings to prevent logic divergence.

#### Scenario: All three paths produce same result
- **WHEN** the same user with same tier completes a NT$1000 purchase via product order, admin booking completion, and cron booking completion
- **THEN** all three paths produce identical point amounts
