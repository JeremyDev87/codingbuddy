---
name: api-design
description: Use when designing REST or GraphQL APIs - covers OpenAPI spec, resource design, versioning, and documentation
---

# API Design

## Overview

Design APIs that are consistent, predictable, and well-documented. This skill covers REST and GraphQL API design patterns.

**Core principle:** APIs are contracts. Once published, breaking changes are expensive.

## When to Use

**Use this skill:**
- Designing new API endpoints
- Refactoring existing APIs
- Adding versioning strategy
- Creating OpenAPI/GraphQL specifications
- Standardizing error responses

**Not needed for:**
- Internal function signatures
- Database schema design (use data-engineer agent)

## REST API Design

### Resource Naming

```
✅ Good                          ❌ Bad
-----------------------------------------
GET  /users                      GET  /getUsers
GET  /users/{id}                 GET  /user?id=123
POST /users                      POST /createUser
PUT  /users/{id}                 POST /updateUser
DELETE /users/{id}               GET  /deleteUser/{id}
GET  /users/{id}/orders          GET  /getUserOrders
```

**Rules:**
- Use nouns, not verbs (HTTP method is the verb)
- Plural for collections: `/users` not `/user`
- Hierarchical for relationships: `/users/{id}/orders`
- Lowercase, hyphen-separated: `/user-profiles` not `/userProfiles`

### HTTP Methods

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Retrieve resource | Yes | Yes |
| POST | Create resource | No | No |
| PUT | Replace resource | Yes | No |
| PATCH | Partial update | Yes* | No |
| DELETE | Remove resource | Yes | No |

*PATCH is idempotent if using JSON Patch/Merge Patch format.

### Status Codes

```
2xx Success
-----------------------------------------
200 OK              - GET/PUT/PATCH success, body contains data
201 Created         - POST success, Location header has URL
204 No Content      - DELETE success, no body

4xx Client Error
-----------------------------------------
400 Bad Request     - Invalid input (validation failed)
401 Unauthorized    - Authentication required
403 Forbidden       - Authenticated but not allowed
404 Not Found       - Resource doesn't exist
409 Conflict        - State conflict (duplicate, version mismatch)
422 Unprocessable   - Valid syntax but semantic error

5xx Server Error
-----------------------------------------
500 Internal Error  - Unexpected server error
502 Bad Gateway     - Upstream service failed
503 Unavailable     - Temporary overload
```

### Standard Response Format

**Success Response:**
```json
{
  "data": {
    "id": "123",
    "name": "Example"
  },
  "meta": {
    "requestId": "abc-123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Collection Response:**
```json
{
  "data": [
    { "id": "1", "name": "First" },
    { "id": "2", "name": "Second" }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasNext": true
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  },
  "meta": {
    "requestId": "abc-123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| URI Path | `/v1/users` | Clear, cacheable | URL changes |
| Header | `Accept: application/vnd.api+json;version=1` | Clean URLs | Hidden |
| Query Param | `/users?version=1` | Easy to test | Pollutes params |

**Recommended:** URI Path versioning for simplicity and clarity.

```
/v1/users           # Version 1
/v2/users           # Version 2 (breaking changes)
```

**When to increment version:**
- Removing fields
- Changing field types
- Renaming fields
- Changing behavior

**Non-breaking (no version bump):**
- Adding new optional fields
- Adding new endpoints
- Adding new optional parameters

### OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: User API
  version: 1.0.0
  description: User management endpoints

paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: pageSize
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
    post:
      summary: Create user
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: Created
          headers:
            Location:
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        createdAt:
          type: string
          format: date-time

    ErrorResponse:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  message:
                    type: string
```

## GraphQL API Design

### Schema Design

```graphql
type Query {
  user(id: ID!): User
  users(filter: UserFilter, pagination: Pagination): UserConnection!
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(id: ID!): DeleteUserPayload!
}

type User {
  id: ID!
  email: String!
  name: String
  orders(first: Int, after: String): OrderConnection!
  createdAt: DateTime!
}

# Relay-style connection for pagination
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  cursor: String!
  node: User!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Input types
input CreateUserInput {
  email: String!
  name: String
}

# Payload types with union for errors
type CreateUserPayload {
  user: User
  errors: [UserError!]
}

type UserError {
  field: String
  message: String!
  code: String!
}
```

### N+1 Query Prevention

```typescript
// ❌ Bad: N+1 queries
const resolvers = {
  User: {
    orders: async (user) => {
      // Called once per user - N queries
      return db.orders.findByUserId(user.id);
    }
  }
};

// ✅ Good: DataLoader batching
import DataLoader from 'dataloader';

const orderLoader = new DataLoader(async (userIds) => {
  // Single batched query
  const orders = await db.orders.findByUserIds(userIds);
  return userIds.map(id => orders.filter(o => o.userId === id));
});

const resolvers = {
  User: {
    orders: async (user) => orderLoader.load(user.id)
  }
};
```

### Query Complexity Limiting

```typescript
// Prevent expensive queries
const complexityConfig = {
  maximumComplexity: 1000,
  scalarCost: 1,
  objectCost: 10,
  listFactor: 10, // Multiply by list size
};

// Example: users(first: 100) { orders(first: 50) { ... } }
// Complexity: 10 + (100 * (10 + (50 * 10))) = 51,010 (rejected)
```

## Rate Limiting

### Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200

# When exceeded
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

### Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| Fixed Window | X requests per minute | Simple APIs |
| Sliding Window | Rolling window | More accurate |
| Token Bucket | Refill tokens over time | Burst-friendly |
| Leaky Bucket | Constant output rate | Smooth traffic |

## API Gateway Patterns

```
Client → API Gateway → Microservices
              ↓
      - Authentication
      - Rate Limiting
      - Request Routing
      - Response Caching
      - Request/Response Transform
      - Circuit Breaker
```

## Documentation Checklist

Before shipping an API:

- [ ] OpenAPI/GraphQL schema complete
- [ ] All error codes documented
- [ ] Authentication described
- [ ] Rate limits documented
- [ ] Example requests/responses
- [ ] Changelog for versions
- [ ] SDK/client libraries linked
- [ ] Postman/Insomnia collection

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Verbs in URLs | Use nouns: `/users` not `/getUsers` |
| Inconsistent naming | Pick one: camelCase or snake_case |
| Missing pagination | Always paginate lists |
| No error codes | Use machine-readable codes |
| Breaking changes | Version the API |
| Missing rate limits | Protect against abuse |
| N+1 in GraphQL | Use DataLoader |
| No request IDs | Add for debugging |

## Quick Reference

```
REST
────────────────────────────────────
GET    /resources          List all
GET    /resources/{id}     Get one
POST   /resources          Create
PUT    /resources/{id}     Replace
PATCH  /resources/{id}     Update
DELETE /resources/{id}     Remove

GraphQL
────────────────────────────────────
Query       Read operations
Mutation    Write operations
Subscription Real-time updates

Connections (Relay)
────────────────────────────────────
edges       List of edge objects
node        The actual object
cursor      Pagination cursor
pageInfo    hasNextPage, etc.
```
