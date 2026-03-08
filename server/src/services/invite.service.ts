import { supabaseAdmin } from "../config/supabaseClient";
import { generateInviteToken } from "../utils/token";
import { logger } from "../utils/logger";

export const InviteService = {
  /**
   * Create a new company invite
   * @param companyId ID of the company
   * @param email Email to invite
   * @param createdBy User ID who is creating the invite
   */
  async createInvite(
    email: string,
    createdBy: string,
    role: string,
    access: string,
  ) {
    logger.info("InviteService.createInvite: start", {
      email,
      createdBy,
      role,
      access,
    });

    try {
      // check user Membership

      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("team_members")
        .select("company_id, access")
        .eq("user_id", createdBy)
        .maybeSingle();

      if (membershipError) {
        logger.error(`Failed to fetch membership ${membershipError}`);
        throw new Error("Failed to verify membership");
      }

      if (!membership) {
        logger.error(`User attempted invite without company ${createdBy}`);
        throw new Error("You are not part of any company");
      }

      const companyId = membership.company_id;

      // Permission check (only admins or superAdmins can invite)
      if (membership.access !== "admin" && membership.access !== "superAdmin") {
        logger.warn(
          "InviteService.createInvite:User attempted invite without permission",
          {
            createdBy,
          },
        );
        throw new Error(
          "InviteService.createInvite:You do not have permission to invite users",
        );
      }

      //Check if the email is already a team member
      const { data: existingMember, error: memberError } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("email", email)
        .maybeSingle();

      if (memberError) {
        logger.error(
          "InviteService.createInvite: error checking existing team member",
          { memberError },
        );
        throw new Error("Failed to check existing team members");
      }

      if (existingMember) {
        logger.warn("InviteService.createInvite: user is already a member", {
          email,
        });
        throw new Error("User is already a member of this company");
      }

      //Check if user exists and belongs to another company
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, company_id")
        .eq("email", email)
        .maybeSingle();

      if (userError) {
        logger.error("InviteService.createInvite: error fetching user", {
          userError,
        });
        throw new Error("Failed to fetch user by email");
      }

      if (user && user.company_id && user.company_id !== companyId) {
        logger.warn(
          "InviteService.createInvite: user belongs to another company",
          { email, userCompanyId: user.company_id },
        );
        throw new Error("User already belongs to another company");
      }

      // Check existing invite
      logger.info(
        "InviteService.createInvite: Checking if invite already exists",
      );
      const { data: existingInvite, error: existingInviteError } =
        await supabaseAdmin
          .from("company_invite")
          .select("*")
          .eq("email", email)
          .eq("company_id", companyId)
          // .eq("status", "PENDING")
          .maybeSingle();

      if (existingInviteError) {
        logger.error(
          "InviteService.createOrUpdateInvite: Failed to fetch existing invite",
          existingInviteError,
        );
        throw new Error("Failed to check existing invite");
      }

      ////////////////////////////////////////////////////////////////////////////////
      const now = new Date();

      const INVITE_EXPIRATION_DURATION = 24;

      const expiresAt = new Date(
        Date.now() + INVITE_EXPIRATION_DURATION * 60 * 60 * 1000,
      ).toISOString(); // 24h expiry

      //Generate invite token
      const token = generateInviteToken();
      ////////////////////////////////////////////////////////////////////////////////

      if (existingInvite) {
        logger.info("InviteService.createInvite: Invite already exists");

        logger.info("InviteService.createInvite: Checking Invite status");

        // Check invite status
        if (existingInvite.status === "CANCELLED") {
          logger.info(
            "InviteService.createInvite:Reactivating cancelled invite",
          );

          const { data: updatedInvite, error: updateError } =
            await supabaseAdmin
              .from("company_invite")
              .update({
                token,
                expires_at: expiresAt,
                status: "PENDING",
              })
              .eq("id", existingInvite.id)
              .select()
              .maybeSingle();

          if (updateError) throw new Error("Failed to reactivate invite");

          return updatedInvite;
        }

        // check if invite has expired
        logger.info(
          "InviteService.createInvite: Checking if invite has expired",
        );
        if (new Date(existingInvite.expires_at) > now) {
          // Invite is still valid, option to resend email
          logger.info(
            "InviteService.createInvite: Invite not expired, resending email",
            {
              email,
            },
          );

          return existingInvite;
        } else {
          // if invite expired, update token and expiry
          logger.info(
            "InviteService.createInvite: invite has expired, updating invite",
          );
          const { data: updatedInvite, error: updateError } =
            await supabaseAdmin
              .from("company_invite")
              .update({
                token: token,
                expires_at: expiresAt,
                status: "PENDING",
              })
              .eq("id", existingInvite.id)
              .select()
              .maybeSingle();

          if (updateError) throw new Error("Failed to update expired invite");
          logger.info("InviteService.createInvite: Expired invite updated", {
            inviteId: updatedInvite.id,
          });
          return updatedInvite;
        }
      }

      logger.info("InviteService.createInvite: inserting invite into database");

      // Insert invite into database
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("company_invite")
        .insert({
          company_id: companyId,
          email,
          role,
          access,
          token,
          status: "PENDING",
          expires_at: expiresAt,
          created_by: createdBy,
        })
        .select()
        .maybeSingle();

      if (inviteError) {
        if (inviteError.code === "23505") {
          logger.warn("Duplicate invite prevented by DB constraint", { email });

          throw new Error("An invite already exists for this email");
        }

        logger.error("InviteService.createInvite: failed to create invite", {
          inviteError,
        });
        throw new Error("Failed to create invite");
      }

      logger.info("InviteService.createInvite: invite created successfully", {
        inviteId: invite?.id,
        email,
      });

      return invite;
    } catch (err) {
      logger.error("InviteService.createInvite: unexpected error", {
        error: err,
      });
      throw err;
    }
  },

  async acceptInvite(token: string, userId: string, access: string) {
    logger.info("InviteService.acceptInvite: start", { token, userId });
    try {
      // fetch the invite
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("company_invite")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (inviteError) {
        logger.error(`Failed to fetch invite - ${inviteError}`);
        throw new Error("Failed to validate invite");
      }

      if (!invite) {
        logger.warn(`invalid invite token = ${token}`);
        throw new Error("Invalid invite");
      }
      if (invite.status !== "PENDING") {
        logger.warn(`Invite not pending - inviteId: ${invite.id}`);
        throw new Error("Invite is not valid");
      }

      if (new Date(invite.expires_at) < new Date()) {
        logger.warn(`Invite expired inviteId:${invite.id}`);
        throw new Error("Invite has expired");
      }

      // Fetch user
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, email")
        .eq("id", userId)
        .maybeSingle();

      if (userError || !user) {
        logger.error("Failed to fetch user", { userError });
        throw new Error("User not found");
      }

      if (user.email !== invite.email) {
        logger.warn("Email mismatch on invite accept", {
          inviteEmail: invite.email,
          userEmail: user.email,
        });
        throw new Error("Email mismatch");
      }

      // Check duplicate membership
      const { data: existingMember } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("company_id", invite.company_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMember) {
        logger.warn("User already member while accepting invite", {
          userId,
          companyId: invite.company_id,
        });
        throw new Error("User already a team member");
      }

      // Create team member
      const { error: memberError } = await supabaseAdmin
        .from("team_members")
        .insert({
          company_id: invite.company_id,
          user_id: userId,
          email: user.email,
          role: "member",
          access: access ?? "team_member",
          status: "active",
        });

      if (memberError) {
        logger.error("Failed creating team member", { memberError });
        throw new Error("Failed to join company");
      }

      //Update invite
      const { error: updateError } = await supabaseAdmin
        .from("company_invite")
        .update({
          status: "ACCEPTED",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      if (updateError) {
        logger.error("Failed updating invite status", { updateError });
        throw new Error("Failed to finalize invite");
      }

      logger.info("Invite accepted successfully", {
        inviteId: invite.id,
        userId,
        companyId: invite.company_id,
      });

      return { companyId: invite.company_id };
    } catch (error) {
      logger.error("InviteService.acceptInvite: unexpected error", { error });
      throw error;
    }
  },

  async getInvites(userId: string) {
    logger.info("InviteService.getInvites: start for company", {
      userId,
    });

    try {
      // verify membership
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("team_members")
        .select("company_id, access")
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError) {
        logger.error("InviteService.getInvites:Failed fetching membership", {
          membershipError,
        });
        throw new Error("InviteService.getInvites:Failed to verify membership");
      }

      if (!membership) {
        logger.warn("InviteService.getInvites:User not part of a company", {
          userId,
        });
        throw new Error(
          "InviteService.getInvites:You are not part of any company",
        );
      }

      const companyId = membership.company_id;

      const { data: invites, error: inviteError } = await supabaseAdmin
        .from("company_invite")
        .select(
          "company_id, email, status, accepted_at, created_by, role, access",
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (inviteError) {
        logger.error("InviteService.getInvites:Failed fetching invites", {
          inviteError,
        });
        throw new Error("InviteService.getInvites:Failed to fetch invites");
      }

      logger.info("InviteService.getInvites: success", {
        count: invites?.length,
      });

      return invites;
    } catch (error) {
      logger.error("InviteService.getInvites: unexpected error", { error });
      throw error;
    }
  },

  async cancelInvite(inviteId: string, userId: string) {
    logger.info("InviteService.cancelInvite: start", { inviteId, userId });

    try {
      // verify membership
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("team_members")
        .select("company_id, access")
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError || !membership) {
        logger.error("InviteService.cancelInvite:Failed verifying membership", {
          membershipError,
        });
        throw new Error(
          "InviteService.cancelInvite:Failed to verify membership",
        );
      }

      // membership check

      if (membership.access !== "admin" && membership.access !== "superAdmin") {
        logger.warn(
          "InviteService.cancelInvite:User attempted cancel invite without permission",
          {
            userId,
          },
        );
        throw new Error(
          "InviteService.cancelInvite:You do not have permission to cancel invites",
        );
      }

      const companyId = membership.company_id;

      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("company_invite")
        .select("*")
        .eq("id", inviteId)
        .eq("company_id", companyId)
        .maybeSingle();

      if (inviteError || !invite) {
        logger.error("InviteService.cancelInvite:Invite not found", {
          inviteError,
        });
        throw new Error("InviteService.cancelInvite:Invite not found");
      }

      if (invite.status !== "PENDING") {
        logger.warn(
          "InviteService.cancelInvite:Attempted cancel of non-pending invite",
          {
            inviteId,
            status: invite.status,
          },
        );
        throw new Error(
          "InviteService.cancelInvite:Invite cannot be cancelled",
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("company_invite")
        .update({
          status: "CANCELLED",
        })
        .eq("id", inviteId);

      if (updateError) {
        logger.error("InviteService.cancelInvite:Failed cancelling invite", {
          updateError,
        });
        throw new Error("InviteService.cancelInvite:Failed to cancel invite");
      }

      logger.info("InviteService.cancelInvite: Invite cancelled successfully", {
        inviteId,
      });

      return { success: true };
    } catch (error) {
      logger.error("InviteService.cancelInvite: unexpected error", { error });
      throw error;
    }
  },

  async cancelInvites(inviteIds: string[], userId: string) {
    logger.info("InviteService.cancelInvites: start", {
      inviteIds,
      userId,
    });

    try {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("team_members")
        .select("company_id, access")
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError || !membership) {
        logger.error(
          "InviteService.cancelInvites: Failed verifying membership",
          { membershipError },
        );
        throw new Error(
          "InviteService.cancelInvites:Failed to verify membership",
        );
      }

      if (membership.access !== "admin") {
        logger.warn(
          "InviteService.cancelInvites:User attempted bulk cancel without permission",
          {
            userId,
          },
        );
        throw new Error(
          "InviteService.cancelInvites:You do not have permission to cancel invites",
        );
      }

      const companyId = membership.company_id;

      const { error: updateError } = await supabaseAdmin
        .from("company_invite")
        .update({ status: "CANCELLED" })
        .in("id", inviteIds)
        .eq("company_id", companyId);

      if (updateError) {
        logger.error(
          "InviteService.cancelInvites:Failed bulk cancelling invites",
          { updateError },
        );
        throw new Error("InviteService.cancelInvites:Failed to cancel invites");
      }

      logger.info(
        "InviteService.cancelInvites:Bulk invite cancellation success",
        {
          count: inviteIds.length,
        },
      );

      return { success: true, cancelled: inviteIds.length };
    } catch (error) {
      logger.error("InviteService.cancelInvites: unexpected error", { error });
      throw error;
    }
  },
};
