import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/slices/authSlice";

function HomePage({ dark, onToggleTheme }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-4xl py-6 sm:py-10 md:py-12">
        <div className="auth-card">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-2 muted-text">{`Logged in as ${user?.name || user?.email || "unknown user"}`}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onToggleTheme}
              className="ghost-btn w-full sm:w-auto"
            >
              Switch to {dark ? "Light" : "Dark"} Theme
            </button>
            <button
              type="button"
              onClick={() => dispatch(logout())}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default HomePage;
