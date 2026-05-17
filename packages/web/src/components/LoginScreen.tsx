import { useState } from "react";

interface Props {
  onLogin: (token: string) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [token, setToken] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;
    onLogin(trimmed);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 w-full max-w-sm p-8 bg-gray-900 rounded-2xl shadow-xl"
      >
        <h1 className="text-xl font-semibold text-white">Connect to relay</h1>
        <input
          type="password"
          placeholder="Auth token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
          className="px-4 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!token.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Connect
        </button>
      </form>
    </div>
  );
}
