import api from '../lib/api';

export interface EducationalSystemTemplate {
    system_key: string;
    name: string;
    country_code: string;
    description?: string;
}

export interface TenantConfig {
    id: string;
    name: string;
    template_key: string;
    config: any;
}

const educationalSystemService = {
    listTemplates: async (countryCode?: string): Promise<EducationalSystemTemplate[]> => {
        try {
            const params = countryCode ? { country_code: countryCode } : {};
            const response = await api.get('/platform/educational-systems', { params });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching educational system templates:', error);
            throw error;
        }
    },

    getTenantConfig: async (): Promise<TenantConfig> => {
        try {
            const response = await api.get('/tenant/educational-system');
            return response.data.data;
        } catch (error) {
            console.error('Error fetching tenant educational system config:', error);
            throw error;
        }
    },

    applyTemplate: async (templateKey: string): Promise<{ id: string; name: string }> => {
        try {
            const response = await api.post('/tenant/educational-system/apply', { template_key: templateKey });
            return response.data.data;
        } catch (error) {
            console.error(`Error applying educational system template ${templateKey}:`, error);
            throw error;
        }
    }
};

export default educationalSystemService;
