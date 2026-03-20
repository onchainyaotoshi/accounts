# Development Rules

This project is developed primarily using **Claude Code** as the development interface.

## Core Principles

1. **Claude Code is the primary development tool.** All code changes, refactors, and new features are authored through Claude Code conversations.
2. **Read before writing.** Always read existing code before making changes. Understand the patterns already in use.
3. **Small, focused changes.** Each conversation or task should address one concern. Avoid sprawling multi-feature changes.
4. **Match existing patterns.** New modules, services, and controllers must follow the conventions established in the codebase.

## Code Conventions

### Module Structure

Every NestJS module follows this structure:
```
module-name/
├── module-name.module.ts     # Module definition with imports/providers/exports
├── module-name.service.ts    # Business logic (Injectable)
├── module-name.controller.ts # HTTP endpoints (optional, only if module has routes)
├── module-name.dto.ts        # Request validation DTOs (optional)
```

### Naming

- Files: `kebab-case` (e.g., `auth.controller.ts`, `current-user.decorator.ts`)
- Classes: `PascalCase` (e.g., `AuthService`, `SessionGuard`)
- Database columns: `snake_case` via Prisma `@map()` (e.g., `@map("created_at")`)
- API endpoints: `kebab-case` paths (e.g., `/signup-with-invite`, `/audit-logs`)

### Guards and Decorators

- Use `SessionGuard` for authenticated endpoints
- Use `@CurrentUser()` to extract the authenticated user
- Use `@CurrentSessionId()` to get the current session ID
- Use `@Throttle()` for rate-limited endpoints

### Error Handling

- Use NestJS built-in exceptions: `UnauthorizedException`, `BadRequestException`, `NotFoundException`
- Never expose internal error details to clients
- Use generic messages for auth failures to prevent enumeration

### Database Access

- All database access goes through `PrismaService`
- Use Prisma's type-safe query builder
- Use `$transaction` for operations that must be atomic
- Use `@map()` in schema for snake_case column names

## Git Workflow

- Write descriptive commit messages explaining the "why"
- One logical change per commit
- Run migrations as separate steps from code changes

## Testing

- Unit tests for services (mock PrismaService)
- E2E tests for critical flows (auth, OAuth)
- Test files go in `test/` directory or alongside source with `.spec.ts` suffix

## When Adding a New Module

1. Create the module directory under `apps/api/src/`
2. Create module, service, and optionally controller + DTO files
3. Register the module in `app.module.ts`
4. If it needs database access, inject `PrismaService`
5. If it has audit-worthy actions, inject `AuditService` and log events
6. Add appropriate guards and rate limiting

## When Modifying the Database

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <descriptive_name>`
3. Verify the generated migration SQL
4. Update seed script if new tables need seed data
5. Update relevant services and DTOs
