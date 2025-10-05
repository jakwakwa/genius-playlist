# Migration Quick Start Commands

## Essential Commands (In Order)

```bash
# 1. Set up database
createdb playlistgenius

# 2. Generate .env secret
openssl rand -base64 32  # Copy output to NEXTAUTH_SECRET in .env

# 3. Install dependencies
pnpm add @prisma/client next-auth @auth/prisma-adapter
pnpm add -D prisma

# 4. Remove legacy packages
pnpm remove express express-session connect-pg-simple memorystore passport passport-local wouter

# 5. Generate Prisma Client
npx prisma generate

# 6. Create and run migrations
npx prisma migrate dev --name init

# 7. Start development server
pnpm dev

# 8. (Optional) Open Prisma Studio to view data
npx prisma studio
```

## Environment Variables Template

Create/update `.env`:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/playlistgenius?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<run: openssl rand -base64 32>"
SPOTIFY_CLIENT_ID="get-from-spotify-dashboard"
SPOTIFY_CLIENT_SECRET="get-from-spotify-dashboard"
OPENAI_API_KEY="sk-..."
OPENAI_ASSISTANT_ID="asst_..."
```

## Files Already Created

✅ `prisma/schema.prisma` - Database schema
✅ `lib/prisma.ts` - Prisma client singleton  
✅ `lib/spotify-client.ts` - Spotify API client with token refresh
✅ `MIGRATION_GUIDE.md` - Detailed migration guide

## Files You Need to Create

📝 `app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
📝 `app/api/user/route.ts` - User API endpoint
📝 `app/api/playlists/route.ts` - Playlists API endpoint
📝 `app/api/playlists/[id]/tracks/route.ts` - Playlist tracks endpoint
📝 `app/api/generate-playlist/route.ts` - AI playlist generation
📝 `app/api/save-to-spotify/[id]/route.ts` - Save playlist to Spotify
📝 `app/api/chat/route.ts` - Chat messages endpoint
📝 `lib/auth.ts` - Auth helper functions
📝 `app/providers.tsx` - React Query & NextAuth providers
  
## Files to Update

🔄 `app/layout.tsx` - Add Providers wrapper
🔄 `app/page.tsx` - Simplify to render Home component
🔄 `components/pages/home.tsx` - Remove wouter, add useSession
🔄 `next.config.mjs` - Add Spotify image domains
🔄 `package.json` - Update scripts

## Common Issues & Quick Fixes

### Issue: Module not found '@/lib/...'
```bash
# Check tsconfig.json has:
"baseUrl": ".",
"paths": { "@/*": ["./*"] }
```

### Issue: Prisma client not generated
```bash
npx prisma generate
```

### Issue: Database connection fails
```bash
# Test connection:
psql postgresql://username:password@localhost:5432/playlistgenius

# Or check if PostgreSQL is running:
pg_isready
```

### Issue: NextAuth errors
```bash
# Ensure .env has:
NEXTAUTH_SECRET="<generated-secret>"
NEXTAUTH_URL="http://localhost:3000"

# Clear browser cookies and try again
```

## Verification Steps

```bash
# 1. Check Prisma connection
npx prisma db pull --force

# 2. View generated tables
npx prisma studio

# 3. Type check
pnpm run type-check

# 4. Run dev server
pnpm dev
```

## Helpful Commands

```bash
# View Prisma migrations
ls prisma/migrations

# Reset database (⚠️  deletes all data)
npx prisma migrate reset

# Push schema without migrations (dev only)
npx prisma db push

# Format Prisma schema
npx prisma format

# View generated Prisma client
ls node_modules/@prisma/client
```

## Next Steps After Migration

1. Test authentication flow
2. Test all API endpoints
3. Update README.md with new setup instructions
4. Commit changes to migration branch
5. Create PR for code review
6. Deploy to production with production database

## Get Help

- Review `MIGRATION_GUIDE.md` for detailed explanations
- Check Next.js docs: https://nextjs.org/docs
- Check Prisma docs: https://prisma.io/docs
- Check NextAuth docs: https://next-auth.js.org
