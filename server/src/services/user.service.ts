import { supabaseAdmin } from "../config/supabaseClient";
import { prisma } from "../lib/prisma";
import { CreateUserFromAuthDTO } from "../types/user.types";
import { logger } from "../utils/logger";

export const UserService = {
  async findByFirebaseUid(firebaseUid: string) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("firebase_uid", firebaseUid)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async findByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async createFromAuth(dto: CreateUserFromAuthDTO) {
    logger.info("createFromAuth: Starting to sync user", dto);

    const now = new Date().toISOString();

    try {
      // A single upsert keeps auth sync idempotent when several requests hit
      // the backend immediately after Firebase signs a user in.
      const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
        INSERT INTO users (
          firebase_uid,
          email,
          display_name,
          photo_url,
          terms_accepted,
          terms_accepted_at,
          last_login,
          created_at,
          updated_at
        )
        VALUES (
          ${dto.firebase_uid},
          ${dto.email},
          ${dto.display_name ?? null},
          ${dto.photo_url ?? null},
          ${false},
          ${null},
          ${now}::timestamp,
          ${now}::timestamp,
          ${now}::timestamp
        )
        ON CONFLICT (firebase_uid)
        DO UPDATE SET
          email = EXCLUDED.email,
          display_name = COALESCE(users.display_name, EXCLUDED.display_name),
          photo_url = COALESCE(users.photo_url, EXCLUDED.photo_url),
          last_login = EXCLUDED.last_login,
          updated_at = EXCLUDED.updated_at
        RETURNING *`;

      const data = rows[0];

      logger.info("createFromAuth: User synced successfully", data);
      return data;
    } catch (error) {
      logger.error("createFromAuth: Unexpected error", { error });
      throw error;
    }
  },

  async create(userData: {
    firebase_uid: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    photo_url?: string;
    company_id?: string;
    terms_accepted: boolean;
    terms_accepted_at: Date;
  }) {
    try {
      logger.info("create: Starting to insert user", userData);

      const { data, error } = await supabaseAdmin
        .from("users")
        .insert({
          firebase_uid: userData.firebase_uid,
          email: userData.email,
          display_name: userData.display_name ?? null,
          photo_url: userData.photo_url ?? null,
          first_name: userData.first_name ?? null,
          last_name: userData.last_name ?? null,
          company_id: userData.company_id ?? null,
          terms_accepted: userData.terms_accepted,
          terms_accepted_at: userData.terms_accepted_at,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error("create: Error inserting user into Supabase", error);
        throw error;
      }

      logger.info(
        "create: User inserted successfully",
        data.id,
        data.display_name,
        data.email,
        data.firebase_uid,
      );
      return data;
    } catch (error) {
      logger.error("create: Unexpected error", { error });
      throw error;
    }
  },

  async completeSignupProfile(userData: {
    firebase_uid: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
    terms_accepted: boolean;
    terms_accepted_at: Date;
  }) {
    logger.info("completeSignupProfile: start", {
      firebase_uid: userData.firebase_uid,
      email: userData.email,
    });

    const now = new Date().toISOString();

    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      INSERT INTO users (
        firebase_uid,
        email,
        first_name,
        last_name,
        display_name,
        profile_complete,
        terms_accepted,
        terms_accepted_at,
        last_login,
        created_at,
        updated_at
      )
      VALUES (
        ${userData.firebase_uid},
        ${userData.email},
        ${userData.first_name},
        ${userData.last_name},
        ${userData.display_name},
        ${true},
        ${userData.terms_accepted},
        ${userData.terms_accepted_at.toISOString()}::timestamp,
        ${now}::timestamp,
        ${now}::timestamp,
        ${now}::timestamp
      )
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        display_name = EXCLUDED.display_name,
        profile_complete = EXCLUDED.profile_complete,
        terms_accepted = EXCLUDED.terms_accepted,
        terms_accepted_at = EXCLUDED.terms_accepted_at,
        last_login = EXCLUDED.last_login,
        updated_at = EXCLUDED.updated_at
      RETURNING *`;

    const user = rows[0];

    logger.info("completeSignupProfile: success", {
      firebase_uid: userData.firebase_uid,
      userId: user?.id,
    });

    return user;
  },

  async updateByFirebaseUid(
    firebaseUid: string,
    updates: Partial<{
      first_name: string;
      last_name: string;
      display_name: string;
      photo_url: string;
      profile_complete?: boolean;
      terms_accepted?: boolean;
      terms_accepted_at?: string;
    }>,
  ) {
    if (!firebaseUid) {
      logger.warn("UserService.updateByFirebaseUid: Missing firebaseUid", {
        firebaseUid,
        updates,
      });
      throw new Error("Firebase UID is required for updating user");
    }

    const display_name = updates.display_name
      ? updates.display_name
      : updates.first_name || updates.last_name
        ? `${updates.first_name ?? ""} ${updates.last_name ?? ""}`.trim()
        : undefined;

    logger.info("UserService.updateByFirebaseUid: start", {
      firebaseUid,
      updates,
      display_name,
    });

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        ...updates,
        ...(display_name ? { display_name } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("firebase_uid", firebaseUid)
      .select()
      .maybeSingle();

    logger.info("UserService.updateByFirebaseUid: success", {
      firebaseUid,
      updates,
    });

    if (error) throw error;
    return data;
  },

  async deleteByFirebaseUid(firebaseUid: string) {
    const { error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("firebase_uid", firebaseUid);

    if (error) throw error;
  },
};
