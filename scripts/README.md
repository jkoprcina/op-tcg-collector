# Card Data Sync

This directory contains scripts for syncing card data from the OPTCG API to your Supabase database.

## Setup

### 1. Add GitHub Secrets

You need to add two secrets to your GitHub repository:

1. **SUPABASE_URL** - Your Supabase project URL
   - Found in Supabase dashboard under Settings > API
   - Format: `https://xxxxx.supabase.co`

2. **SUPABASE_SERVICE_ROLE_KEY** - Your Supabase service role key
   - Found in Supabase dashboard under Settings > API
   - ⚠️ **IMPORTANT**: Use the SERVICE_ROLE_KEY, not the ANON_KEY
   - Keep this secret and never commit it to the repository

To add secrets:
1. Go to your GitHub repository
2. Click Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### 2. Automatic Sync

The workflow runs automatically every day at **2 AM UTC** (`.github/workflows/sync-cards.yml`).

You can also manually trigger the sync:
1. Go to your GitHub repository
2. Click "Actions"
3. Select "Sync OPTCG Card Data"
4. Click "Run workflow"

## Data Preservation

The sync process:
- ✅ Preserves all collected card data (collected_cards table)
- ✅ Preserves all collections (collections and collection_cards tables)
- ✅ Preserves user profiles and settings
- ✅ Uses `UPSERT` to safely update cards while keeping foreign key relationships intact

## Manual Sync

To run the sync script manually from your development machine:

```bash
npm install @supabase/supabase-js
SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/sync-cards.js
```

## Troubleshooting

### Workflow not running
- Check that GitHub Actions is enabled for your repository
- Verify that the secrets are set correctly

### Cards not updating
- Check the workflow logs in GitHub Actions
- Ensure the OPTCG API is accessible
- Verify the Supabase credentials are correct

### Lost data
The sync process is designed to preserve all existing data. If you experience data loss:
1. Check the workflow logs for errors
2. Verify the Supabase database backups
3. Contact support if issues persist
