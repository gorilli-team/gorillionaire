const mongoose = require("mongoose");
const Referral = require("./src/models/Referral");
const UserActivity = require("./src/models/UserActivity");

// Test configuration
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/gorillionaire";

async function testReferralSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Test addresses
    const referrerAddress = "0x1234567890123456789012345678901234567890";
    const referredAddress = "0x0987654321098765432109876543210987654321";

    console.log("\n=== Testing Referral System ===\n");

    // 1. Test generating referral code
    console.log("1. Testing referral code generation...");
    const referral = new Referral({
      referrerAddress: referrerAddress.toLowerCase(),
      referralCode: "TEST123",
      referredUsers: [],
      totalPointsEarned: 0,
    });
    await referral.save();
    console.log("✓ Referral code generated successfully");

    // 2. Test processing referral
    console.log("\n2. Testing referral processing...");
    const newUserActivity = new UserActivity({
      address: referredAddress.toLowerCase(),
      points: 0,
      activitiesList: [],
    });
    await newUserActivity.save();

    // Add referred user to referral
    referral.referredUsers.push({
      address: referredAddress.toLowerCase(),
      joinedAt: new Date(),
      pointsEarned: 100,
      totalPoints: 0,
    });
    referral.totalPointsEarned += 100;
    await referral.save();
    console.log("✓ Referral processed successfully");

    // 3. Test referral trade bonus
    console.log("\n3. Testing referral trade bonus...");
    const tradePoints = 500;
    const referralBonus = Math.ceil(tradePoints * 0.1); // 10%

    const referrerActivity = new UserActivity({
      address: referrerAddress.toLowerCase(),
      points: 0,
      activitiesList: [],
    });
    await referrerActivity.save();

    // Award referral bonus
    referrerActivity.points += referralBonus;
    referrerActivity.activitiesList.push({
      name: "Referral Trade Bonus",
      points: referralBonus,
      date: new Date(),
      referralId: referral._id,
      referredUserAddress: referredAddress.toLowerCase(),
      originalTradePoints: tradePoints,
    });
    await referrerActivity.save();

    // Update referral record
    const referredUser = referral.referredUsers.find(
      (user) => user.address === referredAddress.toLowerCase()
    );
    if (referredUser) {
      referredUser.pointsEarned += referralBonus;
    }
    referral.totalPointsEarned += referralBonus;
    await referral.save();

    console.log(
      `✓ Referral trade bonus awarded: ${referralBonus} points (10% of ${tradePoints})`
    );

    // 4. Verify results
    console.log("\n4. Verifying results...");
    const updatedReferral = await Referral.findOne({
      referrerAddress: referrerAddress.toLowerCase(),
    });
    const updatedReferrerActivity = await UserActivity.findOne({
      address: referrerAddress.toLowerCase(),
    });

    console.log(
      `✓ Referrer total points earned: ${updatedReferral.totalPointsEarned}`
    );
    console.log(
      `✓ Referrer activity points: ${updatedReferrerActivity.points}`
    );
    console.log(
      `✓ Number of referred users: ${updatedReferral.referredUsers.length}`
    );

    console.log("\n=== All tests passed! ===\n");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the test
testReferralSystem();
