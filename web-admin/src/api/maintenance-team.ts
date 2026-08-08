import { api } from './http';

export interface MaintenanceTeamMember {
    id: string;
    team_id: string;
    user_id?: string;
    employee_id?: string;
    member_name: string;
    role_in_team: string;
    is_active: boolean;
    created_at: string;
}

export interface MaintenanceTeam {
    id: string;
    team_code: String;
    team_name: string;
    company_id?: string;
    company_name?: string;
    manager_id?: string;
    manager_name?: string;
    status: 'ACTIVE' | 'INACTIVE';
    description?: string;
    created_at: string;
    updated_at: string;
    members: MaintenanceTeamMember[];
    total_members: number;
}

export interface CreateTeamMemberPayload {
    user_id?: string;
    employee_id?: string;
    member_name: string;
    role_in_team: string;
}

export interface CreateMaintenanceTeamPayload {
    team_code: string;
    team_name: string;
    company_id?: string;
    manager_id?: string;
    manager_name?: string;
    description?: string;
    members: CreateTeamMemberPayload[];
}

export interface UpdateMaintenanceTeamPayload {
    team_code?: string;
    team_name?: string;
    company_id?: string;
    manager_id?: string;
    manager_name?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    description?: string;
    members?: CreateTeamMemberPayload[];
}

export interface MaintenanceTeamQueryParams {
    search?: string;
    status?: string;
    company_id?: string;
    page?: number;
    per_page?: number;
}

export const maintenanceTeamApi = {
    list: async (params?: MaintenanceTeamQueryParams) => {
        const response = await api.get('/maintenance-teams', { params });
        return response.data;
    },

    get: async (id: string): Promise<MaintenanceTeam> => {
        const response = await api.get(`/maintenance-teams/${id}`);
        return response.data;
    },

    create: async (data: CreateMaintenanceTeamPayload): Promise<MaintenanceTeam> => {
        const response = await api.post('/maintenance-teams', data);
        return response.data;
    },

    update: async (id: string, data: UpdateMaintenanceTeamPayload): Promise<MaintenanceTeam> => {
        const response = await api.put(`/maintenance-teams/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/maintenance-teams/${id}`);
    },

    addMember: async (teamId: string, member: CreateTeamMemberPayload): Promise<MaintenanceTeamMember> => {
        const response = await api.post(`/maintenance-teams/${teamId}/members`, member);
        return response.data;
    },

    removeMember: async (teamId: string, memberId: string): Promise<void> => {
        await api.delete(`/maintenance-teams/${teamId}/members/${memberId}`);
    },
};
