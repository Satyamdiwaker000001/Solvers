/**
 * Identity Migration & Reconciliation Service (Phase F).
 *
 * Guarantees:
 * - Read-only conflict detection and non-destructive reconciliation.
 * - Detects duplicate numeric githubUserId, duplicate folder mappings,
 *   duplicate studentId, and malformed identifiers.
 * - NEVER chooses an arbitrary winner when two records conflict.
 * - NEVER deletes student accounts, submissions, or progress events.
 * - Idempotent: safe to run repeatedly.
 */

import { Submission, User } from "../models.js";
import { nextStudentId } from "../lib/studentIds.js";

/**
 * Scan all User documents and detect identity inconsistencies or conflicts.
 * Returns a detailed diagnosis report without mutating data.
 */
export async function detectIdentityConflicts() {
  const users = await User.find({}).lean();
  const byGithubId = new Map();
  const byFolder = new Map();
  const byStudentId = new Map();

  const invalidGithubIds = [];
  const duplicateGithubIds = [];
  const duplicateFolders = [];
  const duplicateStudentIds = [];
  const unmappedApprovedStudents = [];

  for (const u of users) {
    // 1. Check numeric githubUserId
    const gid = String(u.githubUserId || "").trim();
    if (!gid || !/^\d+$/.test(gid)) {
      invalidGithubIds.push({ userId: String(u._id), githubLogin: u.githubLogin, githubUserId: u.githubUserId });
    } else {
      if (!byGithubId.has(gid)) byGithubId.set(gid, []);
      byGithubId.get(gid).push(u);
    }

    // 2. Check student folder uniqueness (case-insensitive)
    const folder = String(u.folder || "").trim().toLowerCase();
    if (folder) {
      if (!byFolder.has(folder)) byFolder.set(folder, []);
      byFolder.get(folder).push(u);
    }

    // 3. Check studentId uniqueness
    const sid = String(u.studentId || "").trim();
    if (sid) {
      if (!byStudentId.has(sid)) byStudentId.set(sid, []);
      byStudentId.get(sid).push(u);
    }

    // 4. Check approved students missing canonical studentId or folder
    if (u.role === "student" && u.accountStatus === "approved") {
      if (!u.studentId || !u.folder) {
        unmappedApprovedStudents.push({
          userId: String(u._id),
          githubLogin: u.githubLogin,
          studentId: u.studentId || null,
          folder: u.folder || null,
        });
      }
    }
  }

  for (const [gid, list] of byGithubId.entries()) {
    if (list.length > 1) {
      duplicateGithubIds.push({
        githubUserId: gid,
        count: list.length,
        users: list.map((u) => ({ id: String(u._id), login: u.githubLogin, role: u.role, status: u.accountStatus })),
      });
    }
  }

  for (const [folder, list] of byFolder.entries()) {
    if (list.length > 1) {
      duplicateFolders.push({
        folder,
        count: list.length,
        users: list.map((u) => ({ id: String(u._id), login: u.githubLogin, studentId: u.studentId })),
      });
    }
  }

  for (const [sid, list] of byStudentId.entries()) {
    if (list.length > 1) {
      duplicateStudentIds.push({
        studentId: sid,
        count: list.length,
        users: list.map((u) => ({ id: String(u._id), login: u.githubLogin, folder: u.folder })),
      });
    }
  }

  const hasConflicts =
    invalidGithubIds.length > 0 ||
    duplicateGithubIds.length > 0 ||
    duplicateFolders.length > 0 ||
    duplicateStudentIds.length > 0;

  return {
    totalUsers: users.length,
    hasConflicts,
    summary: {
      invalidGithubIdsCount: invalidGithubIds.length,
      duplicateGithubIdsCount: duplicateGithubIds.length,
      duplicateFoldersCount: duplicateFolders.length,
      duplicateStudentIdsCount: duplicateStudentIds.length,
      unmappedApprovedStudentsCount: unmappedApprovedStudents.length,
    },
    conflicts: {
      invalidGithubIds,
      duplicateGithubIds,
      duplicateFolders,
      duplicateStudentIds,
    },
    unmappedApprovedStudents,
  };
}

/**
 * Reconcile identities safely.
 * In dryRun mode (default), only reports what would be changed.
 * In apply mode, allocates missing studentId and folders ONLY for approved students
 * that do not have conflicts. Conflicting records are never modified automatically.
 */
export async function reconcileStudentIdentities({ folderRoot = "students/", dryRun = true } = {}) {
  const diagnosis = await detectIdentityConflicts();
  const actions = [];

  if (diagnosis.hasConflicts) {
    actions.push({
      type: "WARNING",
      message: "Conflicts detected in database. Automatic resolution skipped for conflicting records to avoid data loss.",
    });
  }

  // Find approved students missing identifiers who are NOT part of any conflict
  const conflictingUserIds = new Set();
  for (const c of diagnosis.conflicts.duplicateGithubIds) {
    c.users.forEach((u) => conflictingUserIds.add(u.id));
  }
  for (const c of diagnosis.conflicts.duplicateFolders) {
    c.users.forEach((u) => conflictingUserIds.add(u.id));
  }
  for (const c of diagnosis.conflicts.duplicateStudentIds) {
    c.users.forEach((u) => conflictingUserIds.add(u.id));
  }
  for (const c of diagnosis.conflicts.invalidGithubIds) {
    conflictingUserIds.add(c.userId);
  }

  let allocated = 0;
  for (const item of diagnosis.unmappedApprovedStudents) {
    if (conflictingUserIds.has(item.userId)) {
      actions.push({
        type: "SKIPPED_DUE_TO_CONFLICT",
        userId: item.userId,
        githubLogin: item.githubLogin,
        reason: "User is involved in an identity conflict; manual resolution required",
      });
      continue;
    }

    if (dryRun) {
      actions.push({
        type: "WOULD_ALLOCATE",
        userId: item.userId,
        githubLogin: item.githubLogin,
        message: "Would allocate next sequential studentId and folder",
      });
    } else {
      const user = await User.findById(item.userId);
      if (user && user.accountStatus === "approved") {
        if (!user.studentId) {
          const next = await nextStudentId(folderRoot);
          user.studentId = next.studentId;
          if (!user.folder) user.folder = next.folder;
        } else if (!user.folder) {
          user.folder = `${folderRoot.endsWith("/") ? folderRoot : `${folderRoot}/`}${user.studentId}`;
        }
        await user.save();
        allocated += 1;
        actions.push({
          type: "ALLOCATED",
          userId: item.userId,
          studentId: user.studentId,
          folder: user.folder,
        });
      }
    }
  }

  // Audit quarantined / unresolved submissions
  const unresolvedSubmissionsCount = await Submission.countDocuments({ student: null });

  return {
    dryRun,
    diagnosis,
    actions,
    allocatedCount: allocated,
    unresolvedSubmissionsCount,
  };
}
