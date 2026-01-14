import { api } from './client';

export interface Rental {
    id: string;
    rental_number: string;
    asset_name: string;
    client_name: string;
    status: string;
    start_date: string;
    end_date?: string;
}

export const rentalsApi = {
    listActive: async () => {
        const response = await api.get<Rental[]>('/rentals?status=rented_out');
        return response.data;
    }
};
