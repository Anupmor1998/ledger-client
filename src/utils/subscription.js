/**
 * Utility to determine user subscription status and whether mutations are allowed
 */
export function isSubscriptionExpired(user) {
  if (!user || user.role === "ADMIN") {
    return false;
  }

  const isVip =
    user.subscriptionPlan === "COMPLIMENTARY" ||
    (user.subscriptionPlan === "PREMIUM" && user.billingCycle === "LIFETIME") ||
    (user.subscriptionPlan === "PREMIUM" && !user.planExpiresAt);

  if (isVip) {
    return false;
  }

  const now = new Date();
  const currentPlan = String(user.subscriptionPlan || "TRIAL").toUpperCase();

  if (currentPlan === "TRIAL") {
    const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    if (!trialEnd) return false;
    return trialEnd.getTime() <= now.getTime();
  }

  if (user.planExpiresAt) {
    return new Date(user.planExpiresAt).getTime() <= now.getTime();
  }

  return false;
}

