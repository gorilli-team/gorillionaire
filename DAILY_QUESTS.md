# Daily Quest System

## Overview

The Daily Quest System provides users with incrementally difficult daily challenges focused on trading activities. Quests reset every day and become progressively more challenging, encouraging consistent user engagement.

## Features

### Quest Types

- **Daily Transactions**: Complete a specific number of trades per day
- **Daily Volume**: Trade a specific dollar amount per day
- **Daily Signals**: Respond to a specific number of trading signals per day
- **Daily Streak**: Maintain a trading streak

### Quest Progression

Quests are designed with incrementally difficult requirements:

1. **First Steps** (1 trade) - 50 points
2. **Getting Started** (3 trades) - 100 points
3. **Active Trader** (5 trades) - 150 points
4. **Volume Builder** ($100 volume) - 200 points
5. **Dedicated Trader** (8 trades) - 250 points
6. **Volume Master** ($500 volume) - 300 points
7. **Signal Hunter** (2 signals) - 100 points
8. **Trading Pro** (12 trades) - 400 points
9. **Volume Champion** ($1000 volume) - 500 points
10. **Signal Master** (5 signals) - 200 points
11. **Trading Legend** (15 trades) - 600 points
12. **Volume Legend** ($2500 volume) - 750 points
13. **Ultimate Trader** (20 trades) - 1000 points
14. **Volume God** ($5000 volume) - 1500 points
15. **Signal Legend** (10 signals) - 500 points

## Technical Implementation

### Backend Components

#### Models

- `DailyQuest.js`: Defines quest templates with requirements and rewards
- `UserDailyQuest.js`: Tracks individual user progress on daily quests

#### Routes

- `GET /activity/daily-quests/:address`: Get user's daily quests
- `POST /activity/daily-quests/claim`: Claim quest rewards
- `POST /activity/daily-quests/reset`: Reset daily quests (testing)

### Frontend Components

#### DailyQuestHeader.tsx

- Displays daily quests in the header
- Shows progress and completion status
- Allows claiming rewards
- Auto-refreshes every 30 seconds

### Database Seeding

Run the seeding script to populate the database with daily quests:

```bash
cd app/backend
node scripts/seedDailyQuests.js
```

## User Experience

### Quest Display

- Quests appear in the header with a progress indicator
- Completed quests show a checkmark
- Claimable quests have a "Claim Reward" button
- Progress bars show completion percentage

### Daily Reset

- Quests reset at midnight (00:00 UTC)
- New quests are automatically generated for each user
- Progress is tracked per day

### Reward System

- Points are awarded immediately upon claiming
- Rewards are added to the user's total points
- Discord notifications are sent for completed quests

## Configuration

### Quest Parameters

- `questRequirement`: Number of actions needed to complete
- `questRewardAmount`: Points awarded for completion
- `questLevel`: Difficulty level (1-15)
- `questOrder`: Display order in the interface

### Quest Types

- `dailyTransactions`: Counts trades made today
- `dailyVolume`: Sums USD volume traded today
- `dailySignals`: Counts signal responses today
- `dailyStreak`: Uses current streak count

## Testing

### Reset Daily Quests

To reset daily quests for testing:

```bash
curl -X POST http://localhost:3001/activity/daily-quests/reset \
  -H "Content-Type: application/json" \
  -d '{"address": "0x..."}'
```

### Manual Quest Creation

Daily quests are automatically created when a user first accesses them each day. The system:

1. Checks if quests exist for today
2. Creates new quests if none exist
3. Updates progress based on user activity
4. Marks quests as completed when requirements are met

## Future Enhancements

- Weekly quests with larger rewards
- Seasonal quests with special themes
- Quest streaks (complete X days in a row)
- Social quests (refer friends, join Discord)
- NFT rewards for completing all daily quests
- Leaderboards for quest completion
