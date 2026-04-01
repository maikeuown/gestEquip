import api from './client';

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  google: (idToken: string) => api.post('/auth/google', { idToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
};

// Equipment
export const equipmentApi = {
  list: (params?: any) => api.get('/equipment', { params }),
  get: (id: string) => api.get(`/equipment/${id}`),
  create: (data: any) => api.post('/equipment', data),
  update: (id: string, data: any) => api.put(`/equipment/${id}`, data),
  delete: (id: string) => api.delete(`/equipment/${id}`),
  getQr: (id: string) => api.get(`/equipment/${id}/qr`),
  stats: () => api.get('/equipment/stats'),
  exportCsv: () => api.get('/equipment/export/csv', { responseType: 'blob' }),
};

// Equipment Types
export const typesApi = {
  list: () => api.get('/equipment-types'),
  create: (data: any) => api.post('/equipment-types', data),
  update: (id: string, data: any) => api.put(`/equipment-types/${id}`, data),
  delete: (id: string) => api.delete(`/equipment-types/${id}`),
};

// Rooms
export const roomsApi = {
  list: () => api.get('/rooms'),
  get: (id: string) => api.get(`/rooms/${id}`),
  create: (data: any) => api.post('/rooms', data),
  update: (id: string, data: any) => api.put(`/rooms/${id}`, data),
  delete: (id: string) => api.delete(`/rooms/${id}`),
};

// Maintenance
export const maintenanceApi = {
  list: (params?: any) => api.get('/maintenance', { params }),
  get: (id: string) => api.get(`/maintenance/${id}`),
  create: (data: any) => api.post('/maintenance', data),
  update: (id: string, data: any) => api.put(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
  stats: () => api.get('/maintenance/stats'),
  addMessage: (id: string, content: string) => api.post(`/maintenance/${id}/messages`, { content }),
};

// Movements
export const movementsApi = {
  list: (params?: any) => api.get('/movements', { params }),
  get: (id: string) => api.get(`/movements/${id}`),
  create: (data: any) => api.post('/movements', data),
  updateStatus: (id: string, status: string, notes?: string) => api.put(`/movements/${id}/status`, { status, notes }),
};

// Requests
export const requestsApi = {
  list: (params?: any) => api.get('/requests', { params }),
  get: (id: string) => api.get(`/requests/${id}`),
  create: (data: any) => api.post('/requests', data),
  update: (id: string, data: any) => api.put(`/requests/${id}`, data),
  addMessage: (id: string, content: string) => api.post(`/requests/${id}/messages`, { content }),
};

// Users
export const usersApi = {
  list: (params?: any) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
};

// Institutions
export const institutionsApi = {
  list: () => api.get('/institutions'),
  get: (id: string) => api.get(`/institutions/${id}`),
  create: (data: any) => api.post('/institutions', data),
  update: (id: string, data: any) => api.put(`/institutions/${id}`, data),
  delete: (id: string) => api.delete(`/institutions/${id}`),
  stats: (id: string) => api.get(`/institutions/${id}/stats`),
};

// Notifications
export const notificationsApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Reports
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  byType: () => api.get('/reports/equipment-by-type'),
  byStatus: () => api.get('/reports/equipment-by-status'),
  byRoom: () => api.get('/reports/equipment-by-room'),
  trend: (months?: number) => api.get('/reports/maintenance-trend', { params: { months } }),
  activity: () => api.get('/reports/recent-activity'),
};

// Upload
export const uploadApi = {
  upload: (file: File, params?: { equipmentId?: string; ticketId?: string }) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, params });
  },
  delete: (id: string) => api.delete(`/upload/${id}`),
};

// Audit
export const auditApi = {
  list: (params?: any) => api.get('/audit', { params }),
};

// Schedules (Horários)
export const schedulesApi = {
  list: (params?: any) => api.get('/schedules', { params }),
  getByRoom: (roomId: string) => api.get(`/schedules/room/${roomId}`),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
};

// Favorite Rooms
export const favoriteRoomsApi = {
  list: () => api.get('/favorite-rooms'),
  toggle: (roomId: string) => api.post(`/favorite-rooms/${roomId}/toggle`),
  add: (roomId: string) => api.post('/favorite-rooms', { roomId }),
  remove: (roomId: string) => api.delete(`/favorite-rooms/${roomId}`),
};

// Assistance Requests (Pedidos de Assistência)
export const assistanceRequestsApi = {
  list: (params?: any) => api.get('/assistance-requests', { params }),
  get: (id: string) => api.get(`/assistance-requests/${id}`),
  create: (data: any) => api.post('/assistance-requests', data),
  update: (id: string, data: any) => api.put(`/assistance-requests/${id}`, data),
  getEquipmentByRoom: (roomId: string) => api.get(`/assistance-requests/room/${roomId}/equipment`),
};
