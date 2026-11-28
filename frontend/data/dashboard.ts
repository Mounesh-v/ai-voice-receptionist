export type AppointmentRange = "7d" | "30d" | "90d";

export type AppointmentStatus = "Completed" | "Pending" | "Cancelled";

export function isAppointmentRange(value: string): value is AppointmentRange {
  return value === "7d" || value === "30d" || value === "90d";
}

export function isAppointmentStatus(
  value: string,
): value is AppointmentStatus {
  return value === "Completed" || value === "Pending" || value === "Cancelled";
}

export type AppointmentRecord = {
  id: string;
  patient: string;
  doctor: string;
  department: string;
  date: string;
  time: string;
  status: AppointmentStatus;
};

export const appointmentTrendData: Record<
  AppointmentRange,
  { label: string; completed: number; pending: number; cancelled: number }[]
> = {
  "7d": [
    { label: "Mon", completed: 25, pending: 8, cancelled: 3 },
    { label: "Tue", completed: 31, pending: 7, cancelled: 4 },
    { label: "Wed", completed: 28, pending: 11, cancelled: 2 },
    { label: "Thu", completed: 36, pending: 9, cancelled: 5 },
    { label: "Fri", completed: 33, pending: 12, cancelled: 3 },
    { label: "Sat", completed: 22, pending: 6, cancelled: 2 },
    { label: "Sun", completed: 18, pending: 5, cancelled: 1 },
  ],
  "30d": [
    { label: "Oct 19", completed: 164, pending: 42, cancelled: 18 },
    { label: "Oct 26", completed: 181, pending: 49, cancelled: 21 },
    { label: "Nov 2", completed: 173, pending: 54, cancelled: 17 },
    { label: "Nov 9", completed: 196, pending: 48, cancelled: 23 },
    { label: "Nov 15", completed: 188, pending: 51, cancelled: 19 },
  ],
  "90d": [
    { label: "Sep 1", completed: 672, pending: 174, cancelled: 76 },
    { label: "Sep 15", completed: 704, pending: 189, cancelled: 83 },
    { label: "Oct 1", completed: 691, pending: 201, cancelled: 78 },
    { label: "Oct 15", completed: 738, pending: 194, cancelled: 86 },
    { label: "Nov 1", completed: 752, pending: 208, cancelled: 81 },
    { label: "Nov 15", completed: 781, pending: 197, cancelled: 88 },
  ],
};

export const appointmentStatusData: Record<
  AppointmentRange,
  { name: AppointmentStatus; value: number; color: string }[]
> = {
  "7d": [
    { name: "Completed", value: 193, color: "#087E8B" },
    { name: "Pending", value: 58, color: "#E6A23C" },
    { name: "Cancelled", value: 20, color: "#C65B62" },
  ],
  "30d": [
    { name: "Completed", value: 902, color: "#087E8B" },
    { name: "Pending", value: 244, color: "#E6A23C" },
    { name: "Cancelled", value: 98, color: "#C65B62" },
  ],
  "90d": [
    { name: "Completed", value: 4338, color: "#087E8B" },
    { name: "Pending", value: 1163, color: "#E6A23C" },
    { name: "Cancelled", value: 492, color: "#C65B62" },
  ],
};

export const statisticCards = [
  {
    key: "patients",
    label: "Total Patients",
    value: "2,450",
    comparison: "+5.2%",
    comparisonDetail: "vs. last month",
    tone: "positive",
  },
  {
    key: "doctors",
    label: "Total Doctors",
    value: "48",
    comparison: "+2",
    comparisonDetail: "new this month",
    tone: "positive",
  },
  {
    key: "appointments",
    label: "Today's Appointments",
    value: "126",
    comparison: "+8.4%",
    comparisonDetail: "vs. daily average",
    tone: "positive",
  },
  {
    key: "pending",
    label: "Pending Appointments",
    value: "18",
    comparison: "Needs attention",
    comparisonDetail: "awaiting confirmation",
    tone: "warning",
  },
] as const;

export const recentAppointments: AppointmentRecord[] = [
  {
    id: "APT-2048",
    patient: "Ava Patel",
    doctor: "Dr. James Wilson",
    department: "Cardiology",
    date: "Nov 16, 2026",
    time: "09:00 AM",
    status: "Pending",
  },
  {
    id: "APT-2047",
    patient: "Noah Williams",
    doctor: "Dr. Emma Chen",
    department: "Neurology",
    date: "Nov 16, 2026",
    time: "09:30 AM",
    status: "Completed",
  },
  {
    id: "APT-2046",
    patient: "Mia Thompson",
    doctor: "Dr. Omar Hassan",
    department: "Pediatrics",
    date: "Nov 17, 2026",
    time: "10:00 AM",
    status: "Cancelled",
  },
  {
    id: "APT-2045",
    patient: "Ethan Brooks",
    doctor: "Dr. Emma Chen",
    department: "Neurology",
    date: "Nov 17, 2026",
    time: "11:15 AM",
    status: "Pending",
  },
  {
    id: "APT-2044",
    patient: "Isabella Garcia",
    doctor: "Dr. Priya Shah",
    department: "Cardiology",
    date: "Nov 18, 2026",
    time: "01:30 PM",
    status: "Completed",
  },
  {
    id: "APT-2043",
    patient: "Lucas Martin",
    doctor: "Dr. Omar Hassan",
    department: "Pediatrics",
    date: "Nov 18, 2026",
    time: "02:00 PM",
    status: "Pending",
  },
];

export const doctorAvailability = [
  {
    name: "Dr. James Wilson",
    initials: "JW",
    specialty: "Cardiology",
    status: "Available",
    time: "Until 12:30 PM",
  },
  {
    name: "Dr. Emma Chen",
    initials: "EC",
    specialty: "Neurology",
    status: "In consultation",
    time: "Next slot 11:15 AM",
  },
  {
    name: "Dr. Priya Shah",
    initials: "PS",
    specialty: "Cardiology",
    status: "Available",
    time: "Until 3:00 PM",
  },
  {
    name: "Dr. Omar Hassan",
    initials: "OH",
    specialty: "Pediatrics",
    status: "Off duty",
    time: "Available tomorrow",
  },
] as const;

export const recentActivities = [
  {
    id: "activity-1",
    title: "New appointment booked",
    detail: "Ava Patel with Dr. James Wilson",
    time: "10 minutes ago",
    icon: "appointment",
  },
  {
    id: "activity-2",
    title: "Appointment cancelled",
    detail: "Mia Thompson · Pediatrics",
    time: "35 minutes ago",
    icon: "cancel",
  },
  {
    id: "activity-3",
    title: "Doctor schedule updated",
    detail: "Dr. Priya Shah · Cardiology",
    time: "1 hour ago",
    icon: "schedule",
  },
  {
    id: "activity-4",
    title: "Patient registered",
    detail: "Lucas Martin",
    time: "2 hours ago",
    icon: "patient",
  },
] as const;
