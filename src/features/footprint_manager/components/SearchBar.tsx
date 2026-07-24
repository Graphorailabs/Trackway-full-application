import { Search, X } from "lucide-react";

type Props = {
  search: string;
  setSearch: (s: string) => void;
};

export default function SearchBar({ search, setSearch }: Props) {
  return (
    <div className="relative flex-1">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <Search className="h-4 w-4" />
      </div>
      <input
        placeholder="Search categories or footprints"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-10 pl-12 pr-10 rounded-full bg-slate-800 placeholder:text-slate-500 text-sm text-white"
      />
      {search && (
        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
