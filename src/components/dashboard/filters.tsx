"use client";

interface FiltersProps {
  search: string;
  team: string;
  company: string;
  status: string;
  onSearchChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function Filters({
  search,
  team,
  company,
  status,
  onSearchChange,
  onTeamChange,
  onCompanyChange,
  onStatusChange,
}: FiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20 xl:flex-row xl:items-end xl:justify-between">
      <label className="flex-1 text-sm font-medium text-slate-600 dark:text-slate-300">
        <span className="mb-2 block">Ara</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Ad, soyad, lisans, şirket, ekip"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
        />
      </label>
      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
        <span className="mb-2 block">Ekip</span>
        <select
          value={team}
          onChange={(event) => onTeamChange(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
        >
          <option value="Tüm">Tüm Ekipler</option>
          <option value="Team 1">Team 1</option>
          <option value="Team 2">Team 2</option>
          <option value="Team 3">Team 3</option>
          <option value="Team 4">Team 4</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
        <span className="mb-2 block">Şirket</span>
        <select
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
        >
          <option value="Tümü">Tümü</option>
          <option value="OMAŞ">OMAŞ</option>
          <option value="UTEK">UTEK</option>
          <option value="TUA">TUA</option>
          <option value="GDH">GDH</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
        <span className="mb-2 block">Status</span>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
        >
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </label>
    </div>
  );
}
