# Socket.IO Namespaces

## Overview
Real-time features use Socket.IO with dedicated namespaces for concerns.

## Namespaces
- `/ws/teachers`: broadcasts create/update/delete events for teacher entities.
- `/ws/announcements`: streams announcements to role- or class-specific rooms.
- `/ws/notifications`: general notifications channel.

## Client Integration
- Use centralized WebSocket service to manage connections and subscriptions.
- Authenticate on connect using current JWT.
- Subscribe to relevant rooms (`class:<id>`, `role:<role>`) after connect.

## Server Emission Patterns
- Services emit on successful mutations; avoid emitting on failed transactions.
- Use targeted rooms for scoped updates to reduce broadcast volume.

## Reliability
- Enable reconnection with backoff strategies on client.
- Validate JWT on connect and disconnect unauthenticated clients.
