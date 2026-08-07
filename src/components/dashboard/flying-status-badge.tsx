interface FlyingStatusBadgeProps {
  isActive: boolean;
  detailed?: boolean;
}

export function FlyingStatusBadge({ isActive, detailed = false }: FlyingStatusBadgeProps) {
  return (
    <span
      className={isActive
        ? "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200 dark:bg-green-400/10 dark:text-green-400 dark:ring-green-400/25"
        : "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-600"}
    >
      <span aria-hidden="true" className={isActive ? "size-1.5 rounded-full bg-green-500 dark:bg-green-400" : "size-1.5 rounded-full bg-slate-400 dark:bg-slate-400"} />
      {isActive ? (detailed ? "Active Flying" : "Active") : "Inactive"}
    </span>
  );
}
