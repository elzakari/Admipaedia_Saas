import { api } from "@/lib/api";

const adminService = {
  createAnnouncement: async (data: {
    title: string;
    content: string;
    target_roles: string;
    send_notification: boolean;
    send_email: boolean;
  }) => {
    try {
      const response = await api.post('/announcements', data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

function handleApiError(error: unknown) {
  console.error('API Error:', error);
  if (error instanceof Error) {
    throw error;
  } else {
    throw new Error('An unknown error occurred');
  }
}

export { adminService };
export default adminService;


