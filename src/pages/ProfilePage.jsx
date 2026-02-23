import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import {
  createMyWhatsAppGroup,
  deleteMyWhatsAppGroup,
  getMyWhatsAppGroups,
  updateMyProfile,
} from "../lib/api";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUserProfile } from "../store/slices/authSlice";
import { profileSchema } from "../validation/authSchemas";

function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupForm, setGroupForm] = useState({ name: "", inviteLink: "" });
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupDeletingId, setGroupDeletingId] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    reset({
      name: user?.name || "",
      email: user?.email || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  }, [reset, user]);

  useEffect(() => {
    async function loadGroups() {
      try {
        const data = await getMyWhatsAppGroups();
        setGroups(Array.isArray(data) ? data : []);
      } catch (error) {
        const message =
          error?.response?.data?.message || error?.message || "Unable to load WhatsApp groups.";
        toast.error(message);
      }
    }

    loadGroups();
  }, []);

  async function onSubmit(values) {
    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
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

  async function handleAddGroup(event) {
    event.preventDefault();
    const name = groupForm.name.trim();
    const inviteLink = groupForm.inviteLink.trim();
    if (!name || !inviteLink) {
      toast.error("Group name and invite link are required.");
      return;
    }

    setGroupSubmitting(true);
    try {
      const created = await createMyWhatsAppGroup({ name, inviteLink });
      setGroups((prev) => [...prev, created]);
      setGroupForm({ name: "", inviteLink: "" });
      toast.success("WhatsApp group added.");
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to add WhatsApp group.";
      toast.error(message);
    } finally {
      setGroupSubmitting(false);
    }
  }

  async function handleDeleteGroup(id) {
    setGroupDeletingId(id);
    try {
      await deleteMyWhatsAppGroup(id);
      setGroups((prev) => prev.filter((group) => group.id !== id));
      toast.success("WhatsApp group removed.");
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to remove WhatsApp group.";
      toast.error(message);
    } finally {
      setGroupDeletingId("");
    }
  }

  return (
    <section className="auth-card p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Profile</h2>
      <p className="mt-1 text-sm muted-text">
        Update your name, email and password.
      </p>

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

      <div className="mt-8 rounded-lg border border-border p-3 sm:p-4">
        <h3 className="text-base font-semibold">WhatsApp Groups (Optional)</h3>
        <p className="mt-1 text-sm muted-text">
          Add group invite links for quick sharing from order WhatsApp modal.
        </p>

        <form onSubmit={handleAddGroup} className="mt-3 grid gap-3 sm:grid-cols-5">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm muted-text">Group Name</span>
            <input
              className="form-input"
              value={groupForm.name}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Surat Brokers"
            />
          </label>
          <label className="block sm:col-span-3">
            <span className="mb-1 block text-sm muted-text">Group Invite Link</span>
            <input
              className="form-input"
              value={groupForm.inviteLink}
              onChange={(event) =>
                setGroupForm((prev) => ({ ...prev, inviteLink: event.target.value }))
              }
              placeholder="https://chat.whatsapp.com/..."
            />
          </label>
          <div className="sm:col-span-5">
            <button type="submit" className="primary-btn sm:w-auto" disabled={groupSubmitting}>
              {groupSubmitting ? "Adding..." : "Add Group"}
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          {groups.length === 0 ? (
            <p className="text-sm muted-text">No groups added yet.</p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{group.name}</p>
                  <a
                    href={group.inviteLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-link break-all"
                  >
                    {group.inviteLink}
                  </a>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-red-400/40 p-2 text-red-500 hover:bg-red-50"
                  onClick={() => handleDeleteGroup(group.id)}
                  disabled={groupDeletingId === group.id}
                  aria-label="Delete group"
                  title="Delete group"
                >
                  {groupDeletingId === group.id ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                      <path d="M4 7h16" />
                      <path d="M9 7V5h6v2" />
                      <path d="M7 7l1 12h8l1-12" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
