## ADDED Requirements

### Requirement: Admin can create coupons
The system SHALL allow admins to create coupons via POST /api/admin/coupons with: name, code (or auto-generate), discount_amount, min_order_amount, expires_at, coupon_type (batch/universal), target_user_ids (for batch), max_uses (for universal), max_uses_per_user (for universal).

#### Scenario: Create batch coupons for all members
- **WHEN** admin creates a batch coupon with target="all_members", discount_amount=100, min_order_amount=500
- **THEN** one coupon record per active member is inserted, each with a unique code

#### Scenario: Create universal coupon
- **WHEN** admin creates a universal coupon with code="DRAGON2026", max_uses=100, max_uses_per_user=1
- **THEN** one coupon_templates record is created that any user can redeem

### Requirement: Universal coupon redemption
The system SHALL allow users to input a universal coupon code at checkout. The system validates: code exists, not expired, total uses < max_uses, user hasn't exceeded max_uses_per_user.

#### Scenario: User redeems universal code successfully
- **WHEN** a user enters "DRAGON2026" and hasn't used it before and total uses < 100
- **THEN** the discount is applied and a coupon_usages record is created

#### Scenario: User tries to reuse universal code
- **WHEN** a user enters "DRAGON2026" but already used it once (max_uses_per_user=1)
- **THEN** the system rejects with error "此券已使用過"

#### Scenario: Universal code exhausted
- **WHEN** a user enters "DRAGON2026" but total uses already reached 100
- **THEN** the system rejects with error "此券已兌換完畢"

### Requirement: Admin can list and filter coupons
The system SHALL provide GET /api/admin/coupons with filters: type (batch/universal), status (active/expired/used), date range.

#### Scenario: Admin views coupon usage stats
- **WHEN** admin views coupon list
- **THEN** each coupon shows: code, discount amount, issued count, used count, usage rate percentage

### Requirement: Admin can edit unexpired coupons
The system SHALL allow admins to edit coupon details (expires_at, min_order_amount) via PATCH /api/admin/coupons/[id] for coupons not yet expired.

#### Scenario: Extend coupon expiry
- **WHEN** admin extends expires_at from 2026-06-01 to 2026-07-01
- **THEN** the coupon (or template) expiry is updated

### Requirement: Admin can deactivate coupons
The system SHALL allow admins to deactivate a coupon/template, making it unusable.

#### Scenario: Deactivate universal coupon
- **WHEN** admin deactivates "DRAGON2026"
- **THEN** the coupon can no longer be redeemed at checkout

### Requirement: Preserve existing welcome coupon
The system SHALL continue auto-issuing a NT$50 welcome coupon (min NT$350, 30-day expiry) on new user registration, unchanged from current behavior.

#### Scenario: New user registers
- **WHEN** a new user completes registration
- **THEN** they receive a welcome coupon with source='welcome', discount_amount=50, min_order_amount=350, expires_at=30 days

### Requirement: Admin coupon management page
The system SHALL provide a UI at /admin/coupons showing coupon list with usage stats, and forms for create/edit/deactivate.

#### Scenario: Admin navigates to coupon management
- **WHEN** admin visits /admin/coupons
- **THEN** they see tabs for "批次券" and "通用碼", each with list, stats, and action buttons

### Requirement: Coupon refund on order cancellation
The system SHALL restore a used coupon (clear used_at) when the associated order is cancelled.

#### Scenario: Order with coupon is cancelled
- **WHEN** an order that used coupon_id=X is cancelled
- **THEN** coupon X's used_at is set back to NULL (reusable)
