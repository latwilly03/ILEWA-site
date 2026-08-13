export const referralRewards = [
  { referrals: 1, name: "Founding Member badge" },
  { referrals: 3, name: "Priority early access" },
  { referrals: 5, name: "First-drop access" },
  { referrals: 50, name: "$10 launch credit" }
];

export function nextReward(referrals) {
  return referralRewards.find((reward) => referrals < reward.referrals) || null;
}
