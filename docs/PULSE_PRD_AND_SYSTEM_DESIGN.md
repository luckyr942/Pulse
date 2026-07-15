# Pulse Product Requirements and System Design

Pulse is a distributed real-time chat application with a React Native mobile client and a horizontally scalable Node.js backend. The purpose of the project is not only to build a working chat app, but also to demonstrate production-grade system design concepts: WebSockets, horizontal scaling, Redis presence, Redis Pub/Sub, RabbitMQ write-behind persistence, MongoDB history storage, and background workers.

This document explains what Pulse should become, what is already present, how every part connects in real time, and what still needs to be built.

---

## 1. Product Vision

Pulse should feel like a real messaging app on mobile:

- Users can register and log in.
- Users can see real conversations from the database.
- Users can start new 1:1 chats.
- Users can send and receive messages instantly.
- Users can see online/offline presence.
- Users can see typing indicators.
- Users can see message delivery/read states.
- Offline recipients trigger notification events.
- A telemetry screen shows real-time infrastructure behavior.

The hiring story is:

> Pulse is a mobile chat app backed by a horizontally scalable real-time messaging system. It uses Socket.IO for live communication, Redis for presence and cross-node routing, RabbitMQ for asynchronous write-behind persistence and offline notifications, and MongoDB for historical message storage.

---

## 2. Current Project Status

### Already Built or Partly Built

- Express backend entrypoint.
- Socket.IO backend gateway.
- MongoDB, Redis, and RabbitMQ local infrastructure through Docker Compose.
- JWT authentication flow.
- User, Conversation, and Message models.
- Redis presence registration with TTL.
- Redis Pub/Sub service for cross-server message forwarding.
- RabbitMQ publisher for persistence and notification queues.
- DB and notification worker files.
- Expo React Native mobile app.
- Login/register UI.
- Conversation list UI.
- Telemetry screen UI.
- Socket provider on mobile.
- Backend health endpoint: `/api/health`.
- Mobile backend URL auto-detection for local Expo development.

### Still Missing or Incomplete

- Mobile conversation list still contains mock/demo rows.
- Chat detail screen is not fully connected to real backend data.
- Message history route needs to be finalized.
- New chat/user search flow needs to use backend users.
- Delivery and read receipt events need to be completed end to end.
- Group/channel chat support is not complete.
- Push notification dispatch is simulated, not real.
- Multi-instance backend demo is not fully packaged with Nginx/load balancing.
- Automated tests are minimal.
- TypeScript typing in the mobile app needs cleanup.

Current hiring readiness:

- Current state: 6.5 / 10
- After real chat screens and no dummy data: 8 / 10
- After multi-instance demo, telemetry, tests, and deployment docs: 9 / 10+

---

## 3. User Personas

### End User

The end user wants a smooth mobile chat app:

- Login quickly.
- See conversations.
- Open a chat.
- Send and receive messages instantly.
- Know who is online.
- Know when someone is typing.
- Know whether a message was sent, delivered, or read.

### Hiring Manager / Interviewer

The interviewer wants proof that the project is deeper than CRUD:

- Can the system scale beyond one Node process?
- How are WebSocket connections routed across instances?
- How is presence stored globally?
- How are database write spikes handled?
- What happens when a recipient is offline?
- Can the system be observed and explained?

---

## 4. Core Functional Requirements

### Authentication

Users must be able to:

- Register with username, password, email, and display name.
- Log in with username and password.
- Receive a JWT token.
- Store the token locally on the mobile client.
- Use the token for REST requests.
- Use the token during Socket.IO handshake.
- Log out and clear the local session.

### Conversation List

Users must be able to:

- See all conversations they belong to.
- See the other participant or group name.
- See the latest message preview.
- See the latest message timestamp.
- See unread count.
- See online/offline status for direct chats.
- Open a conversation.
- Start a new conversation with another user.

The conversation list must come from MongoDB, not mock data.

### Chat Screen

Users must be able to:

- Load message history for a conversation.
- Send text messages.
- Receive messages in real time without refreshing.
- See sent messages immediately using optimistic UI.
- See message timestamps.
- See delivery and read state.
- See typing status.
- Scroll through recent messages.

### Presence

The system must show whether users are online or offline.

Presence behavior:

- When a socket connects, the backend writes `presence:user:<userId>` to Redis.
- The value should identify the backend instance that owns the socket.
- The key gets a short TTL.
- The mobile client sends heartbeat events.
- Each heartbeat refreshes the Redis TTL.
- On disconnect, the backend removes presence and broadcasts offline status.

### Typing Indicator

Typing behavior:

- When a user types, the mobile app emits `user_typing`.
- Backend routes the typing event to the recipient.
- Recipient sees `"Alice is typing..."`.
- When typing stops, the app emits `user_stopped_typing`, or the client hides the indicator after a short timeout.

### Message Status

Messages should move through these states:

- `sent`: sender's socket event was accepted by backend.
- `persisted`: DB worker saved it to MongoDB.
- `delivered`: recipient's active client received it.
- `read`: recipient opened the conversation and read it.

For the first production-ready version, `sent`, `delivered`, and `read` are enough.

### Offline Notifications

If the recipient is offline:

- The message still gets accepted.
- The backend publishes a notification job to RabbitMQ.
- A notification worker consumes the job.
- For demo, the worker can log the notification.
- Later, the worker can call Expo Push Notifications.

### Telemetry

The app should expose a telemetry screen that shows:

- Current backend URL.
- Socket connected/disconnected state.
- Socket event logs.
- Current user/session.
- Server instance or port if exposed by backend.
- Recent presence updates.
- Message send/receive events.
- Queue simulation status later.

This screen is important because it makes the system design visible during demos.

---

## 5. Non-Functional Requirements

### Scalability

The backend should support multiple Node.js instances. Users connected to different instances must still be able to chat.

### Low Latency

Socket event handling should be fast. The backend should not wait for MongoDB before acknowledging a sent message.

### Reliability

Messages should not disappear if MongoDB is slow. RabbitMQ should buffer persistence events until workers can process them.

### Idempotency

Each message should include an `idempotencyKey`. If the same send request is retried, the database worker should avoid creating duplicate messages.

### Observability

Logs and telemetry should make it clear:

- Which user connected.
- Which server instance owns that user's socket.
- Whether a message was delivered locally, routed through Redis, queued for persistence, or queued for notification.

### Developer Experience

The project should be runnable locally with clear commands:

- Start infrastructure.
- Start backend instance 1.
- Start backend instance 2.
- Start workers.
- Start mobile app.
- Run a demo with two users.

---

## 6. High-Level Architecture

```text
React Native App
   |
   | HTTP REST: login, register, conversations, message history
   | Socket.IO: realtime messages, typing, presence, receipts
   v
Node.js Express + Socket.IO Gateway
   |
   | Reads/writes users, conversations, message history
   v
MongoDB

Node.js Gateway
   |
   | presence:user:<userId> -> server instance
   v
Redis Presence Cache

Node.js Gateway
   |
   | publish user socket events across backend instances
   v
Redis Pub/Sub

Node.js Gateway
   |
   | queue message persistence and offline notifications
   v
RabbitMQ
   |
   | consumed by background workers
   v
DB Worker / Notification Worker
```

---

## 7. Real-Time Connection Flow

### Step 1: User Logs In

1. Mobile app sends `POST /api/auth/login`.
2. Backend validates username and password.
3. Backend returns JWT token and user object.
4. Mobile stores token.
5. Mobile marks user as logged in.

### Step 2: Mobile Connects Socket

1. Mobile calls `io(BACKEND_URL, { auth: { token } })`.
2. Socket.IO backend middleware reads the token.
3. Backend verifies JWT.
4. Backend loads the user from MongoDB.
5. If valid, socket connection is accepted.
6. Backend attaches user data to the socket object.

### Step 3: Backend Registers Presence

When socket connects:

```text
Redis SET presence:user:<userId> <serverPort> EX 30
```

Then:

- Backend stores local mapping: `userId -> socketId`.
- Backend subscribes to Redis channel: `user.socket:<userId>`.
- Backend broadcasts `presence_update` to connected clients.

### Step 4: Mobile Sends Heartbeat

Mobile emits:

```text
heartbeat
```

Backend refreshes:

```text
Redis SET presence:user:<userId> <serverPort> EX 30
```

This keeps the user online as long as the app is connected.

---

## 8. Real-Time Send Message Flow

Scenario: Alice sends a message to Bob.

### Client Side

Mobile emits:

```js
socket.emit("send_message", {
  conversationId,
  recipientId,
  content,
  messageType: "text",
  idempotencyKey
}, callback);
```

The app can immediately show the message in the UI as pending/sent.

### Backend Side

The gateway receives `send_message` and performs:

1. Validate payload.
2. Build `messageData`.
3. Check Redis for Bob's presence:

```text
GET presence:user:<bobUserId>
```

### Case A: Bob Is Online on Same Server

If Bob is connected to the same Node process:

```text
global.io.to(bobSocketId).emit("receive_message", messageData)
```

Then backend publishes message to RabbitMQ persistence queue.

### Case B: Bob Is Online on Different Server

If Bob is connected to another Node process:

```text
PUBLISH user.socket:<bobUserId> messageData
```

Redis Pub/Sub broadcasts the message to the server that subscribed to Bob's channel. That server then emits to Bob's socket.

### Case C: Bob Is Offline

If Bob has no presence key:

```text
publish notification job to RabbitMQ
```

The backend still queues the message for persistence.

### Persistence

In all cases, backend publishes to RabbitMQ:

```text
message.sent -> chat.persistence
```

The DB worker consumes the event and writes the message to MongoDB.

---

## 9. Why RabbitMQ Is Used

Without RabbitMQ:

```text
Socket event -> wait for MongoDB write -> acknowledge client
```

This is simple but fragile. If MongoDB slows down, every sender waits. If many users send messages at once, the backend can become blocked by database writes.

With RabbitMQ:

```text
Socket event -> publish to queue -> acknowledge client quickly
DB worker -> writes to MongoDB asynchronously
```

Benefits:

- WebSocket server stays fast.
- MongoDB write spikes are smoothed out.
- Messages can wait safely if the DB worker is temporarily slow.
- Offline notification work is separated from message delivery.

This pattern is called asynchronous write-behind persistence.

---

## 10. Why Redis Is Used

### Redis Presence

WebSocket connections live inside one Node process. If Alice is on server 3001 and Bob is on server 3002, server 3001 does not directly know Bob's socket ID.

Redis solves this by storing:

```text
presence:user:bob -> 3002
```

Now any server can ask Redis where Bob is.

### Redis Pub/Sub

If Bob is on server 3002, server 3001 cannot emit directly to Bob's socket. It publishes to Redis:

```text
PUBLISH user.socket:bob messageData
```

Server 3002 is subscribed to Bob's channel, receives the event, and emits to Bob locally.

Redis Pub/Sub acts like a lightweight cross-server event bus.

---

## 11. Database Model Requirements

### User

Required fields:

- `_id`
- `userName`
- `email`
- `fullName`
- `passwordHash`
- `avatarUrl`
- `createdAt`
- `updatedAt`

Indexes:

- unique `userName`
- unique `email`

### Conversation

Required fields:

- `_id`
- `type`: `direct` or `group`
- `participants`: array of user IDs
- `name`: optional for groups
- `avatarUrl`: optional for groups
- `lastMessage`
- `lastMessageAt`
- `createdAt`
- `updatedAt`

Indexes:

- `participants`
- `updatedAt`

### Message

Required fields:

- `_id`
- `conversationId`
- `senderId`
- `recipientId`
- `content`
- `messageType`
- `status`
- `idempotencyKey`
- `createdAt`
- `updatedAt`
- `deliveredAt`
- `readAt`

Indexes:

- `conversationId + createdAt`
- unique `idempotencyKey`

---

## 12. Backend API Requirements

### Auth

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Users

```text
GET /api/users
GET /api/users/search?q=<query>
GET /api/users/:id
```

### Conversations

```text
GET  /api/conversations
POST /api/conversations
GET  /api/conversations/:conversationId
GET  /api/conversations/:conversationId/messages
```

### Messages

Most message sending happens through Socket.IO, but these REST routes are still useful:

```text
GET   /api/conversations/:conversationId/messages
PATCH /api/messages/:messageId/read
```

### System

```text
GET /api/health
GET /api/system/status
```

---

## 13. Socket.IO Event Requirements

### Client Emits

```text
heartbeat
send_message
user_typing
user_stopped_typing
message_delivered
message_read
join_conversation
leave_conversation
```

### Server Emits

```text
receive_message
presence_update
user_typing
user_stopped_typing
message_delivered
message_read
conversation_updated
connect_error
```

---

## 14. Mobile App Screens

### Auth Screen

Path:

```text
pulse-app/app/(auth)/login.js
```

Responsibilities:

- Login.
- Register.
- Show useful network errors.
- Call socket provider login after successful auth.

### Messages Screen

Path:

```text
pulse-app/app/(tabs)/index.tsx
```

Responsibilities:

- Fetch conversations from backend.
- Render real conversations only.
- Show last message, timestamp, unread count, and online status.
- Open chat screen with `conversationId` and `recipientId`.
- Subscribe to socket updates that refresh conversations.

### Chat Screen

Path to create:

```text
pulse-app/app/chat/[conversationId].tsx
```

Responsibilities:

- Fetch message history.
- Render message bubbles.
- Send messages over Socket.IO.
- Receive messages in real time.
- Show typing indicator.
- Emit read receipts.
- Update status ticks.

### New Chat Screen

Path to create:

```text
pulse-app/app/new-chat.tsx
```

Responsibilities:

- Search users.
- Start direct conversation.
- Navigate to chat.

### Channels Screen

Path:

```text
pulse-app/app/(tabs)/channels.tsx
```

Responsibilities:

- Show group conversations.
- Create group.
- Add/remove members later.

### Telemetry Screen

Path:

```text
pulse-app/app/(tabs)/explore.tsx
```

Responsibilities:

- Show backend URL.
- Show socket status.
- Show event logs.
- Show current gateway node.
- Show useful system information for demo.

### Settings Screen

Path:

```text
pulse-app/app/(tabs)/settings.tsx
```

Responsibilities:

- Show current user.
- Logout.
- Show app/server configuration.

---

## 15. Implementation Roadmap

### Phase 1: Make Chat Real

Goal: remove dummy data and make 1:1 chat work end to end.

Tasks:

- Replace mock conversations with `GET /api/conversations`.
- Add `GET /api/conversations/:conversationId/messages`.
- Create `app/chat/[conversationId].tsx`.
- Connect send message event to chat UI.
- Confirm messages are written by DB worker.
- Confirm message history reloads after app restart.

Acceptance criteria:

- Alice and Bob can register.
- Alice can start a conversation with Bob.
- Alice sends a message.
- Bob receives it instantly if online.
- Message appears after refreshing the app.

### Phase 2: Presence and Typing

Goal: make the app feel live.

Tasks:

- Show online/offline status in conversation list.
- Add heartbeat from mobile.
- Emit and display typing indicators.
- Clean up typing timeout behavior.

Acceptance criteria:

- Bob appears online when connected.
- Bob appears offline after disconnect/TTL expiration.
- Alice sees "Bob is typing..." while Bob types.

### Phase 3: Receipts

Goal: show realistic message lifecycle.

Tasks:

- Add `message_delivered`.
- Add `message_read`.
- Update message status in DB.
- Emit receipt events back to sender.
- Display status in mobile UI.

Acceptance criteria:

- Sender sees sent/delivered/read transitions.
- Read receipt fires when recipient opens chat.

### Phase 4: Groups and Channels

Goal: support multi-user conversations.

Tasks:

- Extend Conversation model with `type`.
- Add group creation endpoint.
- Add group message routing.
- Emit messages to all online participants.
- Queue notification jobs for offline participants.

Acceptance criteria:

- User can create group.
- Group members receive messages in real time.
- Offline members get notification jobs.

### Phase 5: Multi-Instance Demo

Goal: prove system design.

Tasks:

- Run backend on port 3001 and 3002.
- Add Nginx or local load balancer config.
- Expose server instance ID in socket connection.
- Show instance ID on telemetry screen.
- Demonstrate Alice and Bob connected to different backend instances.

Acceptance criteria:

- Alice on instance 3001 can message Bob on instance 3002.
- Redis Pub/Sub route is visible in logs.
- Telemetry screen shows active gateway node.

### Phase 6: Reliability and Portfolio Polish

Goal: make project hiring-ready.

Tasks:

- Add seed script for demo users.
- Add integration tests for auth/conversations/messages.
- Add README quickstart.
- Add architecture diagram.
- Add demo script.
- Add deployment notes.
- Clean TypeScript errors.
- Remove all dead/mock code.

Acceptance criteria:

- A reviewer can clone, run, and demo the system.
- README explains the system clearly.
- The app works without manually editing source code.

---

## 16. Demo Script for Interviews

1. Start infrastructure:

```bash
docker compose up -d mongodb redis rabbitmq
```

2. Start backend instance 1:

```bash
node src/server.js 3001
```

3. Start backend instance 2:

```bash
node src/server.js 3002
```

4. Start DB worker:

```bash
npm run worker:db
```

5. Start notification worker:

```bash
npm run worker:notif
```

6. Start mobile app:

```bash
cd pulse-app
npx expo start -c
```

7. Demo:

- Login as Alice on one client.
- Login as Bob on another client.
- Show both users online.
- Send a message.
- Explain the live path: Socket.IO -> Redis presence -> Redis Pub/Sub if cross-node -> RabbitMQ persistence -> MongoDB.
- Stop Bob's app.
- Send another message.
- Show offline notification worker receives the job.
- Restart Bob's app.
- Show message history loaded from MongoDB.

---

## 17. What Makes This a Strong Hiring Project

Pulse is stronger than a normal chat app because it demonstrates multiple layers:

- Mobile app UX.
- Authentication.
- REST API design.
- WebSocket gateway.
- Horizontal scaling.
- Distributed presence.
- Cross-node socket routing.
- Queue-backed persistence.
- Background workers.
- Offline notification pipeline.
- Observability and telemetry.
- System design documentation.

The strongest way to present it:

> I built Pulse to answer a real distributed systems question: how do you deliver real-time messages when users are connected to different backend instances? The system uses Redis to track where users are connected, Redis Pub/Sub to route events across nodes, RabbitMQ to protect MongoDB from write spikes, and a React Native app to prove the experience end to end.

---

## 18. Definition of Done

Pulse is hiring-ready when:

- No dummy conversation/message data remains.
- A user can register, log in, start a chat, send messages, and reload history.
- Two online users receive messages instantly.
- Offline messages persist and trigger notification jobs.
- Presence, typing, delivered, and read states work.
- Multi-instance backend demo works.
- README has quickstart and architecture explanation.
- Screenshots or a demo video show the product.
- Tests cover main backend flows.
- Mobile lint has no errors.
- Project can be explained in under 2 minutes and defended deeply for 30 minutes.

