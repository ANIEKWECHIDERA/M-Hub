import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../config/supabaseClient";
import { RequestCacheService } from "./requestCache.service";
import { generateInviteToken } from "../utils/token";
import { logger } from "../utils/logger";
import { ChatService } from "./chat.service";

async function getActiveMembershipContext(userId: string) {
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    throw new Error("Failed to load user workspace");
  }

  if (user?.company_id) {
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("team_members")
      .select("company_id, access, role")
      .eq("user_id", userId)
      .eq("company_id", user.company_id)
      .maybeSingle();

    if (membershipError) {
      throw new Error("Failed to verify membership");
    }

    if (membership) {
      return membership;
    }
  }

  const { data: memberships, error } = await supabaseAdmin
    .from("team_members")
    .select("company_id, access, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error("Failed to verify membership");
  }

  return memberships?.[0] ?? null;
}

export const InviteService = {
  async createInvite(
    email: string,
    createdBy: string,
    role: string,
    access: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();

    logger.info("InviteService.createInvite:start", {
      normalizedEmail,
      createdBy,
      role,
      access,
    });

    const membership = await getActiveMembershipContext(createdBy);

    if (!membership) {
      throw new Error("You are not part of any company");
    }

    if (membership.access !== "admin" && membership.access !== "superAdmin") {
      throw new Error("You do not have permission to invite users");
    }

    const companyId = membership.company_id;

    const { data: existingMember, error: memberError } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("company_id", companyId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (memberError) {
      throw new Error("Failed to check existing team members");
    }

    if (existingMember) {
      throw new Error("User is already a member of this workspace");
    }

    const { token, hashedToken } = generateInviteToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: existingInvite, error: inviteLookupError } = await supabaseAdmin
      .from("company_invite")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("company_id", companyId)
      .maybeSingle();

    if (inviteLookupError) {
      throw new Error("Failed to check existing invite");
    }

    if (existingInvite) {
      const { data: updatedInvite, error: updateError } = await supabaseAdmin
        .from("company_invite")
        .update({
          email: normalizedEmail,
          role: role.trim(),
          access: access.trim(),
          token_hash: hashedToken,
          expires_at: expiresAt,
          status: "PENDING",
          accepted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingInvite.id)
        .select()
        .maybeSingle();

      if (updateError || !updatedInvite) {
        throw new Error("Failed to refresh invite");
      }

      return { invite: updatedInvite, token };
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("company_invite")
      .insert({
        company_id: companyId,
        email: normalizedEmail,
        role: role.trim(),
        access: access.trim(),
        token_hash: hashedToken,
        status: "PENDING",
        expires_at: expiresAt,
        created_by: createdBy,
      })
      .select()
      .maybeSingle();

    if (inviteError || !invite) {
      throw new Error("Failed to create invite");
    }

    return { invite, token };
  },

  async acceptInvite(token: string, userId: string) {
    logger.info("InviteService.acceptInvite:start", { userId });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    if (!tokenHash) {
      throw new Error("Invalid invite token");
    }

    const result = await prisma.$transaction(async (tx) => {
      const invites = await tx.$queryRaw<Array<Record<string, any>>>`
        SELECT *
        FROM company_invite
        WHERE token_hash = ${tokenHash}
        LIMIT 1
        FOR UPDATE`;

      const invite = invites[0];

      if (!invite) {
        throw new Error("Invalid invite");
      }

      if (invite.status !== "PENDING") {
        throw new Error("Invite is not valid");
      }

      if (new Date(invite.expires_at) < new Date()) {
        throw new Error("Invite has expired");
      }

      const users = await tx.$queryRaw<Array<Record<string, any>>>`
        SELECT id, email, company_id, has_company
        FROM users
        WHERE id = ${userId}::uuid
        LIMIT 1
        FOR UPDATE`;

      const user = users[0];

      if (!user) {
        throw new Error("User not found");
      }

      if (String(user.email).toLowerCase() !== String(invite.email).toLowerCase()) {
        throw new Error("Email mismatch");
      }

      const memberships = await tx.$queryRaw<Array<Record<string, any>>>`
        SELECT id, user_id
        FROM team_members
        WHERE company_id = ${invite.company_id}::uuid
          AND email = ${invite.email}
        LIMIT 1
        FOR UPDATE`;

      const existingMembership = memberships[0];

      if (existingMembership?.user_id && existingMembership.user_id !== userId) {
        throw new Error("This invite is already linked to another user");
      }

      if (existingMembership) {
        await tx.$executeRaw`
          UPDATE team_members
          SET user_id = ${userId}::uuid,
              role = ${invite.role},
              access = ${invite.access},
              status = ${"active"},
              updated_at = NOW()
          WHERE id = ${existingMembership.id}::uuid`;
      } else {
        await tx.$executeRaw`
          INSERT INTO team_members (user_id, company_id, email, role, access, status)
          VALUES (
            ${userId}::uuid,
            ${invite.company_id}::uuid,
            ${invite.email},
            ${invite.role},
            ${invite.access},
            ${"active"}
          )`;
      }

      await tx.$executeRaw`
        UPDATE company_invite
        SET status = ${"ACCEPTED"},
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = ${invite.id}::uuid`;

      await tx.$executeRaw`
        UPDATE users
        SET has_company = ${true},
            company_id = COALESCE(company_id, ${invite.company_id}::uuid),
            updated_at = NOW()
        WHERE id = ${userId}::uuid`;

      return {
        companyId: invite.company_id,
        role: invite.role,
        joinedAt: new Date().toISOString(),
      };
    });

    RequestCacheService.invalidateUserContext({ userId });
    await ChatService.ensureGeneralConversation(result.companyId);

    logger.info("InviteService.acceptInvite:success", result);
    return result;
  },

  async declineInvite(token: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const { data: invite, error: lookupError } = await supabaseAdmin
      .from("company_invite")
      .select("id, status")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (lookupError) {
      throw new Error("Failed to load invite");
    }

    if (!invite || invite.status !== "PENDING") {
      throw new Error("Invite is not valid");
    }

    const { error } = await supabaseAdmin
      .from("company_invite")
      .update({
        status: "DECLINED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (error) {
      throw new Error("Failed to decline invite");
    }

    return { success: true };
  },

  async getInvites(userId: string) {
    const membership = await getActiveMembershipContext(userId);

    if (!membership) {
      throw new Error("You are not part of any company");
    }

    const { data: invites, error } = await supabaseAdmin
      .from("company_invite")
      .select(
        "id, company_id, email, status, accepted_at, created_by, role, access, expires_at, created_at",
      )
      .eq("company_id", membership.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch invites");
    }

    return invites ?? [];
  },

  async cancelInvite(inviteId: string, userId: string) {
    const membership = await getActiveMembershipContext(userId);

    if (!membership) {
      throw new Error("Failed to verify membership");
    }

    if (membership.access !== "admin" && membership.access !== "superAdmin") {
      throw new Error("You do not have permission to cancel invites");
    }

    const { error } = await supabaseAdmin
      .from("company_invite")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", inviteId)
      .eq("company_id", membership.company_id)
      .eq("status", "PENDING");

    if (error) {
      throw new Error("Failed to cancel invite");
    }

    return { success: true };
  },

  async cancelInvites(inviteIds: string[], userId: string) {
    const membership = await getActiveMembershipContext(userId);

    if (!membership) {
      throw new Error("Failed to verify membership");
    }

    if (membership.access !== "admin" && membership.access !== "superAdmin") {
      throw new Error("You do not have permission to cancel invites");
    }

    const { error } = await supabaseAdmin
      .from("company_invite")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .in("id", inviteIds)
      .eq("company_id", membership.company_id)
      .eq("status", "PENDING");

    if (error) {
      throw new Error("Failed to cancel invites");
    }

    return { success: true, cancelled: inviteIds.length };
  },
};
