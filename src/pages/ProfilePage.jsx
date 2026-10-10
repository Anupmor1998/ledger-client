import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import {
  getMyPreferences,
  getMyProfile,
  updateMyProfile,
  updateMyPreferences,
} from "../lib/api";
import SearchableSelect from "../components/SearchableSelect";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUserProfile } from "../store/slices/authSlice";
import { buildFinancialYearOptions, getCurrentFinancialYearStart, getFinancialYearLabel } from "../utils/financialYear";
import { profileSchema } from "../validation/authSchemas";

function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedFinancialYearStart, setSelectedFinancialYearStart] = useState(
    user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
  );
  const [financialYearSaving, setFinancialYearSaving] = useState(false);
  const financialYearOptions = buildFinancialYearOptions(8, 3);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      firmName: "",
      businessSubtitle: "",
      contactPhone: "",
      businessAddress: "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const watchFirmName = watch("firmName");
  const watchName = watch("name");
  const watchSubtitle = watch("businessSubtitle");
  const watchAddress = watch("businessAddress");
  const watchPhone = watch("contactPhone");

  useEffect(() => {
    reset({
      name: user?.name || "",
      email: user?.email || "",
      firmName: user?.firmName || "",
      businessSubtitle: user?.businessSubtitle || "",
      contactPhone: user?.contactPhone || "",
      businessAddress: user?.businessAddress || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  }, [reset, user]);

  useEffect(() => {
    setSelectedFinancialYearStart(user?.selectedFinancialYearStart || getCurrentFinancialYearStart());
  }, [user?.selectedFinancialYearStart]);

  useEffect(() => {
    async function loadProfileExtras() {
      try {
        const [profileData, preferenceData] = await Promise.all([
          getMyProfile(),
          getMyPreferences(),
        ]);

        if (profileData) {
          dispatch(setUserProfile(profileData));
          reset({
            name: profileData.name || "",
            email: profileData.email || "",
            firmName: profileData.firmName || "",
            businessSubtitle: profileData.businessSubtitle || "",
            contactPhone: profileData.contactPhone || "",
            businessAddress: profileData.businessAddress || "",
            currentPassword: "",
            newPassword: "",
            confirmNewPassword: "",
          });
        }

        if (preferenceData?.selectedFinancialYearStart) {
          setSelectedFinancialYearStart(preferenceData.selectedFinancialYearStart);
          dispatch(
            setUserProfile({
              selectedFinancialYearStart: preferenceData.selectedFinancialYearStart,
            })
          );
        }
      } catch (error) {
        const message =
          error?.response?.data?.message || error?.message || "Unable to load profile settings.";
        toast.error(message);
      }
    }

    loadProfileExtras();
  }, [dispatch, reset]);

  async function onSubmit(values) {
    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        firmName: values.firmName ? values.firmName.trim() : null,
        businessSubtitle: values.businessSubtitle ? values.businessSubtitle.trim() : null,
        contactPhone: values.contactPhone ? values.contactPhone.trim() : null,
        businessAddress: values.businessAddress ? values.businessAddress.trim() : null,
      };

      if (values.currentPassword || values.newPassword) {
        payload.currentPassword = values.currentPassword;
        payload.newPassword = values.newPassword;
      }

      const updatedUser = await updateMyProfile(payload);
      dispatch(setUserProfile(updatedUser));
      toast.success("Profile updated successfully");
      reset({
        name: updatedUser?.name || "",
        email: updatedUser?.email || "",
        firmName: updatedUser?.firmName || "",
        businessSubtitle: updatedUser?.businessSubtitle || "",
        contactPhone: updatedUser?.contactPhone || "",
        businessAddress: updatedUser?.businessAddress || "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to update profile.";
      toast.error(message);
    }
  }

  async function handleSaveFinancialYear(event) {
    event.preventDefault();
    setFinancialYearSaving(true);
    try {
      const updated = await updateMyPreferences({
        selectedFinancialYearStart: Number(selectedFinancialYearStart),
      });
      dispatch(
        setUserProfile({
          selectedFinancialYearStart: updated.selectedFinancialYearStart,
        })
      );
      toast.success(`Financial year changed to ${updated.selectedFinancialYearLabel}.`);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to update financial year.";
      toast.error(message);
    } finally {
      setFinancialYearSaving(false);
    }
  }

  return (
    <section className="auth-card p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Profile</h2>
      <p className="mt-1 text-sm muted-text">
        Update your name, email and password.
      </p>

      <div className="mt-4 rounded-lg border border-border p-3 sm:p-4">
        <h3 className="text-base font-semibold">Financial Year</h3>
        <p className="mt-1 text-sm muted-text">
          Orders and reports will show data for the selected financial year.
        </p>

        <form
          onSubmit={handleSaveFinancialYear}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <SearchableSelect
            label="Selected Financial Year"
            value={String(selectedFinancialYearStart)}
            onChange={(nextValue) => setSelectedFinancialYearStart(Number(nextValue))}
            options={financialYearOptions.map((option) => ({
              value: String(option.value),
              label: option.label,
            }))}
            placeholder="Select financial year"
            className="min-w-[220px]"
          />

          <button type="submit" className="primary-btn w-full sm:w-auto sm:min-w-[220px]" disabled={financialYearSaving}>
            {financialYearSaving ? "Saving..." : "Save Financial Year"}
          </button>
        </form>

        <p className="mt-2 text-xs muted-text">
          Active year: {getFinancialYearLabel(selectedFinancialYearStart)}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm muted-text">Name</span>
          <input className="form-input" {...register("name")} />
          {errors.name ? <p className="mt-1 text-sm text-red-500">{errors.name.message}</p> : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm muted-text">Email</span>
          <input className="form-input" type="email" {...register("email")} />
          {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email.message}</p> : null}
        </label>

        <div className="rounded-lg border border-border p-4 bg-surface/50">
          <div className="flex items-center gap-2 mb-1">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-accent fill-none stroke-current stroke-2"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <h3 className="text-base font-semibold text-text">
              Business & Report Header Settings
            </h3>
          </div>
          <p className="text-xs muted-text mb-4">
            These business details will appear at the top of all exported PDF & Excel reports and on shared WhatsApp sauda slips.
          </p>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Firm / Business Name
              </span>
              <input
                className="form-input"
                placeholder="e.g. Shree Balaji Textiles"
                {...register("firmName")}
              />
              <span className="mt-1 block text-[11px] muted-text">
                Header Line 1 on PDF/Excel reports
              </span>
              {errors.firmName ? (
                <p className="mt-1 text-xs text-red-500">{errors.firmName.message}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Business Tagline / Subtitle
              </span>
              <input
                className="form-input"
                placeholder="e.g. Fabric Broker & Commission Agent"
                {...register("businessSubtitle")}
              />
              <span className="mt-1 block text-[11px] muted-text">
                Header Line 2 on PDF/Excel reports
              </span>
              {errors.businessSubtitle ? (
                <p className="mt-1 text-xs text-red-500">{errors.businessSubtitle.message}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Contact Phone Number(s)
              </span>
              <input
                className="form-input"
                placeholder="e.g. 9876543210, 9898989898"
                {...register("contactPhone")}
              />
              <span className="mt-1 block text-[11px] muted-text">
                Header Line 3 on PDF/Excel reports
              </span>
              {errors.contactPhone ? (
                <p className="mt-1 text-xs text-red-500">{errors.contactPhone.message}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                Business / Office Address
              </span>
              <input
                className="form-input"
                placeholder="e.g. Shop 204, Millennium Textile Market, Ring Road, Surat"
                {...register("businessAddress")}
              />
              <span className="mt-1 block text-[11px] muted-text">
                Header Line 4 on PDF/Excel reports
              </span>
              {errors.businessAddress ? (
                <p className="mt-1 text-xs text-red-500">{errors.businessAddress.message}</p>
              ) : null}
            </label>
          </div>

          {/* Exact PDF & Excel Report Header Live Preview */}
          <div className="mt-5 rounded-xl border border-border bg-bg/70 p-4">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text">
                  Report Sheet Live Preview
                </span>
                <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                  Exact PDF & Excel Output
                </span>
              </div>
              <span className="text-[11px] muted-text hidden sm:inline">
                Updates in real-time as you type
              </span>
            </div>

            {/* Sheet Canvas with Excel/PDF meta styling */}
            <div className="overflow-hidden rounded-lg border border-[#444444] shadow-sm">
              <div className="bg-[#d9d9d9] px-4 py-3 text-center text-[#111111] font-mono select-none">
                <div className="text-base font-extrabold tracking-wide sm:text-lg">
                  {watchFirmName || user?.firmName || watchName || user?.name || "Your Firm Name"}
                </div>

                {(watchSubtitle || user?.businessSubtitle) ? (
                  <div className="mt-0.5 text-xs font-bold sm:text-sm">
                    {watchSubtitle || user?.businessSubtitle}
                  </div>
                ) : null}

                {(watchAddress || user?.businessAddress) ? (
                  <div className="mt-0.5 text-[11px] font-bold sm:text-xs">
                    {watchAddress || user?.businessAddress}
                  </div>
                ) : null}

                {(watchPhone || user?.contactPhone) ? (
                  <div className="mt-0.5 text-xs font-bold sm:text-sm">
                    {(() => {
                      const raw = watchPhone || user?.contactPhone || "";
                      return raw.startsWith("(M)") ? raw : `(M) ${raw}`;
                    })()}
                  </div>
                ) : null}
              </div>

              {/* Sample Party Filter Banner */}
              <div className="border-t border-[#444444] bg-[#e6e6e6] px-3 py-1 font-mono text-[11px] font-bold text-[#222222]">
                Customer Firm Name : Sample Customer Textiles
              </div>

              {/* Sample Report Table Columns Header */}
              <div className="border-t border-[#444444] bg-[#d9d9d9] px-3 py-1 font-mono text-[10px] font-bold text-[#111111] grid grid-cols-6 gap-1 text-center">
                <span>DATE</span>
                <span>ORDER NO</span>
                <span>QUALITY</span>
                <span>TAKKA</span>
                <span>METERS</span>
                <span>RATE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Change Password (Optional)</p>

          <label className="mt-3 block">
            <span className="mb-1 block text-sm muted-text">Current Password</span>
            <div className="relative">
              <input
                className="form-input pr-12"
                type={showCurrentPassword ? "text" : "password"}
                {...register("currentPassword")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 muted-text"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
              >
                {showCurrentPassword ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                    <path d="M9.9 4.2A10.9 10.9 0 0112 4c5.5 0 9.3 4.4 10 8-.3 1.6-1.3 3.4-2.8 5" />
                    <path d="M6.6 6.6C4.6 8 3.3 10 2 12c1 3.8 5 8 10 8 2 0 3.8-.5 5.3-1.4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <path d="M2 12s3.6-8 10-8 10 8 10 8-3.6 8-10 8-10-8-10-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.currentPassword ? (
              <p className="mt-1 text-sm text-red-500">{errors.currentPassword.message}</p>
            ) : null}
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-sm muted-text">New Password</span>
            <div className="relative">
              <input
                className="form-input pr-12"
                type={showNewPassword ? "text" : "password"}
                {...register("newPassword")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 muted-text"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              >
                {showNewPassword ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                    <path d="M9.9 4.2A10.9 10.9 0 0112 4c5.5 0 9.3 4.4 10 8-.3 1.6-1.3 3.4-2.8 5" />
                    <path d="M6.6 6.6C4.6 8 3.3 10 2 12c1 3.8 5 8 10 8 2 0 3.8-.5 5.3-1.4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <path d="M2 12s3.6-8 10-8 10 8 10 8-3.6 8-10 8-10-8-10-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.newPassword ? <p className="mt-1 text-sm text-red-500">{errors.newPassword.message}</p> : null}
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-sm muted-text">Confirm New Password</span>
            <div className="relative">
              <input
                className="form-input pr-12"
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmNewPassword")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 muted-text"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                    <path d="M9.9 4.2A10.9 10.9 0 0112 4c5.5 0 9.3 4.4 10 8-.3 1.6-1.3 3.4-2.8 5" />
                    <path d="M6.6 6.6C4.6 8 3.3 10 2 12c1 3.8 5 8 10 8 2 0 3.8-.5 5.3-1.4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <path d="M2 12s3.6-8 10-8 10 8 10 8-3.6 8-10 8-10-8-10-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmNewPassword ? (
              <p className="mt-1 text-sm text-red-500">{errors.confirmNewPassword.message}</p>
            ) : null}
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} className="primary-btn sm:w-auto">
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </section>
  );
}

export default ProfilePage;
