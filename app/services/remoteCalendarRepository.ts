import type {
  CalendarRepository,
  CreateCalendarInput,
  UpdateCalendarInput,
} from "../types/repository";
import type { CalendarSummary, SavedCalendar } from "../types/savedCalendar";

/**
 * Backend Row Type (Snake Case)
 */
interface ExamCalendarBackendRow {
  id: string;
  name: string;
  academic_year: string | null;
  titulacio: string | null;
  document_json: any;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Mappers
 */
function mapBackendToFrontend(row: ExamCalendarBackendRow): SavedCalendar {
  return {
    id: row.id,
    name: row.name,
    academicYear: row.academic_year ?? undefined,
    titulacio: row.titulacio ?? undefined,
    document: row.document_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? undefined,
    updatedBy: row.updated_by ?? undefined,
  };
}

function mapFrontendToBackend(input: CreateCalendarInput | UpdateCalendarInput): Partial<ExamCalendarBackendRow> {
  const data: any = {
    name: input.name,
    document_json: input.document,
  };
  
  if (input.academicYear !== undefined) data.academic_year = input.academicYear;
  if (input.titulacio !== undefined) data.titulacio = input.titulacio;
  
  return data;
}

/**
 * Refactored repository to use the Django backend via Proxy.
 */
export const remoteCalendarRepository: CalendarRepository = {
  async renameCalendar(id: string, newName: string): Promise<SavedCalendar> {
    const { API_BASE } = useAppConfig();
    const { $authFetch } = useNuxtApp();
    
    const response = await $authFetch<ExamCalendarBackendRow>(`${API_BASE}/calendars/${id}`, {
      method: "PATCH",
      body: { name: newName },
    });
    
    return mapBackendToFrontend(response);
  },
  
  async listCalendars(titulacio?: string): Promise<CalendarSummary[]> {
    const { API_BASE } = useAppConfig();
    const { $authFetch } = useNuxtApp();

    const response = await $authFetch<ExamCalendarBackendRow[]>(`${API_BASE}/calendars`, {
      query: titulacio ? { titulacio } : {},
    });

    return response.map(mapBackendToFrontend);
  },

  async getCalendar(id: string): Promise<SavedCalendar> {
    const { API_BASE } = useAppConfig();
    const { $authFetch } = useNuxtApp();

    const response = await $authFetch<ExamCalendarBackendRow>(`${API_BASE}/calendars/${id}`);
    
    return mapBackendToFrontend(response);
  },

  async createCalendar(input: CreateCalendarInput): Promise<SavedCalendar> {
    const { API_BASE } = useAppConfig();
    const { $authFetch } = useNuxtApp();

    const response = await $authFetch<ExamCalendarBackendRow>(`${API_BASE}/calendars`, {
      method: "POST",
      body: mapFrontendToBackend(input),
    });

    return mapBackendToFrontend(response);
  },

  async updateCalendar(input: UpdateCalendarInput): Promise<SavedCalendar> {
    const { API_BASE } = useAppConfig();
    const { $authFetch } = useNuxtApp();

    const response = await $authFetch<ExamCalendarBackendRow>(`${API_BASE}/calendars/${input.id}`, {
      method: "PATCH",
      body: mapFrontendToBackend(input),
    });

    return mapBackendToFrontend(response);
  },

  async deleteCalendar(id: string): Promise<void> {
    const { API_BASE } = useAppConfig();
    const { $authFetch } = useNuxtApp();

    await $authFetch(`${API_BASE}/calendars/${id}`, {
      method: "DELETE",
    });
  },

  async duplicateCalendar(id: string, newName: string): Promise<SavedCalendar> {
    const existing = await this.getCalendar(id);

    return this.createCalendar({
      name: newName,
      academicYear: existing.academicYear,
      titulacio: existing.titulacio,
      document: existing.document,
    });
  },
};
