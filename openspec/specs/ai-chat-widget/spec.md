# ai-chat-widget Specification

## Purpose
前台 AI 客服元件：浮動按鈕、視窗開合、歡迎訊息、依所在頁面給出的情境式快速提問，以及答不出來時轉接 LINE 真人。

## Requirements

### Requirement: Floating chat button
The system SHALL display a floating circular button at the bottom-right corner of all frontend pages (excluding Admin pages). On mobile, the button SHALL be positioned to avoid overlapping bottom-fixed CTA buttons (e.g., "Add to Cart", "Book Now").

#### Scenario: Button visible on frontend
- **WHEN** a user visits any frontend page (e.g., home, products, experiences)
- **THEN** a floating chat button is visible at the bottom-right corner

#### Scenario: Button hidden on admin pages
- **WHEN** a user visits any `/admin` page
- **THEN** the floating chat button is NOT displayed

#### Scenario: Button avoids CTA overlap on mobile
- **WHEN** the viewport is below 768px and the page has a bottom-fixed CTA button
- **THEN** the chat button is positioned above the CTA to avoid overlap

### Requirement: Chat window toggle
The system SHALL open a chat dialog window when the floating button is clicked, and close it when the close button is clicked.

#### Scenario: Open chat window
- **WHEN** the user clicks the floating chat button
- **THEN** a chat dialog window appears with a message list and input field

#### Scenario: Close chat window
- **WHEN** the user clicks the close button on the chat window
- **THEN** the chat window closes and the floating button reappears

### Requirement: Welcome message
The system SHALL display a static AI welcome message when the chat window is opened with no conversation history, introducing the assistant's capabilities.

#### Scenario: First open shows welcome
- **WHEN** the chat window is opened for the first time (empty conversation)
- **THEN** an AI welcome message is displayed (e.g., "你好！我是霧抉茶的茶葉小幫手，可以幫你推薦茶葉、解答泡茶問題，或介紹我們的茶山體驗。有什麼想問的嗎？")

#### Scenario: Welcome not shown with history
- **WHEN** the chat window is opened with existing conversation in sessionStorage
- **THEN** the welcome message is NOT displayed, previous conversation is restored

### Requirement: Context-aware quick question buttons
The system SHALL display 3 quick question buttons based on the user's current page when the chat window has no conversation history.

#### Scenario: Quick questions on home page
- **WHEN** the chat window is opened on the home page or other general pages
- **THEN** quick questions are: "推薦送禮茶葉", "體驗活動有哪些", "如何泡出好茶"

#### Scenario: Quick questions on product pages
- **WHEN** the chat window is opened on `/products` or a product detail page
- **THEN** quick questions are product-relevant (e.g., "這款茶的風味特色", "適合搭配什麼食物", "送禮包裝有嗎")

#### Scenario: Quick questions on experience pages
- **WHEN** the chat window is opened on `/experiences` or an experience detail page
- **THEN** quick questions are experience-relevant (e.g., "適合幾歲參加", "需要自備什麼", "下雨天照常嗎")

#### Scenario: Quick question triggers message
- **WHEN** the user clicks a quick question button
- **THEN** the question text is sent as a user message and the AI responds

### Requirement: Message display
The system SHALL display user messages and AI responses in a scrollable message list, with visual distinction between user and AI messages.

#### Scenario: User sends a message
- **WHEN** the user types a message and presses send (or Enter)
- **THEN** the user message appears on the right side and the AI response streams in on the left side

#### Scenario: Streaming response display
- **WHEN** the AI is generating a response
- **THEN** the response text appears incrementally (character by character) with a typing indicator

### Requirement: LINE contact button
The system SHALL display a clickable LINE official account link button when the AI cannot answer a question or suggests contacting a human.

#### Scenario: AI suggests LINE contact
- **WHEN** the AI response indicates it cannot help and suggests contacting LINE
- **THEN** a clickable LINE link button is displayed below the AI message, allowing the user to open LINE with one tap

### Requirement: Input throttling
The system SHALL prevent the user from sending a new message while the AI is responding, and limit sending to once every 2 seconds.

#### Scenario: Sending while AI is responding
- **WHEN** the user tries to send a message while the AI is still streaming a response
- **THEN** the send button is disabled

#### Scenario: Rapid message sending
- **WHEN** the user sends a message and immediately tries to send another
- **THEN** the second message is blocked until 2 seconds have passed

### Requirement: Responsive layout
The system SHALL adapt the chat window layout for mobile and desktop screens.

#### Scenario: Desktop layout
- **WHEN** the viewport width is 768px or wider
- **THEN** the chat window appears as a fixed 380×520px panel at the bottom-right

#### Scenario: Mobile layout
- **WHEN** the viewport width is below 768px
- **THEN** the chat window expands to full width and occupies the bottom half of the screen, using `dvh` units to handle keyboard appearance

### Requirement: Bilingual UI
The system SHALL display all chat UI text (welcome message, placeholder, quick questions, error messages) in the current locale language.

#### Scenario: Chinese UI
- **WHEN** the current locale is "zh"
- **THEN** all chat UI labels, welcome message, and quick questions are in Traditional Chinese

#### Scenario: English UI
- **WHEN** the current locale is "en"
- **THEN** all chat UI labels, welcome message, and quick questions are in English

### Requirement: Conversation persistence via sessionStorage
The system SHALL persist conversation history in sessionStorage, so it survives page navigation and chat window close/reopen within the same browser tab. Closing the browser tab clears the history.

#### Scenario: Close and reopen chat window
- **WHEN** the user closes the chat window and reopens it on the same page or another page
- **THEN** the previous conversation is restored from sessionStorage

#### Scenario: Navigate to another page
- **WHEN** the user navigates from `/products` to `/experiences` with an active conversation
- **THEN** the conversation history is preserved and visible when reopening the chat

#### Scenario: Close browser tab
- **WHEN** the user closes the browser tab entirely
- **THEN** the conversation history is cleared (sessionStorage behavior)
