const UserActivity = require("../models/UserActivity");

async function awardRefuseSignalPoints(address, signalId) {
  const userActivity = await UserActivity.findOne({
    address: address.toLowerCase(),
  });

  if (!userActivity) {
    throw new Error("User activity not found");
  }

  userActivity.points += 5;
  userActivity.activitiesList.push({
    name: "Signal Refused",
    points: 5,
    date: new Date(),
    signalId: signalId,
  });
  await userActivity.save();
}

module.exports = {
  awardRefuseSignalPoints,
};
