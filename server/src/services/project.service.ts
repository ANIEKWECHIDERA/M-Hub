import { supabaseAdmin } from "../config/supabaseClient";
import { CreateProjectDTO, UpdateProjectDTO } from "../types/types";

export const ProjectService = {
  async findAll(companyId: string) {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async findById(id: string, companyId: string) {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (error) throw error;
    return data;
  },

  async create(ProjectData: CreateProjectDTO) {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert(ProjectData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, companyId: string, ProjectData: UpdateProjectDTO) {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(ProjectData)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProjectById(id: string, companyId: string) {
    const { error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;
    return true;
  },
};
