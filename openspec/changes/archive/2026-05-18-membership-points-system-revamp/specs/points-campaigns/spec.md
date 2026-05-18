## ADDED Requirements

### Requirement: Campaign data structure
The system SHALL maintain a `points_campaigns` table with: id (UUID), name, description, multiplier (NUMERIC), campaign_type (global/product/first_purchase/tier_specific), target_product_ids (INTEGER[]), target_tier_ids (TEXT[]), min_order_amount (INTEGER), starts_at, ends_at, is_active, created_at, updated_at.

#### Scenario: Campaign table exists with correct schema
- **WHEN** the database is initialized
- **THEN** the points_campaigns table exists with all specified columns and types

### Requirement: Admin can create campaign
The system SHALL allow admins to create a new points campaign via POST /api/admin/campaigns with all required fields.

#### Scenario: Create global double points campaign
- **WHEN** admin submits name="端午節雙倍", multiplier=2.0, campaign_type="global", starts_at, ends_at
- **THEN** a campaign record is created and returned with id

#### Scenario: Create first purchase campaign
- **WHEN** admin submits campaign_type="first_purchase", multiplier=5.0, starts_at=far_past, ends_at=far_future
- **THEN** a permanent first-purchase campaign is created

### Requirement: Admin can edit campaign
The system SHALL allow admins to update an existing campaign via PATCH /api/admin/campaigns/[id].

#### Scenario: Edit campaign multiplier
- **WHEN** admin changes multiplier from 2.0 to 3.0
- **THEN** the campaign record is updated and future orders use the new multiplier

#### Scenario: Cannot edit ended campaign
- **WHEN** admin tries to edit a campaign whose ends_at is in the past
- **THEN** the system rejects with error "已結束的活動無法編輯"

### Requirement: Admin can deactivate campaign
The system SHALL allow admins to set is_active=false via DELETE /api/admin/campaigns/[id] (soft delete).

#### Scenario: Deactivate active campaign
- **WHEN** admin deactivates a campaign
- **THEN** is_active becomes false and the campaign no longer applies to new orders

### Requirement: Admin can list campaigns
The system SHALL return all campaigns via GET /api/admin/campaigns, with optional filter by status (active/ended/scheduled).

#### Scenario: List active campaigns
- **WHEN** admin requests campaigns with filter=active
- **THEN** only campaigns where is_active=true AND ends_at > now AND starts_at <= now are returned

#### Scenario: List all campaigns
- **WHEN** admin requests campaigns without filter
- **THEN** all campaigns are returned ordered by created_at desc

### Requirement: Campaign multiplier cap
The system SHALL enforce a maximum multiplier of 10.0 when creating or editing campaigns.

#### Scenario: Multiplier exceeds cap
- **WHEN** admin tries to set multiplier=15.0
- **THEN** the system rejects with error "倍率上限為 10 倍"

### Requirement: Admin campaign management page
The system SHALL provide a UI at /admin/campaigns showing campaign list with status badges (進行中/已結束/排程中), and forms for create/edit.

#### Scenario: Admin views campaign list
- **WHEN** admin navigates to /admin/campaigns
- **THEN** they see all campaigns with name, multiplier, type, date range, and status badge
