import {
  CalendarCheck,
  CalendarX,
  UserPlus,
  UsersRound,
} from "lucide-react";

const activityIcons = {
  appointment: CalendarCheck,
  cancel: CalendarX,
  schedule: UsersRound,
  patient: UserPlus,
};

type Activity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: keyof typeof activityIcons;
};

export function RecentActivities({
  activities,
}: {
  activities: Activity[];
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text">Recent activity</h3>
        <p className="mt-1 text-xs text-muted">
          Latest updates across your hospital
        </p>
      </div>
      <ul className="space-y-4">
        {activities.length === 0 && (
          <li className="text-sm text-muted">No recent activity.</li>
        )}
        {activities.map((activity) => {
          const Icon = activityIcons[activity.icon];

          return (
            <li className="flex gap-3" key={activity.id}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-secondary">
                <Icon aria-hidden="true" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{activity.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {activity.detail}
                </p>
                <p className="mt-1 text-[11px] text-muted">{activity.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
