"use client";

interface FiltersProps {
  search: string;
  team: string;
  company: string;
  onSearchChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
}

export function Filters({
  search,
  team,
  company,
  onSearchChange,
  onTeamChange,
  onCompanyChange,
}: FiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-end xl:justify-between">
      <label className="flex-1 text-sm font-medium text-slate-600">
        <span className="mb-2 block">Ara</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Ad, soyad, lisans, şirket, ekip"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none ring-0 transition focus:border-slate-400"
        />
      </label>
      <label className="text-sm font-medium text-slate-600">
        <span className="mb-2 block">Ekip</span>
        <select
          value={team}
          onChange={(event) => onTeamChange(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
          <option value="Tüm">Tüm Ekipler</option>
          <option value="Team 1">Team 1</option>
          <option value="Team 2">Team 2</option>
          <option value="Team 3">Team 3</option>
          <option value="Team 4">Team 4</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-600">
        <span className="mb-2 block">Şirket</span>
        <select
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
          <option value="Tümü">Tümü</option>
          <option value="OMAŞ">OMAŞ</option>
          <option value="UTEK">UTEK</option>
          <option value="TUA">TUA</option>
          <option value="GDH">GDH</option>
        </select>
      </label>
    </div>
  );
}
