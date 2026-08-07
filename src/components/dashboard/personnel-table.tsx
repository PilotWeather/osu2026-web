"use client";

import { useMemo, useState } from "react";
import { ExpiryBadge } from "@/src/components/dashboard/expiry-badge";
import { Filters } from "@/src/components/dashboard/filters";
import { PersonnelDetail } from "@/src/components/dashboard/personnel-detail";
import { FlyingStatusBadge } from "@/src/components/dashboard/flying-status-badge";
import type { Personnel } from "@/src/types/personnel";

interface PersonnelTableProps {
  personnel: Personnel[];
}

function getCredential(person: Personnel, type: "SEP" | "SEP_FI" | "CLASS_1") {
  return person.credentials.find((credential) => credential.type === type)?.expiryDate ?? null;
}

export function PersonnelTable({ personnel }: PersonnelTableProps) {
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("Tüm");
  const [company, setCompany] = useState("Tümü");
  const [status, setStatus] = useState("All");
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);

  const filteredPersonnel = useMemo(() => {
    const term = search.toLocaleLowerCase("tr-TR");
    return personnel.filter((person) => {
      const matchesTeam = team === "Tüm" || person.team === team;
      const matchesCompany = company === "Tümü" || person.company === company;
      const matchesStatus = status === "All" || (status === "Active" ? person.isActiveFlying : !person.isActiveFlying);
      const haystack = [
        person.firstName,
        person.lastName,
        person.licenseNo,
        person.company,
        person.team,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      const matchesSearch = haystack.includes(term);
      return matchesTeam && matchesCompany && matchesStatus && matchesSearch;
    });
  }, [company, personnel, search, status, team]);

  return (
    <div className="space-y-4">
      <Filters
        search={search}
        team={team}
        company={company}
        status={status}
        onSearchChange={setSearch}
        onTeamChange={setTeam}
        onCompanyChange={setCompany}
        onStatusChange={setStatus}
      />

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 backdrop-blur dark:bg-slate-800/95 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Personel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Şirket</th>
                <th className="px-4 py-3">Ekip</th>
                <th className="px-4 py-3">Lisans No</th>
                <th className="px-4 py-3">SEP</th>
                <th className="px-4 py-3">SEP-FI</th>
                <th className="px-4 py-3">Class 1</th>
                <th className="px-4 py-3">Araç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {filteredPersonnel.map((person) => (
                <tr
                  key={person.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/60 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:odd:bg-slate-900 dark:even:bg-slate-800/25 dark:hover:bg-blue-400/10 dark:focus-visible:bg-blue-400/10 dark:focus-visible:ring-blue-400"
                  onClick={() => setSelectedPerson(person)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedPerson(person);
                    }
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                      <span aria-hidden="true" className={person.isActiveFlying ? "size-2 rounded-full bg-green-500 dark:bg-green-400" : "size-2 rounded-full bg-slate-400"} />
                      <span>{person.firstName} {person.lastName}</span>
                      <FlyingStatusBadge isActive={person.isActiveFlying} />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{person.email ?? "E-posta yok"}</div>
                  </td>
                  <td className="px-4 py-3"><FlyingStatusBadge isActive={person.isActiveFlying} /></td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{person.company ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{person.team ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{person.licenseNo ?? "-"}</td>
                  <td className="px-4 py-3"><ExpiryBadge expiryDate={getCredential(person, "SEP")} label="SEP" /></td>
                  <td className="px-4 py-3"><ExpiryBadge expiryDate={getCredential(person, "SEP_FI")} label="SEP-FI" /></td>
                  <td className="px-4 py-3"><ExpiryBadge expiryDate={getCredential(person, "CLASS_1")} label="Class 1" /></td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{person.vehiclePlate ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPerson ? <PersonnelDetail person={selectedPerson} onClose={() => setSelectedPerson(null)} /> : null}
    </div>
  );
}
