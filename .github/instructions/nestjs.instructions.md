---
applyTo: "apps/mcp-server/src/**/*.ts"
---

# NestJS MCP Server Code Review

## Module Structure

- Each module should be self-contained with its own providers and exports
- Use forwardRef only when absolutely necessary for circular dependencies
- Services should be injectable and follow single responsibility

## MCP Protocol

- Tool handlers must validate input parameters
- Resource URIs must follow the `rules://` scheme convention
- Error responses must use proper MCP error codes

## Dependency Injection

- Prefer constructor injection over property injection
- Use custom providers (useFactory, useValue) appropriately
- Avoid service locator pattern
