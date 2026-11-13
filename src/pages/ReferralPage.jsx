import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getMyReferralInfo } from "../lib/api";

function GiftIcon({ className = "h-5 w-5 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function ShareIcon({ className = "h-4 w-4 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function CopyIcon({ className = "h-4 w-4 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-4 w-4 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function UsersIcon({ className = "h-5 w-5 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon({ className = "h-5 w-5 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function AwardIcon({ className = "h-5 w-5 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

function ReferralPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  async function fetchReferralData() {
    setLoading(true);
    try {
      const res = await getMyReferralInfo();
      setData(res);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load referral details");
    } finally {
      setLoading(false);
    }
  }

  const stats = data?.stats || {
    totalInvited: 0,
    totalConverted: 0,
    daysEarned: 0,
    maxDaysYear: 90,
    daysRemaining: 90,
  };

  const referralLink = data?.referralLink
    ? data.referralLink.replace(/(\.in|\.com)\/\?ref=/, "$1/signup?ref=")
    : data?.referralCode
    ? `https://saudabook.co.in/signup?ref=${data.referralCode}`
    : "";

  function handleCopyCode() {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopiedCode(true);
    toast.success("Referral code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleCopyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleShareWhatsApp() {
    if (!referralLink) return;
    const msg = `Try Sauda Book for textile brokerage & trading! Sign up using my referral link to get a 29-day free trial:\n${referralLink}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  const progressPercent = Math.min(
    100,
    Math.round((stats.daysEarned / (stats.maxDaysYear || 90)) * 100),
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-accent/10 border border-primary/20 p-5 md:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <GiftIcon className="h-3.5 w-3.5 shrink-0" />
              <span>Refer & Earn Free Subscription</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-text">
              Invite Friends, Earn Extra Free Days
            </h1>
            <p className="text-xs md:text-sm text-muted-text leading-relaxed">
              Share your link with colleagues in textile brokerage & trading. Your friends get a{" "}
              <strong className="text-text">29-day free trial</strong>, and you earn{" "}
              <strong className="text-text">+15 days</strong> of free subscription when they purchase their first plan.
            </p>
          </div>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs md:text-sm shadow-md transition-all shrink-0 cursor-pointer"
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            <span>Share via WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Annual Cap Progress Card */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-text">
              Annual Reward Progress ({new Date().getFullYear()})
            </span>
            <div className="text-2xl font-black text-text mt-0.5">
              {stats.daysEarned} / {stats.maxDaysYear} Days Earned
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-muted-text">Available to earn this year:</span>
            <div className="text-sm font-bold text-primary">
              {stats.daysRemaining} days remaining (up to {Math.ceil(stats.daysRemaining / 15)} more friends)
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="w-full h-3 rounded-full bg-surface-muted overflow-hidden border border-border">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-text">
            <span>0 days</span>
            <span>45 days</span>
            <span>Cap: 90 days / year</span>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-surface-muted border border-border/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <UsersIcon className="h-5 w-5 shrink-0" />
            </div>
            <div>
              <div className="text-xs text-muted-text">Friends Invited</div>
              <div className="text-lg font-bold text-text">{stats.totalInvited}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-border/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <AwardIcon className="h-5 w-5 shrink-0" />
            </div>
            <div>
              <div className="text-xs text-muted-text">Converted to Paid</div>
              <div className="text-lg font-bold text-text">{stats.totalConverted}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-border/60 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
              <CalendarIcon className="h-5 w-5 shrink-0" />
            </div>
            <div>
              <div className="text-xs text-muted-text">Reward Per Friend</div>
              <div className="text-lg font-bold text-text">+15 Days Extension</div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Box Card */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-text flex items-center gap-2">
          <ShareIcon className="h-4 w-4 shrink-0 text-primary" />
          <span>Your Referral Link & Code</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Referral Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-text">Referral Code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-surface-muted border border-border font-mono text-base font-bold text-text tracking-wider">
                {data?.referralCode || "------"}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-2.5 rounded-xl border border-border hover:bg-surface-muted text-text text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              >
                {copiedCode ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <CopyIcon className="h-4 w-4 text-muted-text" />}
                <span>{copiedCode ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Referral Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-text">Direct Invite Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 px-3 py-2.5 rounded-xl bg-surface-muted border border-border text-xs text-text truncate outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2.5 rounded-xl border border-border hover:bg-surface-muted text-text text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              >
                {copiedLink ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <CopyIcon className="h-4 w-4 text-muted-text" />}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Steps */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">How Sauda Book Referrals Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-surface-muted border border-border/60 space-y-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h3 className="text-xs font-bold text-text">Share Your Invite Link</h3>
            <p className="text-[11px] text-muted-text leading-relaxed">
              Send your personal link or referral code to brokers, traders, or partners via WhatsApp or email.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-muted border border-border/60 space-y-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h3 className="text-xs font-bold text-text">Friend Gets 29 Days Free</h3>
            <p className="text-[11px] text-muted-text leading-relaxed">
              When they sign up with your code, they immediately receive an extended 29-day free trial (standard 14 + 15 bonus days).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-muted border border-border/60 space-y-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h3 className="text-xs font-bold text-text">You Earn +15 Days</h3>
            <p className="text-[11px] text-muted-text leading-relaxed">
              When your invited friend purchases their first paid plan, +15 days are automatically added to your subscription plan.
            </p>
          </div>
        </div>
      </div>

      {/* Referrals List Table */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Your Referral History</h2>
          <span className="text-xs text-muted-text font-medium">
            {data?.referrals?.length || 0} friends joined
          </span>
        </div>

        {(!data?.referrals || data.referrals.length === 0) ? (
          <div className="py-10 text-center space-y-2 text-muted-text border border-dashed border-border rounded-xl">
            <UsersIcon className="h-8 w-8 mx-auto opacity-40 shrink-0" />
            <p className="text-xs font-medium">No referrals yet.</p>
            <p className="text-[11px] max-w-sm mx-auto">
              Share your link above to invite friends and start earning free subscription days!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-muted-text border-b border-border uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Friend / Contact</th>
                  <th className="py-3 px-4">Date Joined</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Your Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.referrals.map((item) => {
                  const isConverted = item.status === "CONVERTED";
                  return (
                    <tr key={item.id} className="hover:bg-surface-muted/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text">{item.refereeName}</div>
                        <div className="text-[11px] text-muted-text">
                          {item.refereeFirm ? `${item.refereeFirm} • ` : ""}
                          {item.refereePhoneMasked || "Phone verified"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-text">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {isConverted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckIcon className="h-3 w-3 shrink-0" />
                            <span>Subscribed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <span>Trial Active</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {isConverted ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{item.rewardDays || 15} Days Granted
                          </span>
                        ) : (
                          <span className="text-muted-text">
                            Pending First Plan
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReferralPage;
