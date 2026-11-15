import type {
  DepartmentMetric,
  DoctorPerformance,
  DistributionPoint,
  ReportAnalyticsPeriod,
  ReportDateRange,
} from "@/types/reports";

export const reportDateRanges: { value: ReportDateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
];

const departmentNames = [
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "General Medicine",
  "ENT",
  "Gynecology",
];

const departmentColors = [
  "#087E8B",
  "#14283F",
  "#3F9C95",
  "#5F8FB4",
  "#8BB8AD",
  "#D3A54A",
  "#8E9BB0",
  "#C65B62",
];

function createDepartmentMetrics(counts: number[]): DepartmentMetric[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  return departmentNames.map((department, index) => ({
    department,
    appointments: counts[index],
    percentage: Number(((counts[index] / total) * 100).toFixed(1)),
    color: departmentColors[index],
  }));
}

export const reportAnalytics: Record<ReportDateRange, ReportAnalyticsPeriod> = {
  "7d": {
    appointments: [
      { label: "Mon", total: 168, completed: 146, pending: 14, cancelled: 8 },
      { label: "Tue", total: 180, completed: 159, pending: 14, cancelled: 7 },
      { label: "Wed", total: 172, completed: 150, pending: 13, cancelled: 9 },
      { label: "Thu", total: 192, completed: 169, pending: 15, cancelled: 8 },
      { label: "Fri", total: 204, completed: 180, pending: 15, cancelled: 9 },
      { label: "Sat", total: 199, completed: 171, pending: 18, cancelled: 10 },
      { label: "Sun", total: 169, completed: 145, pending: 16, cancelled: 8 },
    ],
    patientTrends: [
      { label: "Mon", newPatients: 18, existingPatients: 246 },
      { label: "Tue", newPatients: 21, existingPatients: 259 },
      { label: "Wed", newPatients: 17, existingPatients: 238 },
      { label: "Thu", newPatients: 24, existingPatients: 271 },
      { label: "Fri", newPatients: 26, existingPatients: 286 },
      { label: "Sat", newPatients: 19, existingPatients: 258 },
      { label: "Sun", newPatients: 15, existingPatients: 221 },
    ],
    departments: createDepartmentMetrics([60, 40, 45, 38, 30, 54, 21, 24]),
    aiCalls: [
      { label: "Mon", calls: 172, successful: 149, missed: 7, bookings: 54 },
      { label: "Tue", calls: 186, successful: 161, missed: 5, bookings: 58 },
      { label: "Wed", calls: 164, successful: 143, missed: 6, bookings: 48 },
      { label: "Thu", calls: 193, successful: 167, missed: 8, bookings: 61 },
      { label: "Fri", calls: 205, successful: 178, missed: 7, bookings: 66 },
      { label: "Sat", calls: 178, successful: 151, missed: 5, bookings: 53 },
      { label: "Sun", calls: 150, successful: 133, missed: 4, bookings: 46 },
    ],
    aiOutcomes: [
      { name: "Appointment booked", value: 386, color: "#087E8B" },
      { name: "General enquiry", value: 492, color: "#14283F" },
      { name: "Call transferred", value: 214, color: "#D3A54A" },
      { name: "Unresolved query", value: 156, color: "#C65B62" },
    ],
  },
  "30d": {
    appointments: [
      { label: "Oct 19", total: 320, completed: 278, pending: 28, cancelled: 14 },
      { label: "Oct 26", total: 331, completed: 289, pending: 27, cancelled: 15 },
      { label: "Nov 2", total: 308, completed: 267, pending: 28, cancelled: 13 },
      { label: "Nov 9", total: 325, completed: 280, pending: 30, cancelled: 15 },
    ],
    patientTrends: [
      { label: "Oct 19", newPatients: 84, existingPatients: 962 },
      { label: "Oct 26", newPatients: 91, existingPatients: 1004 },
      { label: "Nov 2", newPatients: 78, existingPatients: 946 },
      { label: "Nov 9", newPatients: 102, existingPatients: 1031 },
    ],
    departments: createDepartmentMetrics([248, 160, 174, 166, 126, 220, 92, 98]),
    aiCalls: [
      { label: "Oct 19", calls: 612, successful: 534, missed: 25, bookings: 188 },
      { label: "Oct 26", calls: 658, successful: 574, missed: 22, bookings: 204 },
      { label: "Nov 2", calls: 702, successful: 611, missed: 24, bookings: 218 },
      { label: "Nov 9", calls: 744, successful: 648, missed: 23, bookings: 231 },
    ],
    aiOutcomes: [
      { name: "Appointment booked", value: 1482, color: "#087E8B" },
      { name: "General enquiry", value: 1894, color: "#14283F" },
      { name: "Call transferred", value: 826, color: "#D3A54A" },
      { name: "Unresolved query", value: 594, color: "#C65B62" },
    ],
  },
  "90d": {
    appointments: [
      { label: "Aug 24", total: 412, completed: 358, pending: 34, cancelled: 20 },
      { label: "Sep 7", total: 438, completed: 381, pending: 36, cancelled: 21 },
      { label: "Sep 21", total: 456, completed: 397, pending: 38, cancelled: 21 },
      { label: "Oct 5", total: 472, completed: 409, pending: 40, cancelled: 23 },
      { label: "Oct 19", total: 486, completed: 421, pending: 41, cancelled: 24 },
      { label: "Nov 2", total: 508, completed: 440, pending: 43, cancelled: 25 },
      { label: "Nov 9", total: 521, completed: 451, pending: 44, cancelled: 26 },
    ],
    patientTrends: [
      { label: "Aug", newPatients: 292, existingPatients: 2884 },
      { label: "Sep", newPatients: 318, existingPatients: 3012 },
      { label: "Oct", newPatients: 341, existingPatients: 3128 },
      { label: "Nov", newPatients: 236, existingPatients: 2127 },
    ],
    departments: createDepartmentMetrics([690, 450, 485, 464, 350, 620, 255, 286]),
    aiCalls: [
      { label: "Aug 24", calls: 1684, successful: 1463, missed: 76, bookings: 526 },
      { label: "Sep 7", calls: 1772, successful: 1546, missed: 69, bookings: 553 },
      { label: "Sep 21", calls: 1856, successful: 1618, missed: 64, bookings: 579 },
      { label: "Oct 5", calls: 1924, successful: 1677, missed: 59, bookings: 598 },
      { label: "Oct 19", calls: 1986, successful: 1731, missed: 54, bookings: 619 },
      { label: "Nov 2", calls: 2072, successful: 1805, missed: 48, bookings: 646 },
    ],
    aiOutcomes: [
      { name: "Appointment booked", value: 5668, color: "#087E8B" },
      { name: "General enquiry", value: 7234, color: "#14283F" },
      { name: "Call transferred", value: 3148, color: "#D3A54A" },
      { name: "Unresolved query", value: 2190, color: "#C65B62" },
    ],
  },
  year: {
    appointments: [
      { label: "Jan", total: 1024, completed: 886, pending: 88, cancelled: 50 },
      { label: "Feb", total: 1058, completed: 914, pending: 92, cancelled: 52 },
      { label: "Mar", total: 1112, completed: 960, pending: 96, cancelled: 56 },
      { label: "Apr", total: 1084, completed: 938, pending: 92, cancelled: 54 },
      { label: "May", total: 1152, completed: 996, pending: 98, cancelled: 58 },
      { label: "Jun", total: 1198, completed: 1034, pending: 102, cancelled: 62 },
      { label: "Jul", total: 1236, completed: 1068, pending: 104, cancelled: 64 },
      { label: "Aug", total: 1264, completed: 1090, pending: 108, cancelled: 66 },
      { label: "Sep", total: 1298, completed: 1118, pending: 110, cancelled: 70 },
      { label: "Oct", total: 1326, completed: 1142, pending: 112, cancelled: 72 },
      { label: "Nov", total: 1284, completed: 1108, pending: 108, cancelled: 68 },
    ],
    patientTrends: [
      { label: "Jan", newPatients: 112, existingPatients: 2840 },
      { label: "Feb", newPatients: 126, existingPatients: 2918 },
      { label: "Mar", newPatients: 138, existingPatients: 3042 },
      { label: "Apr", newPatients: 129, existingPatients: 2986 },
      { label: "May", newPatients: 144, existingPatients: 3135 },
      { label: "Jun", newPatients: 158, existingPatients: 3254 },
      { label: "Jul", newPatients: 166, existingPatients: 3378 },
      { label: "Aug", newPatients: 173, existingPatients: 3452 },
      { label: "Sep", newPatients: 182, existingPatients: 3540 },
      { label: "Oct", newPatients: 195, existingPatients: 3627 },
      { label: "Nov", newPatients: 176, existingPatients: 3510 },
    ],
    departments: createDepartmentMetrics([2700, 1750, 1900, 1810, 1380, 2410, 990, 1060]),
    aiCalls: [
      { label: "Jan", calls: 4140, successful: 3590, missed: 188, bookings: 1280 },
      { label: "Feb", calls: 4280, successful: 3715, missed: 176, bookings: 1325 },
      { label: "Mar", calls: 4510, successful: 3910, missed: 170, bookings: 1397 },
      { label: "Apr", calls: 4395, successful: 3814, missed: 165, bookings: 1361 },
      { label: "May", calls: 4670, successful: 4058, missed: 158, bookings: 1450 },
      { label: "Jun", calls: 4860, successful: 4225, missed: 148, bookings: 1508 },
      { label: "Jul", calls: 5015, successful: 4368, missed: 140, bookings: 1556 },
      { label: "Aug", calls: 5120, successful: 4462, missed: 136, bookings: 1589 },
      { label: "Sep", calls: 5260, successful: 4584, missed: 129, bookings: 1632 },
      { label: "Oct", calls: 5385, successful: 4692, missed: 125, bookings: 1671 },
      { label: "Nov", calls: 5210, successful: 4540, missed: 120, bookings: 1617 },
    ],
    aiOutcomes: [
      { name: "Appointment booked", value: 18374, color: "#087E8B" },
      { name: "General enquiry", value: 23916, color: "#14283F" },
      { name: "Call transferred", value: 10372, color: "#D3A54A" },
      { name: "Unresolved query", value: 7246, color: "#C65B62" },
    ],
  },
};

export const genderDistribution: DistributionPoint[] = [
  { name: "Female", value: 1318, color: "#087E8B" },
  { name: "Male", value: 1106, color: "#5F8FB4" },
  { name: "Other", value: 26, color: "#D3A54A" },
];

export const ageDistribution: DistributionPoint[] = [
  { name: "Under 18", value: 244, color: "#087E8B" },
  { name: "18–29", value: 514, color: "#3F9C95" },
  { name: "30–44", value: 686, color: "#5F8FB4" },
  { name: "45–59", value: 588, color: "#D3A54A" },
  { name: "60+", value: 418, color: "#8E9BB0" },
];

export const doctorPerformance: DoctorPerformance[] = [
  {
    id: "DOC-101",
    name: "Dr. Maya Rao",
    department: "Cardiology",
    totalAppointments: 142,
    completed: 134,
    cancelled: 5,
    completionRate: 94.4,
  },
  {
    id: "DOC-102",
    name: "Dr. Ethan Chen",
    department: "Neurology",
    totalAppointments: 128,
    completed: 119,
    cancelled: 6,
    completionRate: 93.0,
  },
  {
    id: "DOC-103",
    name: "Dr. Sofia Martinez",
    department: "Pediatrics",
    totalAppointments: 136,
    completed: 126,
    cancelled: 7,
    completionRate: 92.6,
  },
  {
    id: "DOC-104",
    name: "Dr. Arjun Mehta",
    department: "Orthopedics",
    totalAppointments: 119,
    completed: 109,
    cancelled: 6,
    completionRate: 91.6,
  },
  {
    id: "DOC-105",
    name: "Dr. Priya Nair",
    department: "Dermatology",
    totalAppointments: 111,
    completed: 104,
    cancelled: 4,
    completionRate: 93.7,
  },
  {
    id: "DOC-106",
    name: "Dr. Noah Williams",
    department: "General Medicine",
    totalAppointments: 158,
    completed: 146,
    cancelled: 8,
    completionRate: 92.4,
  },
  {
    id: "DOC-107",
    name: "Dr. Aisha Patel",
    department: "ENT",
    totalAppointments: 97,
    completed: 89,
    cancelled: 5,
    completionRate: 91.8,
  },
  {
    id: "DOC-108",
    name: "Dr. Lucas Bennett",
    department: "Gynecology",
    totalAppointments: 124,
    completed: 116,
    cancelled: 5,
    completionRate: 93.5,
  },
];
