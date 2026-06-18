"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import {
  Activity,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  ArrowUpRight,
  BarChart3,
  AlertCircle,
} from "lucide-react";

interface Prescription {
  id: string;
  patient_id: string;
  patient_name?: string;
  diagnosis: string;
  created_at: string;
  status: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  scheduled_date: string;
  start_time: string;
  status: string;
}

export default function DoctorAnalytics() {
  const { userId, loading: authLoading } = useUserRole();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPrescriptions, setTotalPrescriptions] = useState(0);
  const [monthAppointments, setMonthAppointments] = useState(0);
  const [activePrescriptions, setActivePrescriptions] = useState(0);
  const [prescriptionsByMonth, setPrescriptionsByMonth] = useState<
    { month: string; count: number }[]
  >([]);
  const [appointmentsByDay, setAppointmentsByDay] = useState<{ day: string; count: number }[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<Prescription[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!authLoading && !userId) {
      router.push("/login");
    }
  }, [authLoading, userId, router]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch doctor profile to get the doctor_profiles.id
      const { data: doctorProfile } = await supabase
        .from("doctor_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!doctorProfile) {
        throw new Error("Doctor profile not found");
      }
      const doctorProfileId = doctorProfile.id;

      const [patientsRes, prescriptionsRes, appointmentsRes] = await Promise.all([
        supabase
          .from("patient_profiles")
          .select("id", { count: "exact", head: true })
          .eq("created_by", doctorProfileId),
        supabase
          .from("prescriptions")
          .select("id, patient_id, diagnosis, created_at, status")
          .eq("doctor_id", doctorProfileId)
          .order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("id, patient_id, scheduled_date, start_time, status")
          .eq("doctor_id", doctorProfileId)
          .order("scheduled_date", { ascending: false }),
      ]);

      if (patientsRes.error) throw patientsRes.error;
      if (prescriptionsRes.error) throw prescriptionsRes.error;
      if (appointmentsRes.error) throw appointmentsRes.error;

      const allPrescriptions = (prescriptionsRes.data as Prescription[]) || [];
      const allAppointments = (appointmentsRes.data as Appointment[]) || [];

      setTotalPatients(patientsRes.count || 0);
      setTotalPrescriptions(allPrescriptions.length);
      setActivePrescriptions(allPrescriptions.filter((p) => p.status === "active").length);

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const monthAppts = allAppointments.filter((a) => {
        const d = new Date(a.scheduled_date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });
      setMonthAppointments(monthAppts.length);

      const last6Months: { month: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(thisYear, thisMonth - i, 1);
        const monthName = d.toLocaleString("default", { month: "short" });
        const count = allPrescriptions.filter((p) => {
          const pd = new Date(p.created_at);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        }).length;
        last6Months.push({ month: monthName, count });
      }
      setPrescriptionsByMonth(last6Months);

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayCounts = dayNames.map((day) => ({ day, count: 0 }));
      allAppointments.forEach((a) => {
        const d = new Date(a.scheduled_date);
        dayCounts[d.getDay()].count++;
      });
      setAppointmentsByDay(dayCounts);

      setRecentPrescriptions(allPrescriptions.slice(0, 10));
      setRecentAppointments(allAppointments.slice(0, 10));
    } catch {
      console.error("Failed to load analytics data");
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAnalytics();
    }
  }, [userId, fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-6 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Analytics</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const maxPrescriptionCount = Math.max(...prescriptionsByMonth.map((m) => m.count), 1);
  const maxAppointmentDayCount = Math.max(...appointmentsByDay.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your practice performance</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Activity className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Total Patients"
          value={totalPatients}
          color="bg-blue-500"
        />
        <MetricCard
          icon={<FileText className="h-5 w-5" />}
          label="Total Prescriptions"
          value={totalPrescriptions}
          color="bg-purple-500"
        />
        <MetricCard
          icon={<Calendar className="h-5 w-5" />}
          label="This Month's Appointments"
          value={monthAppointments}
          color="bg-amber-500"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Active Prescriptions"
          value={activePrescriptions}
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            <h2 className="font-semibold text-gray-900">Prescriptions by Month</h2>
          </div>
          <div className="space-y-3">
            {prescriptionsByMonth.map((item) => (
              <div key={item.month} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-8">{item.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.count / maxPrescriptionCount) * 100}%`,
                      minWidth: item.count > 0 ? "24px" : "0",
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-8 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold text-gray-900">Appointments by Day</h2>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {appointmentsByDay.map((item) => (
              <div key={item.day} className="flex flex-col items-center flex-1 gap-2">
                <span className="text-xs font-medium text-gray-600">{item.count}</span>
                <div
                  className="w-full bg-gray-100 rounded-t-lg relative"
                  style={{ height: "120px" }}
                >
                  <div
                    className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${(item.count / maxAppointmentDayCount) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">{item.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              <h2 className="font-semibold text-gray-900">Recent Prescriptions</h2>
            </div>
            <span className="text-xs text-gray-400">Last 10</span>
          </div>
          <div className="space-y-3">
            {recentPrescriptions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No prescriptions yet</p>
            ) : (
              recentPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {rx.diagnosis || "Prescription"}
                      </p>
                      <p className="text-xs text-gray-500">{rx.patient_name || "Patient"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        rx.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rx.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(rx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Recent Appointments</h2>
            </div>
            <span className="text-xs text-gray-400">Last 10</span>
          </div>
          <div className="space-y-3">
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No appointments yet</p>
            ) : (
              recentAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {appt.patient_name || "Patient"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(appt.scheduled_date).toLocaleDateString()}
                        {appt.start_time ? ` at ${appt.start_time.slice(0, 5)}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      appt.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : appt.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : appt.status === "confirmed"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {appt.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div
          className={`h-10 w-10 ${color} rounded-lg flex items-center justify-center text-white`}
        >
          {icon}
        </div>
        <ArrowUpRight className="h-4 w-4 text-gray-300" />
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
