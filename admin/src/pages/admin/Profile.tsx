import { useEffect, useState } from "react";
import { User, Mail, MapPin, Calendar, Award, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { issueService, IssueStats } from "@/services/issueService";
import { useUser } from "@clerk/clerk-react";
import { Issue } from "@/lib/supabase";

const COLORS = ["#0D9488", "#10B981", "#F59E0B", "#EF4444"];

export default function Profile() {
  const { admin } = useAuth();
  const { user } = useUser();
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, issuesData] = await Promise.all([
          issueService.getIssueStats(),
          issueService.getIssues(),
        ]);
        setStats(statsData);
        setIssues(issuesData);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Generate performance data from issues
  const performanceData = (issues || []).reduce((acc: { month: string; resolved: number }[], issue: Issue) => {
    const month = new Date(issue.created_at).toLocaleDateString("en-US", { month: "short" });
    const existing = acc.find((item) => item.month === month);

    if (existing) {
      if (issue.status === "resolved") {
        existing.resolved = (existing.resolved || 0) + 1;
      }
    } else {
      acc.push({
        month,
        resolved: issue.status === "resolved" ? 1 : 0,
      });
    }

    return acc;
  }, []).slice(-6);

  // Status distribution for pie chart
  const statusData = [
    { name: "Pending", value: stats?.pending || 0 },
    { name: "In Progress", value: stats?.inProgress || 0 },
    { name: "Resolved", value: stats?.resolved || 0 },
    { name: "Rejected", value: stats?.rejected || 0 },
  ].filter(item => item.value > 0);

  const roleLabels: Record<string, string> = {
    state: "State Admin",
    district: "District Admin",
    local: "Local Body Admin",
    super_admin: "Super Admin",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and view your performance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-3xl font-bold">
              RK
            </div>
            <h2 className="mt-4 text-xl font-semibold text-foreground">{admin?.name || user?.fullName || "Admin"}</h2>
            <span className="mt-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
              {admin?.role ? roleLabels[admin.role] : "Admin"}
            </span>
            <p className="mt-2 text-sm text-muted-foreground">{admin?.state || "N/A"}</p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{admin?.email || user?.primaryEmailAddress?.emailAddress || "N/A"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{admin?.state || "N/A"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                Joined {admin?.created_at ? new Date(admin.created_at).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                }) : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                {stats?.resolved || 0} issues resolved
              </span>
            </div>
          </div>

          <Button className="mt-6 w-full" variant="outline">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        {/* Performance Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Monthly Resolution Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Issue Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Account Settings */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-foreground">Account Settings</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={admin?.name || user?.fullName || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue={admin?.email || user?.primaryEmailAddress?.emailAddress || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" defaultValue={admin?.state || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input id="district" defaultValue={admin?.district || ""} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
