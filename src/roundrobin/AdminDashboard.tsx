import { useState } from "react";
import type { RRData } from "./store";
import {
  groupMembers,
  groupNumbers,
  groupPairs,
  isValidEmail,
  normalizeEmail,
  participantProgress,
  signIn,
  toggleMeeting,
  ADMIN_EMAIL,
} from "./store";

// Researcher-only round-robin dashboard (open by signing in as admin@admin).
// Shows every group, who has met whom, and who is still left to meet — and
// lets the researcher mark a pair as met (or undo a mistaken click). Rules for
// the data: it contains participant emails, so this screen is for lab staff
// only; the store file lives in the app-data folder on this machine.
interface AdminDashboardProps {
  data: RRData;
  onChange: (data: RRData) => void;
  onExit: () => void;
}

export default function AdminDashboard({ data, onChange, onExit }: AdminDashboardProps) {
  const [newEmail, setNewEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const groups = groupNumbers(data);

  const handleAdd = () => {
    const email = normalizeEmail(newEmail);
    if (!isValidEmail(email) || email === ADMIN_EMAIL) {
      setAddError("Please enter a valid participant email.");
      return;
    }
    setAddError(null);
    const result = signIn(data, email);
    if (!result.isNew) {
      setAddError(`${email} is already registered (Group ${result.participant.group}).`);
      return;
    }
    onChange(result.data);
    setNewEmail("");
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

  return (
    <div className="min-h-full w-full bg-black cursor-auto pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 w-full bg-black border-b border-white px-8 py-4 flex items-center justify-between">
        <h1 className="text-white text-2xl font-bold">Round-Robin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-white text-sm">
            {data.participants.length} participant{data.participants.length === 1 ? "" : "s"} ·{" "}
            {groups.length} group{groups.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2 border border-white text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        {/* Add participant */}
        <div className="bg-black border p-6">
          <h2 className="text-white text-xl font-bold mb-4">Add a participant</h2>
          <div className="flex space-x-2 max-w-xl">
            <input
              autoComplete="off"
              type="text"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="participant@wisc.edu"
              className="flex-1 p-3 text-white bg-gray-800 border border-white rounded-lg focus:outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-semibold"
            >
              Add
            </button>
          </div>
          {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
          <p className="text-gray-400 text-sm mt-3">
            Participants normally add themselves by signing in with their email on this
            screen's check-in page. New emails are placed into a random group with an open
            seat (groups of {data.groupSize}).
          </p>
        </div>

        {groups.length === 0 && (
          <p className="text-white text-xl text-center py-16">
            No participants yet. They will appear here after checking in with their email.
          </p>
        )}

        {/* One card per group */}
        {groups.map((group) => {
          const members = groupMembers(data, group);
          const pairs = groupPairs(data, group);
          const met = pairs.filter((p) => p.metAt).length;
          return (
            <div key={group} className="bg-black border p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-white text-xl font-bold">Group {group}</h2>
                <span className="text-white text-sm">
                  {met} of {pairs.length} meetings done
                  {members.length < data.groupSize &&
                    ` · ${data.groupSize - members.length} seat${
                      data.groupSize - members.length === 1 ? "" : "s"
                    } open`}
                </span>
              </div>

              {/* Members and their individual progress */}
              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr>
                    <th className="text-white text-left p-2 border-b border-white">Member</th>
                    <th className="text-white text-left p-2 border-b border-white">Joined</th>
                    <th className="text-white text-left p-2 border-b border-white">Progress</th>
                    <th className="text-white text-left p-2 border-b border-white">Still to meet</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const prog = participantProgress(data, m.email);
                    return (
                      <tr key={m.email} className="border-b border-gray-600">
                        <td className="text-white p-2">{m.email}</td>
                        <td className="text-white p-2">{fmtDate(m.joinedAt)}</td>
                        <td className="text-white p-2">
                          {prog.met}/{prog.total} met
                        </td>
                        <td className="text-white p-2">
                          {prog.remaining.length === 0 ? (
                            <span className="text-green-400">done</span>
                          ) : (
                            prog.remaining.join(", ")
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pair checklist: click to mark met / undo */}
              <h3 className="text-white text-lg font-bold mb-2">Meetings</h3>
              <div className="space-y-1">
                {pairs.length === 0 && (
                  <p className="text-gray-400 text-sm">
                    Pairs appear when the group has at least two members.
                  </p>
                )}
                {pairs.map((pair) => (
                  <div
                    key={`${pair.a}|${pair.b}`}
                    className="flex items-center justify-between border-b border-gray-800 py-1.5"
                  >
                    <span className="text-white">
                      {pair.a} <span className="text-gray-500">↔</span> {pair.b}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChange(toggleMeeting(data, pair.a, pair.b))}
                      title={pair.metAt ? "Click to undo (marks the pair as not met)" : "Mark this pair as met"}
                      className={`px-4 py-1.5 rounded-lg border transition-colors text-sm ${
                        pair.metAt
                          ? "bg-white text-black border-white hover:bg-gray-200"
                          : "bg-gray-800 text-white border-white hover:bg-gray-700"
                      }`}
                    >
                      {pair.metAt ? `met ${fmtDate(pair.metAt)}` : "mark met"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
