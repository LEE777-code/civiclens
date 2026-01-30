import { supabase } from '@/lib/supabase';

export interface Report {
    id: string;
    title: string;
    description: string;
    category: string;
    status: 'pending' | 'resolved' | 'rejected';
    severity: 'low' | 'medium' | 'high';
    location_name: string;
    latitude?: number;
    longitude?: number;
    image_url?: string;
    user_id: string;
    upvotes: number;
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    resolved_image_url?: string;
    viewed_by_admin?: boolean;
    admin_viewed_at?: string;
    resolved_by?: string;
}

export interface ReportFilters {
    status?: string;
    severity?: string;
    category?: string;
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface ReportStats {
    total: number;
    pending: number;
    resolved: number;
    rejected: number;
    bySeverity: {
        high: number;
        medium: number;
        low: number;
    };
    byCategory: Record<string, number>;
}

export const reportService = {
    // Fetch all reports with optional filters
    async getReports(filters?: ReportFilters): Promise<Report[]> {
        let query = supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }

        if (filters?.severity && filters.severity !== 'all') {
            query = query.eq('severity', filters.severity);
        }

        if (filters?.category && filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }

        if (filters?.searchQuery) {
            query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
        }

        if (filters?.dateFrom) {
            query = query.gte('created_at', filters.dateFrom);
        }

        if (filters?.dateTo) {
            query = query.lte('created_at', filters.dateTo);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching reports:', error);
            throw error;
        }

        return data || [];
    },

    // Get single report by ID
    async getReportById(id: string): Promise<Report | null> {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching report:', error);
            return null;
        }

        return data;
    },

    // Resolve report function removed (reverted to client-side logic in component)

    // Update report status (Client-side resolution with Base64 support)
    async updateReportStatus(id: string, status: Report['status'], adminEmail?: string, resolvedImageUrl?: string): Promise<{ success: boolean; error?: any }> {
        const updateData: any = {
            status,
            updated_at: new Date().toISOString(),
        };

        if (status === 'resolved') {
            updateData.resolved_at = new Date().toISOString();
            if (adminEmail) {
                updateData.resolved_by = adminEmail;
            }
            if (resolvedImageUrl) {
                updateData.resolved_image_url = resolvedImageUrl;
            }
        }

        const { error } = await supabase
            .from('reports')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('Error updating report status:', error);
            return { success: false, error: error };
        }

        // Automatically notify user when admin resolves/rejects their report
        try {
            // Get report owner's user_id and title
            const { data: report } = await supabase
                .from('reports')
                .select('user_id, title')
                .eq('id', id)
                .single();

            if (report?.user_id) {
                await supabase.from('notifications').insert({
                    recipient_type: 'user',
                    recipient_clerk_id: report.user_id,
                    report_id: id,
                    type: 'issue_resolved',
                    title: status === 'resolved' ? 'Issue Resolved' : 'Issue Rejected',
                    body: status === 'resolved' ? 'Your report has been resolved' : 'Your report was rejected',
                    status: 'pending'
                });
            }
        } catch (notifError) {
            console.log('Admin resolved notification failed (non-critical)', notifError);
        }

        return { success: true };
    },

    // Mark report as viewed by admin
    async markAsViewedByAdmin(id: string): Promise<boolean> {
        // First check if already viewed
        const { data: existing } = await supabase
            .from('reports')
            .select('viewed_by_admin')
            .eq('id', id)
            .single();

        if (existing?.viewed_by_admin) {
            return true; // Already marked as viewed
        }

        const { error } = await supabase
            .from('reports')
            .update({
                viewed_by_admin: true,
                admin_viewed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('Error marking report as viewed:', error);
            return false;
        }

        // Automatically notify user when admin views their report
        try {
            // Get report owner's user_id and title
            const { data: report } = await supabase
                .from('reports')
                .select('user_id, title')
                .eq('id', id)
                .single();

            if (report?.user_id) {
                await supabase.from('notifications').insert({
                    recipient_type: 'user',
                    recipient_clerk_id: report.user_id,
                    report_id: id,
                    type: 'issue_viewed',
                    title: 'Admin Reviewing Your Report',
                    body: 'An admin is reviewing your report',
                    status: 'pending'
                });
            }
        } catch (notifError) {
            console.log('Admin viewed notification failed (non-critical)', notifError);
        }

        return true;
    },

    // Update report severity
    async updateReportSeverity(id: string, severity: Report['severity']): Promise<boolean> {
        const { error } = await supabase
            .from('reports')
            .update({ severity, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Error updating report severity:', error);
            return false;
        }

        return true;
    },

    // Get report statistics
    async getReportStats(): Promise<ReportStats | null> {
        const { data, error } = await supabase
            .from('reports')
            .select('status, severity, category, created_at');

        if (error) {
            console.error('Error fetching report stats:', error);
            return null;
        }

        const stats: ReportStats = {
            total: data.length,
            pending: data.filter(r => r.status === 'pending').length,
            resolved: data.filter(r => r.status === 'resolved').length,
            rejected: data.filter(r => r.status === 'rejected').length,
            bySeverity: {
                high: data.filter(r => r.severity === 'high').length,
                medium: data.filter(r => r.severity === 'medium').length,
                low: data.filter(r => r.severity === 'low').length,
            },
            byCategory: data.reduce((acc: Record<string, number>, report) => {
                acc[report.category] = (acc[report.category] || 0) + 1;
                return acc;
            }, {}),
        };

        return stats;
    },

    // Get recent reports
    async getRecentReports(limit: number = 10): Promise<Report[]> {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent reports:', error);
            return [];
        }

        return data || [];
    },

    // Delete report (admin only)
    async deleteReport(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting report:', error);
            return false;
        }

        return true;
    },
};
