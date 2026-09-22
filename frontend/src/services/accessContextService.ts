import api from '@/lib/api';

export interface AccessContextData {
  tenant_id: string | null;
  roles: string[];
  permissions: string[];
}

interface AccessContextEnvelope {
  success: boolean;
  data?: AccessContextData;
  message?: string;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

const accessContextService = {
  async getCurrent(): Promise<AccessContextData> {
    const response = await api.get<AccessContextEnvelope>(
      '/access-context'
    );

    const envelope = response.data;

    if (!envelope?.success || !envelope.data) {
      throw new Error(
        envelope?.message || 'Failed to load access context'
      );
    }

    return {
      tenant_id:
        typeof envelope.data.tenant_id === 'string'
          ? envelope.data.tenant_id
          : null,
      roles: normalizeStringList(envelope.data.roles),
      permissions: normalizeStringList(
        envelope.data.permissions
      ),
    };
  },
};

export default accessContextService;
