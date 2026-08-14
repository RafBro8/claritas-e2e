import { useState } from "react";
import { ChevronDown, CircleUserRound } from "lucide-react";
import { useUser } from "../../context/UserContext";
import type { UserRole } from "../../types";

const ROLES: Array<{ value: UserRole; description: string }> = [
  { value: "Product Owner", description: "Proposes and owns scenarios" },
  { value: "Business End User", description: "Proposes scenarios from the field" },
  { value: "Developer", description: "Reviews, approves and builds specs" },
];

export function IdentityMenu() {
  const { identity, setIdentity } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [draftName, setDraftName] = useState(identity.name);
  const [draftRole, setDraftRole] = useState(identity.role);

  function openMenu(): void {
    setDraftName(identity.name);
    setDraftRole(identity.role);
    setIsOpen(true);
  }

  function handleSave(): void {
    setIdentity({ name: draftName.trim(), role: draftRole });
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-800"
      >
        <CircleUserRound className="h-6 w-6 text-blue-400" aria-hidden="true" />
        <span className="flex flex-col items-start leading-tight">
          <span className="font-medium text-slate-100">{identity.name || "Set your name"}</span>
          <span className="text-xs text-slate-400">{identity.role}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl">
          <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400">YOUR IDENTITY</p>

          <label className="mb-3 block">
            <span className="mb-1 block text-sm text-slate-300">Name</span>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            />
          </label>

          <span className="mb-1 block text-sm text-slate-300">Role</span>
          <div className="mb-4 flex flex-col gap-2">
            {ROLES.map((role) => (
              <label
                key={role.value}
                className={`flex cursor-pointer flex-col rounded border px-3 py-2 text-sm ${
                  draftRole === role.value
                    ? "border-blue-500 bg-blue-950/40"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-slate-100">
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={draftRole === role.value}
                    onChange={() => setDraftRole(role.value)}
                  />
                  {role.value}
                </span>
                <span className="ml-5 text-xs text-slate-400">{role.description}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
