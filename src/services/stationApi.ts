import { api } from './apiClient';
import { User } from '@/context/AuthContext';

export const stationApi = {
  getAll: async () => {
    const res = await api.get('/stations/');
    return res.data;
  }
};