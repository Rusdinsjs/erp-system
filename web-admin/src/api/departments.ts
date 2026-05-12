import { api } from './http';
import type { Department, DepartmentTreeNode, CreateDepartmentRequest, UpdateDepartmentRequest } from '../types';

export type { Department, DepartmentTreeNode, CreateDepartmentRequest, UpdateDepartmentRequest };

export const departmentApi = {
    list: async () => {
        const response = await api.get<Department[]>('/departments');
        return response.data;
    },
    tree: async () => {
        const response = await api.get<DepartmentTreeNode[]>('/departments/tree');
        return response.data;
    },
    get: async (id: string) => {
        const response = await api.get<Department>(`/departments/${id}`);
        return response.data;
    },
    create: async (data: CreateDepartmentRequest) => {
        const response = await api.post<Department>('/departments', data);
        return response.data;
    },
    update: async (id: string, data: UpdateDepartmentRequest) => {
        const response = await api.put<Department>(`/departments/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/departments/${id}`);
    }
};

