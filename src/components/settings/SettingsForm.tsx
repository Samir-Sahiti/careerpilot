"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Lock, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SettingsFormProps {
  initialDisplayName: string;
  email: string;
}

export function SettingsForm({ initialDisplayName, email }: SettingsFormProps) {
  const router = useRouter();
  const supabase = createClient();

  // Profile State
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security State
  const [newEmail, setNewEmail] = useState(email);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailChangePending, setEmailChangePending] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Danger Zone State
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Display Name cannot be empty");
      return;
    }

    if (displayName.trim().length > 50) {
      toast.error("Display Name must be 50 characters or less");
      return;
    }

    setIsSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: displayName.trim() })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === email) return;

    setIsSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      toast.success("Confirmation links sent to both old and new email addresses!");
      setEmailChangePending(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const isConfirmed = window.confirm(
      "Are you absolutely sure? This will instantly obliterate your entire account, all uploaded CVs, and all interview history. This action cannot be undone."
    );

    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }

      toast.success("Account deleted permanently. Goodbye!");
      
      // Destroy local session completely just in case the server cookie doesn't flush immediately
      await supabase.auth.signOut();
      
      router.push("/");
    } catch (error: any) {
      toast.error(error.message || "An error occurred deleting the account");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Profile Section ───────────────────────────────────────────────── */}
      <section className="bg-[#111827] border border-[#1E3A5F] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#1E3A5F] flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
            <User className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Profile Details</h2>
            <p className="text-sm text-gray-400">Manage your personalized display name.</p>
          </div>
        </div>
        
        <form onSubmit={handleSaveProfile} className="p-6 bg-[#0D1117]">
          <div className="max-w-md space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1.5">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                maxLength={50}
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#1A263A] border border-[#2A4B75] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="e.g. Samir"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Security Section ──────────────────────────────────────────────── */}
      <section className="bg-[#111827] border border-[#1E3A5F] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#1E3A5F] flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
            <Lock className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Account Security</h2>
            <p className="text-sm text-gray-400">Update your email preferences or change your password.</p>
          </div>
        </div>

        <div className="p-6 bg-[#0D1117] space-y-6">
          <form onSubmit={handleSaveEmail} className="max-w-md space-y-4">
            <h3 className="text-sm font-semibold text-gray-200">Change Email Address</h3>
            <div>
              <label htmlFor="newEmail" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                id="newEmail"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-[#1A263A] border border-[#2A4B75] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingEmail || newEmail === email}
              className="px-6 py-2.5 bg-[#1E3A5F] hover:bg-[#2A4B75] text-white rounded-lg font-medium transition-colors border border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSavingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSavingEmail ? "Updating Email..." : "Update Email"}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              You will receive a confirmation link at both your old and new email addresses to verify the change.
            </p>
            {emailChangePending && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Check your inbox to confirm the email change.
              </div>
            )}
          </form>

          <div className="border-t border-[#1E3A5F] pt-6"></div>

          <form onSubmit={handleSavePassword} className="max-w-md space-y-4">
            <h3 className="text-sm font-semibold text-gray-200">Change Password</h3>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                minLength={6}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#1A263A] border border-[#2A4B75] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#1A263A] border border-[#2A4B75] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPassword || !newPassword || !confirmPassword}
              className="px-6 py-2.5 bg-[#1E3A5F] hover:bg-[#2A4B75] text-white rounded-lg font-medium transition-colors border border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSavingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSavingPassword ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>
      </section>

      {/* ── Danger Zone ───────────────────────────────────────────────────── */}
      <section className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden mt-12">
        <div className="p-6 border-b border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg shrink-0 h-fit">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
              <p className="text-sm text-red-400/80 mt-1 max-w-lg">
                Once you delete your account, there is no going back. Please be certain. All uploaded CVs, AI analyses, and generated roadmaps will be permanently removed.
              </p>
            </div>
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 hover:border-transparent rounded-lg font-medium transition-all shrink-0 flex items-center justify-center gap-2"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </section>
    </div>
  );
}
