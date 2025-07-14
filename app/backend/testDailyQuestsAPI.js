const axios = require("axios");

async function testDailyQuestsAPI() {
  try {
    console.log("🧪 Testing Daily Quests API...");

    // Test with a dummy address
    const testAddress = "0x1234567890123456789012345678901234567890";
    const response = await axios.get(
      `http://localhost:3001/activity/daily-quests/${testAddress}`
    );

    console.log("✅ API Response Status:", response.status);
    console.log("📊 Response Data:", JSON.stringify(response.data, null, 2));

    if (response.data.quests) {
      console.log(`\n📋 Found ${response.data.quests.length} quests`);
      response.data.quests.forEach((quest, index) => {
        console.log(
          `${index + 1}. ${quest.questName} - Progress: ${
            quest.currentProgress
          }/${quest.questRequirement}`
        );
      });
    }
  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);
  }
}

testDailyQuestsAPI();
