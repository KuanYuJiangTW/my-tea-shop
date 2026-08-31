# ai-chat-knowledge Specification

## Purpose
餵給 AI 客服的知識來源：商品、體驗、FAQ 的動態組裝與語系切換，以及避免每次對話都重查資料庫的快取策略。

## Requirements

### Requirement: Dynamic product knowledge
The system SHALL fetch current product data (name, description, price, origin, category) from Supabase and include it in the AI system prompt.

#### Scenario: Product information is current
- **WHEN** a product's price or availability is updated in Supabase
- **THEN** the AI's knowledge reflects the updated information within 60 seconds (cache TTL)

#### Scenario: Product data included in prompt
- **WHEN** the chat API constructs the system prompt
- **THEN** all active products with their name, description, price, origin, and category are included

### Requirement: Experience activity knowledge
The system SHALL include experience activity information (types, duration, pricing, what's included, age requirements) in the AI system prompt.

#### Scenario: Experience details available
- **WHEN** a user asks about a specific experience type
- **THEN** the AI can provide accurate details about duration, pricing, inclusions, and requirements

### Requirement: FAQ knowledge
The system SHALL include common Q&A pairs in the system prompt covering topics like brewing methods, tea storage, shipping, and return policy.

#### Scenario: FAQ question asked
- **WHEN** a user asks a common question (e.g., "how to brew oolong tea")
- **THEN** the AI provides an accurate answer based on the FAQ knowledge

### Requirement: Locale-aware knowledge
The system SHALL provide product names, descriptions, and FAQ content in the appropriate language based on the request locale.

#### Scenario: Chinese knowledge
- **WHEN** locale is "zh"
- **THEN** product names and descriptions use Chinese fields (name, description)

#### Scenario: English knowledge
- **WHEN** locale is "en"
- **THEN** product names and descriptions use English fields (name_en, description_en) when available, falling back to Chinese

### Requirement: Knowledge caching
The system SHALL cache the knowledge base data for 60 seconds to avoid excessive database queries.

#### Scenario: Cache hit
- **WHEN** multiple chat requests arrive within 60 seconds
- **THEN** the system uses cached product and experience data instead of querying the database for each request

#### Scenario: Cache expiry
- **WHEN** 60 seconds have passed since the last cache refresh
- **THEN** the system fetches fresh data from the database on the next request
