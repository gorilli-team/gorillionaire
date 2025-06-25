# Activities Migration Guide

This document explains how to migrate the `activitiesList` from the `UserActivity` collection to a new independent `Activity` collection.

## Overview

The migration allows you to:

1. Keep existing `activitiesList` in `UserActivity` for backward compatibility
2. Create a new independent `Activity` collection for better performance and scalability
3. Use a feature flag to control which collection to use
4. Gradually migrate without data loss

## Files Created/Modified

### New Files:

- `src/models/Activity.js` - New Activity model
- `src/services/ActivityService.js` - Service to handle activities with feature flag
- `src/scripts/migrateActivities.js` - Migration script
- `MIGRATION_README.md` - This documentation

### Modified Files:

- `src/routes/activity/track.js` - Updated to use ActivityService
- `package.json` - Added migration script

## Migration Steps

### 1. Run the Migration Script

```bash
npm run migrate:activities
```

This script will:

- Copy all existing activities from `UserActivity.activitiesList` to the new `Activity` collection
- Skip users that already have activities in the new collection
- Preserve all activity data including references to `Intent` and `GeneratedSignal`
- Add activity type classification based on activity names

### 2. Test with Feature Flag

Set the environment variable to test the new collection:

```bash
# Use new Activity collection
USE_NEW_ACTIVITY_COLLECTION=true

# Use old UserActivity.activitiesList (default)
USE_NEW_ACTIVITY_COLLECTION=false
```

### 3. Monitor Performance

The new collection provides:

- Better query performance for large datasets
- Easier aggregation queries
- Independent scaling
- Better indexing options

### 4. Gradual Rollout

1. **Phase 1**: Run migration, keep flag set to `false`
2. **Phase 2**: Test with flag set to `true` on staging
3. **Phase 3**: Roll out to production with flag set to `true`
4. **Phase 4**: Remove old `activitiesList` from `UserActivity` (optional)

## Activity Types

The migration automatically classifies activities into types:

- `trade` - Trading activities
- `quest` - Quest completions
- `referral` - Referral bonuses
- `signin` - Account connections
- `streak` - Streak extensions
- `other` - Miscellaneous activities

## Backward Compatibility

The system maintains full backward compatibility:

- Activities are still added to `UserActivity.activitiesList`
- All existing queries continue to work
- No data loss during migration
- Can rollback by changing the feature flag

## Performance Benefits

### New Collection Benefits:

- **Faster queries**: Direct queries on Activity collection
- **Better aggregation**: Optimized for weekly leaderboards
- **Reduced document size**: UserActivity documents are smaller
- **Independent scaling**: Activity collection can be scaled separately

### Indexes Created:

- `userAddress + date` - For user activity queries
- `date` - For time-based queries
- `userAddress + activityType` - For filtered queries
- `date + name` - For weekly leaderboards
- `date + points` - For point-based queries

## Monitoring

Monitor the migration with these metrics:

- Total users processed
- Total activities migrated
- Migration duration
- Error count

## Rollback Plan

If issues arise:

1. Set `USE_NEW_ACTIVITY_COLLECTION=false`
2. The system will continue using `UserActivity.activitiesList`
3. No data loss occurs
4. Can investigate and fix issues before re-enabling

## Future Steps

After successful migration:

1. Update all routes to use ActivityService
2. Remove dependency on `UserActivity.activitiesList`
3. Consider removing `activitiesList` field from UserActivity schema
4. Add more activity types and metadata as needed

## Troubleshooting

### Common Issues:

1. **Migration fails**: Check MongoDB connection and permissions
2. **Duplicate activities**: Migration script skips existing activities
3. **Performance issues**: Ensure proper indexes are created
4. **Feature flag not working**: Verify environment variable is set correctly

### Logs to Monitor:

- Migration script output
- ActivityService usage logs
- Query performance metrics
- Error logs in application

## Support

For issues or questions:

1. Check the migration logs
2. Verify environment variables
3. Test with feature flag disabled
4. Review MongoDB indexes
